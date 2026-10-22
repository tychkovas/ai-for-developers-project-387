// Юнит-тесты модуля данных календаря — имитации сервера (шов «модуль данных»,
// спека раздел 8). Операции и коды ошибок зеркалят утверждённый API-контракт
// (spec/main.tsp): createBooking/createEventType, not_found/id_taken/slot_taken.
// Внешняя зависимость — время — внедряется параметром now (граница системы).
import { beforeEach, expect, test } from 'vitest';
import {
  createBooking,
  createEventType,
  ensureSeed,
  getBookings,
  getEventTypes,
} from './bookings';

// Среда, 21 октября 2026, 09:00 — фиксированное «сейчас» для тестов.
const NOW = new Date(2026, 9, 21, 9, 0);

beforeEach(() => {
  localStorage.clear();
});

test('первый запуск: создаются оба типа события demo-seed', () => {
  ensureSeed(NOW);

  expect(getEventTypes()).toEqual([
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
});

test('первый запуск: создаются три записи Demo User на ближайшие два рабочих дня', () => {
  // Среда, 21 октября 2026: ближайшие рабочие дни — четверг 22-го и пятница 23-го.
  ensureSeed(NOW);

  expect(getBookings()).toEqual([
    {
      id: 'demo-1',
      eventTypeId: '15-min',
      start: new Date(2026, 9, 22, 11, 0).toISOString(),
      end: new Date(2026, 9, 22, 11, 15).toISOString(),
      guestName: 'Demo User',
      guestEmail: 'demo@example.com',
    },
    {
      id: 'demo-2',
      eventTypeId: '30-min',
      start: new Date(2026, 9, 22, 15, 0).toISOString(),
      end: new Date(2026, 9, 22, 15, 30).toISOString(),
      guestName: 'Demo User',
      guestEmail: 'demo@example.com',
    },
    {
      id: 'demo-3',
      eventTypeId: '15-min',
      start: new Date(2026, 9, 23, 10, 30).toISOString(),
      end: new Date(2026, 9, 23, 10, 45).toISOString(),
      guestName: 'Demo User',
      guestEmail: 'demo@example.com',
    },
  ]);
});

test('демо-seed с субботы пропускает выходные: понедельник и вторник', () => {
  // Суббота, 24 октября 2026: ближайшие рабочие дни — понедельник 26-го и вторник 27-го.
  ensureSeed(new Date(2026, 9, 24, 12, 0));

  expect(getBookings().map((booking) => booking.start)).toEqual([
    new Date(2026, 9, 26, 11, 0).toISOString(),
    new Date(2026, 9, 26, 15, 0).toISOString(),
    new Date(2026, 9, 27, 10, 30).toISOString(),
  ]);
});

test('createEventType: создаёт тип события, он доступен в каталоге', () => {
  ensureSeed(NOW);

  const result = createEventType({
    id: '45-min',
    name: 'Встреча 45 минут',
    description: 'Разбор на 45 минут',
    durationMinutes: 45,
  });

  expect(result).toEqual({
    ok: true,
    eventType: {
      id: '45-min',
      name: 'Встреча 45 минут',
      description: 'Разбор на 45 минут',
      durationMinutes: 45,
    },
  });
  expect(getEventTypes().map((type) => type.id)).toEqual(['15-min', '30-min', '45-min']);
});

test('createEventType: дубль id отклоняется с кодом id_taken', () => {
  ensureSeed(NOW);

  const result = createEventType({
    id: '15-min',
    name: 'Дубль',
    description: 'Дубль существующего id',
    durationMinutes: 20,
  });

  expect(result).toEqual({ ok: false, error: 'id_taken' });
  expect(getEventTypes()).toHaveLength(2);
});

test('getEventTypes: порядок — по возрастанию длительности', () => {
  ensureSeed(NOW);
  createEventType({
    id: '5-min',
    name: 'Встреча 5 минут',
    description: 'Совсем короткий созвон',
    durationMinutes: 5,
  });

  expect(getEventTypes().map((type) => type.id)).toEqual(['5-min', '15-min', '30-min']);
});

test('createBooking: создаёт запись, конец вычисляется из длительности типа события', () => {
  ensureSeed(NOW);

  const result = createBooking(
    {
      eventTypeId: '15-min',
      start: new Date(2026, 9, 22, 12, 0).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.booking).toMatchObject({
      eventTypeId: '15-min',
      start: new Date(2026, 9, 22, 12, 0).toISOString(),
      end: new Date(2026, 9, 22, 12, 15).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    });
  }
  expect(getBookings()).toHaveLength(4);
});

test('createBooking: слот, занятый записью другого типа события, отклоняется (slot_taken)', () => {
  ensureSeed(NOW);

  // demo-1 занимает 11:00–11:15 типа «Встреча 15 минут» —
  // другой тип события то же время не спасает (спека, раздел 3).
  const result = createBooking(
    {
      eventTypeId: '30-min',
      start: new Date(2026, 9, 22, 11, 0).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );

  expect(result).toEqual({ ok: false, error: 'slot_taken' });
  expect(getBookings()).toHaveLength(3);
});

test('createBooking: частичное пересечение отклоняется (slot_taken)', () => {
  ensureSeed(NOW);

  // 11:10–11:25 пересекается с demo-1 (11:00–11:15) на 5 минут.
  const result = createBooking(
    {
      eventTypeId: '15-min',
      start: new Date(2026, 9, 22, 11, 10).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );

  expect(result).toEqual({ ok: false, error: 'slot_taken' });
});

test('createBooking: касание границ свободного слота разрешено', () => {
  ensureSeed(NOW);

  // 11:15–11:30 начинается ровно там, где кончается demo-1, — это не пересечение.
  const result = createBooking(
    {
      eventTypeId: '15-min',
      start: new Date(2026, 9, 22, 11, 15).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );

  expect(result.ok).toBe(true);
});

test('createBooking: прошедший слот отклоняется (slot_taken)', () => {
  ensureSeed(NOW);

  const result = createBooking(
    {
      eventTypeId: '15-min',
      start: new Date(2026, 9, 20, 12, 0).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );

  expect(result).toEqual({ ok: false, error: 'slot_taken' });
});

test('createBooking: неизвестный тип события — not_found', () => {
  ensureSeed(NOW);

  const result = createBooking(
    {
      eventTypeId: 'no-such-type',
      start: new Date(2026, 9, 22, 12, 0).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );

  expect(result).toEqual({ ok: false, error: 'not_found' });
});

test('повторный запуск seed не перезаписывает данные', () => {
  ensureSeed(NOW);
  const created = createBooking(
    {
      eventTypeId: '15-min',
      start: new Date(2026, 9, 22, 12, 0).toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
    NOW,
  );
  expect(created.ok).toBe(true);

  ensureSeed(NOW);

  const bookings = getBookings();
  expect(bookings).toHaveLength(4);
  expect(bookings.some((booking) => booking.guestName === 'Иван Петров')).toBe(true);
  expect(getEventTypes()).toHaveLength(2);
});

test('seed не запускается, когда в localStorage уже есть данные', () => {
  // Записи без типов события достижимы только прямой записью в хранилище —
  // guard должен уважать существующие данные в любом случае.
  localStorage.setItem(
    'call-scheduling:bookings',
    JSON.stringify([
      {
        id: 'b-1',
        eventTypeId: '15-min',
        start: new Date(2026, 9, 22, 12, 0).toISOString(),
        end: new Date(2026, 9, 22, 12, 15).toISOString(),
        guestName: 'Иван Петров',
        guestEmail: 'ivan@example.com',
      },
    ]),
  );

  ensureSeed(NOW);

  expect(getEventTypes()).toEqual([]);
  expect(getBookings().map((booking) => booking.id)).toEqual(['b-1']);
});
