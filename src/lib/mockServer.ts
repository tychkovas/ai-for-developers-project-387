// Мок-сервер: связывает сгенерированный SDK с модулем данных (ADR-0002 —
// живого бэкенда нет). Перехватывает глобальный fetch на старте приложения,
// ловит вызовы SDK и маршрутизирует их в bookings.ts, отвечая по утверждённому
// контракту (spec/main.tsp): пути операций, статусы 200/400/404/409,
// тело ошибки { code, message } на русском. UI ходит в данные только через
// SDK — смена мок-сервера на живой бэкенд не требует правок компонентов.
import { client } from '../api/client.gen';
import type { ErrorCode } from '../api/types.gen';
import {
  cancelBooking,
  createBooking,
  createEventType,
  ensureSeed,
  getAvailableSlots,
  getBookings,
  getEventTypes,
} from './bookings';

// Абсолютный origin: SDK собирает Request, а в Node (тесты) Request не
// принимает относительные URL. Сетевого обмена нет — ответы отдаёт перехватчик.
const MOCK_ORIGIN = 'http://call-scheduling.local';

const GENERIC_ERROR_MESSAGE: Record<ErrorCode, string> = {
  not_found: 'Ресурс не найден',
  validation_failed: 'Некорректные данные запроса',
  id_taken: 'Тип события с таким id уже существует',
  slot_taken: 'Слот занят другой записью или уже прошёл',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: ErrorCode, status: number, message?: string): Response {
  return json({ code, message: message ?? GENERIC_ERROR_MESSAGE[code] }, status);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

/** Строковое поле тела запроса: trim, не-строка → пустая строка. */
function str(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

const EVENT_TYPE_ID_PATTERN = /^[A-Za-z0-9-]+$/;

async function handleBookingPost(request: Request): Promise<Response> {
  const body = await readJson(request);
  const eventTypeId = str(body, 'eventTypeId');
  const start = str(body, 'start');
  const guestName = str(body, 'guestName');
  const guestEmail = str(body, 'guestEmail');
  if (!eventTypeId || Number.isNaN(new Date(start).getTime())) {
    return errorResponse('validation_failed', 400, 'Некорректные данные запроса');
  }
  if (!guestName) {
    return errorResponse('validation_failed', 400, 'Введите имя');
  }
  if (!/^\S+@\S+\.\S+$/.test(guestEmail)) {
    return errorResponse('validation_failed', 400, 'Введите корректный email');
  }
  const result = createBooking({ eventTypeId, start, guestName, guestEmail });
  if (!result.ok) {
    return result.error === 'not_found'
      ? errorResponse('not_found', 404, 'Тип события не найден')
      : errorResponse('slot_taken', 409);
  }
  return json(result.booking);
}

async function handleEventTypePost(request: Request): Promise<Response> {
  const body = await readJson(request);
  const id = str(body, 'id');
  const name = str(body, 'name');
  const description = str(body, 'description');
  const durationMinutes = body.durationMinutes;
  if (!EVENT_TYPE_ID_PATTERN.test(id)) {
    return errorResponse('validation_failed', 400, 'id: латиница, цифры, дефис');
  }
  if (
    !name ||
    !description ||
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return errorResponse(
      'validation_failed',
      400,
      'Проверьте название, описание и длительность',
    );
  }
  const result = createEventType({ id, name, description, durationMinutes });
  if (!result.ok) {
    return errorResponse('id_taken', 409);
  }
  return json(result.eventType);
}

async function handleRequest(request: Request, passThrough: (request: Request) => Promise<Response>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Демо-данные поднимаются при каждом запросе: guard в ensureSeed делает вызов
  // идемпотентным (в тестах localStorage чистится между тестами).
  ensureSeed();

  if (method === 'GET' && path === '/event-types') {
    return json(getEventTypes());
  }

  if (method === 'POST' && path === '/event-types') {
    return handleEventTypePost(request);
  }

  // Свободные слоты выбранного дня: GET /event-types/{id}/slots?date=YYYY-MM-DD.
  // Валидный id + нерабочий день за пределами окна — 200 и пустой список.
  if (method === 'GET' && path.endsWith('/slots')) {
    const id = decodeURIComponent(
      path.slice('/event-types/'.length, path.length - '/slots'.length),
    );
    const slots = getAvailableSlots(id, url.searchParams.get('date') ?? '');
    return slots === null
      ? errorResponse('not_found', 404, 'Тип события не найден')
      : json(slots);
  }

  if (method === 'GET' && path.startsWith('/event-types/')) {
    const id = decodeURIComponent(path.slice('/event-types/'.length));
    const eventType = getEventTypes().find((type) => type.id === id);
    return eventType ? json(eventType) : errorResponse('not_found', 404, 'Тип события не найден');
  }

  if (method === 'GET' && path === '/bookings') {
    const bookings =
      url.searchParams.get('upcoming') === 'true'
        ? getBookings().filter((booking) => new Date(booking.end).getTime() > Date.now())
        : getBookings();
    return json(bookings);
  }

  if (method === 'POST' && path === '/bookings') {
    return handleBookingPost(request);
  }

  // Отмена записи: полное удаление, слот мгновенно освобождается
  // (тикет #23, контракт cancelBooking: 204 / 404 not_found).
  if (method === 'DELETE' && path.startsWith('/bookings/')) {
    const id = decodeURIComponent(path.slice('/bookings/'.length));
    const result = cancelBooking(id);
    return result.ok
      ? new Response(null, { status: 204 })
      : errorResponse('not_found', 404, 'Запись не найдена');
  }

  // Остальные запросы (статика) — наружу,
  // мок-сервер их не притворяется.
  return passThrough(request);
}

/**
 * Ставит перехватчик fetch и baseUrl для SDK, поднимает demo-seed первого
 * запуска (спека, раздел 7 — «при первом запуске»). Идемпотентно: повторный
 * вызов — no-op. Вызывается на старте приложения (main.tsx) и в тестовом setup.
 */
export function installMockServer(): void {
  const currentFetch = globalThis.fetch.bind(globalThis);
  const currentFetchTagged = currentFetch as typeof fetch & { __mockServer?: boolean };
  if (currentFetchTagged.__mockServer) {
    return;
  }
  client.setConfig({ baseUrl: MOCK_ORIGIN });
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    return handleRequest(request, (next) => currentFetch(next as RequestInfo));
  }) as typeof fetch & { __mockServer?: boolean };
  mockFetch.__mockServer = true;
  globalThis.fetch = mockFetch;
  ensureSeed();
}
