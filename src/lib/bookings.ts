// Единый модуль данных календаря (ADR-0001, спека раздел 8):
// сущности «тип события» и «запись», загрузка/сохранение в localStorage
// и демо-seed первого запуска. UI не трогает localStorage напрямую —
// только через этот модуль и тонкий React-хук поверх него.

const EVENT_TYPES_KEY = 'call-scheduling:event-types';
const BOOKINGS_KEY = 'call-scheduling:bookings';

/** Тип события: id = слаг маршрута /book/:slug (латиница, цифры, дефис). */
export interface EventType {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

/** Запись: подтверждённая встреча гостя с владельцем календаря. */
export interface Booking {
  id: string;
  eventTypeId: string;
  /** Локальное время браузера в ISO-строке. */
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
}

function readList<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw === null ? [] : (JSON.parse(raw) as T[]);
}

function writeList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function getEventTypes(): EventType[] {
  return readList<EventType>(EVENT_TYPES_KEY);
}

export function getBookings(): Booking[] {
  return readList<Booking>(BOOKINGS_KEY);
}

export function saveEventType(eventType: EventType): void {
  writeList<EventType>(EVENT_TYPES_KEY, [...getEventTypes(), eventType]);
}

export function saveBooking(booking: Booking): void {
  writeList<Booking>(BOOKINGS_KEY, [...getBookings(), booking]);
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

/** Демо-seед при первом запуске (пустой localStorage): не перезаписывает данные. */
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
      title: 'Встреча 15 минут',
      description: 'Короткий созвон на 15 минут',
      durationMinutes: 15,
    },
    {
      id: '30-min',
      title: 'Встреча 30 минут',
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
