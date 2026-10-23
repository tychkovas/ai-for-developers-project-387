// Единый модуль данных календаря — домен мок-сервера (ADR-0001, спека раздел 8).
// Типы зеркалят утверждённый API-контракт (spec/main.tsp) — берутся напрямую
// из сгенерированных типов SDK. Операции и машиночитаемые коды ошибок
// (not_found / id_taken / slot_taken) повторяют контрактные; HTTP-статусы
// выставляет адаптер src/lib/mockServer.ts, который перехватывает запросы
// сгенерированного SDK (ADR-0002 — живого бэкенда нет). Конфликты слотов
// и генерация свободных слотов (окно 14 дней, рабочие часы, сетка 15 минут) —
// здесь, «на бэкенде», — не в UI. Хранение — localStorage.

import type { Booking, CreateBooking, CreateEventType, EventType, Slot } from '../api/types.gen';

const EVENT_TYPES_KEY = 'call-scheduling:event-types';
const BOOKINGS_KEY = 'call-scheduling:bookings';

/** Рабочие часы владельца: Пн–Пт 10:00–19:00 (спека, раздел 3; зашиты в код). */
const WORK_DAY_START_HOUR = 10;
const WORK_DAY_END_HOUR = 19;
/** Невидимая сетка слотов: тип события D минут занимает ⌈D/15⌉ соседних ячеек. */
const SLOT_GRID_MINUTES = 15;
/** Окно записи: слоты формируются на 14 дней вперёд от текущей даты. */
const BOOKING_WINDOW_DAYS = 14;
/** Минимальное упреждение: слоты, начинающиеся ближе часа, гостю не предлагаются. */
const MIN_LEAD_TIME_MS = 60 * 60 * 1000;

export type CreateEventTypeResult =
  | { ok: true; eventType: EventType }
  | { ok: false; error: 'id_taken' };

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: 'not_found' | 'slot_taken' };

export type CancelBookingResult = { ok: true } | { ok: false; error: 'not_found' };

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

/**
 * Записи (контракт listBookings: порядок — по возрастанию начала).
 * Пересечения в createBooking проверяются независимо от порядка.
 */
export function getBookings(): Booking[] {
  return readList<Booking>(BOOKINGS_KEY).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

/** Создание типа события владельцем; дубль id отклоняется как «конфликт». */
export function createEventType(input: CreateEventType): CreateEventTypeResult {
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
  input: CreateBooking,
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

/**
 * Отмена записи владельцем календаря: полное удаление, слот мгновенно
 * освобождается (контракт cancelBooking, спека раздел 6.6). Неизвестный
 * id — not_found; список не меняется.
 */
export function cancelBooking(id: string): CancelBookingResult {
  const bookings = getBookings();
  if (!bookings.some((booking) => booking.id === id)) {
    return { ok: false, error: 'not_found' };
  }
  writeList(BOOKINGS_KEY, bookings.filter((booking) => booking.id !== id));
  return { ok: true };
}

// ——— Генерация свободных слотов (тикет #21, спека разделы 3 и 6.3) ———

/** Локальный ключ даты 'YYYY-MM-DD'. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Разбор ключа 'YYYY-MM-DD' в локальную полночь; некорректный ключ — null. */
function parseDateKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== key) {
    return null;
  }
  return date;
}

/** Рабочий день (Пн–Пт)? Выходные слоты не предлагаются (спека, раздел 3). */
function isWeekday(day: Date): boolean {
  return day.getDay() !== 0 && day.getDay() !== 6;
}

/** Выходной день по ключу даты — календарь блокирует такие дни (спека, 6.3). */
export function isWeekendDay(dateKey: string): boolean {
  const day = parseDateKey(dateKey);
  return day !== null && !isWeekday(day);
}

/**
 * Окно записи: 14 локальных ключей дат, начиная с текущего дня
 * (спека, раздел 3: «окно записи — 14 дней, начиная с текущей даты»).
 */
export function bookingWindowDays(now: Date = new Date()): string[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    return toDateKey(day);
  });
}

/**
 * Свободные слоты выбранного дня для типа события (контракт getAvailableSlots):
 * только рабочие дни в 14-дневном окне, старты по сетке 15 минут в пределах
 * рабочих часов, не ближе часа от текущего момента и не пересекающиеся с
 * любыми записями — включая записи других типов события (спека, раздел 3).
 * null — тип события не найден (мок-сервер ответит 404 not_found).
 */
export function getAvailableSlots(
  eventTypeId: string,
  dateKey: string,
  now: Date = new Date(),
): Slot[] | null {
  const eventType = getEventTypes().find((type) => type.id === eventTypeId);
  if (!eventType) {
    return null;
  }
  const day = parseDateKey(dateKey);
  if (day === null || !isWeekday(day) || !bookingWindowDays(now).includes(dateKey)) {
    return [];
  }
  const stepMs = SLOT_GRID_MINUTES * 60_000;
  const durationMs = eventType.durationMinutes * 60_000;
  // ⌈D/15⌉ ячеек сетки: последний допустимый старт — конец рабочих часов минус занятое.
  const lastStart =
    at(day, WORK_DAY_END_HOUR, 0).getTime() -
    Math.ceil(eventType.durationMinutes / SLOT_GRID_MINUTES) * stepMs;
  const bookings = getBookings();
  const slots: Slot[] = [];
  for (
    let start = at(day, WORK_DAY_START_HOUR, 0).getTime();
    start <= lastStart;
    start += stepMs
  ) {
    if (start - now.getTime() < MIN_LEAD_TIME_MS) {
      continue;
    }
    const end = start + durationMs;
    const busy = bookings.some(
      (booking) =>
        start < new Date(booking.end).getTime() &&
        end > new Date(booking.start).getTime(),
    );
    if (!busy) {
      slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return slots;
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
