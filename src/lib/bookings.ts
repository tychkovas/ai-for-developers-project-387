// Единый модуль данных календаря — имитация сервера (ADR-0001, спека раздел 8).
// Операции и машиночитаемые коды ошибок зеркалят утверждённый API-контракт
// (spec/main.tsp: getEventTypes, createEventType, createBooking; not_found /
// id_taken / slot_taken). Все записи идут через create*-операции с валидацией —
// конфликты слотов проверяются здесь, «на бэкенде», а не в UI. Когда появится
// живой бэкенд по этому контракту (ADR-0002), модуль заменяется на SDK.
// UI не трогает localStorage напрямую — только через этот модуль и тонкий хук.

const EVENT_TYPES_KEY = 'call-scheduling:event-types';
const BOOKINGS_KEY = 'call-scheduling:bookings';

/** Тип события — зеркало контрактного EventType; id = слаг маршрута /book/:slug. */
export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

/** Запись — зеркало контрактного Booking; start/end — локальное время в ISO. */
export interface Booking {
  id: string;
  eventTypeId: string;
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
}

/** Тело создания типа события — зеркало контрактного CreateEventType. */
export interface CreateEventTypeInput {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

/** Тело создания записи — зеркало контрактного CreateBooking; end вычисляет «сервер». */
export interface CreateBookingInput {
  eventTypeId: string;
  start: string;
  guestName: string;
  guestEmail: string;
}

export type CreateEventTypeResult =
  | { ok: true; eventType: EventType }
  | { ok: false; error: 'id_taken' };

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: 'not_found' | 'slot_taken' };

function readList<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw === null ? [] : (JSON.parse(raw) as T[]);
}

function writeList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

/** Каталог типов события (контракт: порядок — по возрастанию длительности). */
export function getEventTypes(): EventType[] {
  return readList<EventType>(EVENT_TYPES_KEY).sort(
    (a, b) => a.durationMinutes - b.durationMinutes,
  );
}

export function getBookings(): Booking[] {
  return readList<Booking>(BOOKINGS_KEY);
}

/** Создание типа события владельцем; дубль id отклоняется как «конфликт». */
export function createEventType(input: CreateEventTypeInput): CreateEventTypeResult {
  if (getEventTypes().some((eventType) => eventType.id === input.id)) {
    return { ok: false, error: 'id_taken' };
  }
  const eventType: EventType = { ...input };
  writeList<EventType>(EVENT_TYPES_KEY, [...getEventTypes(), eventType]);
  return { ok: true, eventType };
}

/**
 * Создание записи на выбранный слот: неизвестный тип события — not_found;
 * прошедший слот или пересечение с любой существующей записью (в том числе
 * другого типа события, спека раздел 3) — slot_taken; касание границ разрешено.
 */
export function createBooking(
  input: CreateBookingInput,
  now: Date = new Date(),
): CreateBookingResult {
  const eventType = getEventTypes().find((type) => type.id === input.eventTypeId);
  if (!eventType) {
    return { ok: false, error: 'not_found' };
  }
  const start = new Date(input.start);
  if (start.getTime() <= now.getTime()) {
    return { ok: false, error: 'slot_taken' };
  }
  const end = new Date(start.getTime() + eventType.durationMinutes * 60_000);
  const hasOverlap = getBookings().some(
    (booking) =>
      start.getTime() < new Date(booking.end).getTime() &&
      end.getTime() > new Date(booking.start).getTime(),
  );
  if (hasOverlap) {
    return { ok: false, error: 'slot_taken' };
  }
  const booking: Booking = {
    id: crypto.randomUUID(),
    eventTypeId: input.eventTypeId,
    start: start.toISOString(),
    end: end.toISOString(),
    guestName: input.guestName,
    guestEmail: input.guestEmail,
  };
  writeList<Booking>(BOOKINGS_KEY, [...getBookings(), booking]);
  return { ok: true, booking };
}

/** Ближайший Пн–Пт строго после from (полночь, локальное время). */
function nextWeekday(from: Date): Date {
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  do {
    day.setDate(day.getDate() + 1);
  } while (day.getDay() === 0 || day.getDay() === 6);
  return day;
}

function at(day: Date, hours: number, minutes: number): Date {
  const time = new Date(day);
  time.setHours(hours, minutes, 0, 0);
  return time;
}

/** Данные гостя demo-seed — единый источник для всех трёх записей. */
const DEMO_GUEST = { guestName: 'Demo User', guestEmail: 'demo@example.com' } as const;

/** Демо-seed при первом запуске (пустой localStorage): не перезаписывает данные. */
export function ensureSeed(now: Date = new Date()): void {
  if (
    localStorage.getItem(EVENT_TYPES_KEY) !== null ||
    localStorage.getItem(BOOKINGS_KEY) !== null
  ) {
    return;
  }
  writeList<EventType>(EVENT_TYPES_KEY, [
    {
      id: '15-min',
      name: 'Встреча 15 минут',
      description: 'Короткий созвон на 15 минут',
      durationMinutes: 15,
    },
    {
      id: '30-min',
      name: 'Встреча 30 минут',
      description: 'Созвон на 30 минут, когда 15 мало',
      durationMinutes: 30,
    },
  ]);
  const firstDay = nextWeekday(now);
  const secondDay = nextWeekday(firstDay);
  writeList<Booking>(BOOKINGS_KEY, [
    {
      id: 'demo-1',
      eventTypeId: '15-min',
      start: at(firstDay, 11, 0).toISOString(),
      end: at(firstDay, 11, 15).toISOString(),
      ...DEMO_GUEST,
    },
    {
      id: 'demo-2',
      eventTypeId: '30-min',
      start: at(firstDay, 15, 0).toISOString(),
      end: at(firstDay, 15, 30).toISOString(),
      ...DEMO_GUEST,
    },
    {
      id: 'demo-3',
      eventTypeId: '15-min',
      start: at(secondDay, 10, 30).toISOString(),
      end: at(secondDay, 10, 45).toISOString(),
      ...DEMO_GUEST,
    },
  ]);
}
