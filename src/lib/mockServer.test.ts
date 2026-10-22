// Тесты шва «SDK через мок-сервер»: фронтенд ходит в данные только через
// сгенерированный клиент hey-api, а перехватчик fetch маршрутизирует запросы
// в модуль данных bookings.ts, отвечая по контракту (spec/main.tsp):
// 200/204/400/404/409 и тело { code, message }.
import { beforeEach, expect, test } from 'vitest';
import {
  cancelBooking,
  createBooking,
  createEventType,
  getAvailableSlots,
  getEventTypes,
  listBookings,
} from '../api';
import { bookingWindowDays, isWeekendDay } from './bookings';
import { installMockServer } from './mockServer';

installMockServer();

// День точно вне demo-seed: три дня вперёд от текущего момента, 12:00.
function futureNoon(): Date {
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  start.setHours(12, 0, 0, 0);
  return start;
}

/** Первый рабочий день после сегодняшнего — ключ 'YYYY-MM-DD' (всегда в окне). */
function nextWeekdayKey(): string {
  const key = bookingWindowDays()
    .slice(1)
    .find((date) => !isWeekendDay(date));
  if (key === undefined) {
    throw new Error('в окне нет рабочих дней');
  }
  return key;
}

/** Первый выходной день окна записи — ключ 'YYYY-MM-DD'. */
function firstWeekendKey(): string {
  const key = bookingWindowDays().find((date) => isWeekendDay(date));
  if (key === undefined) {
    throw new Error('в окне нет выходных дней');
  }
  return key;
}

beforeEach(() => {
  // Каждый тест стартует как «первый запуск»: mock-сервер поднимает demo-seed.
  localStorage.clear();
});

test('SDK getEventTypes отдаёт каталог demo-seed (200)', async () => {
  const { data, response } = await getEventTypes();

  expect(response?.status).toBe(200);
  expect(data?.map((type) => type.id)).toEqual(['15-min', '30-min']);
});

test('SDK createBooking создаёт запись (200), повторное создание на то же время — 409 slot_taken', async () => {
  const start = futureNoon();

  const created = await createBooking({
    body: {
      eventTypeId: '15-min',
      start: start.toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
  });
  expect(created.response?.status).toBe(200);
  expect(created.data?.eventTypeId).toBe('15-min');

  // Повторная запись на то же время — для другого типа события (спека, раздел 3).
  const conflict = await createBooking({
    body: {
      eventTypeId: '30-min',
      start: start.toISOString(),
      guestName: 'Пётр Сидоров',
      guestEmail: 'petr@example.com',
    },
  });
  expect(conflict.response?.status).toBe(409);
  expect(conflict.error).toMatchObject({ code: 'slot_taken' });
});

test('SDK createBooking с неизвестным типом события — 404 not_found', async () => {
  const start = futureNoon();

  const result = await createBooking({
    body: {
      eventTypeId: 'no-such-type',
      start: start.toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    },
  });

  expect(result.response?.status).toBe(404);
  expect(result.error).toMatchObject({ code: 'not_found' });
});

test('SDK createBooking с некорректным email — 400 validation_failed', async () => {
  const start = futureNoon();

  const result = await createBooking({
    body: {
      eventTypeId: '15-min',
      start: start.toISOString(),
      guestName: 'Иван Петров',
      guestEmail: 'не-email',
    },
  });

  expect(result.response?.status).toBe(400);
  expect(result.error).toMatchObject({ code: 'validation_failed' });
});

test('SDK createEventType: успех 200, дубль id — 409 id_taken', async () => {
  const created = await createEventType({
    body: {
      id: '45-min',
      name: 'Встреча 45 минут',
      description: 'Разбор на 45 минут',
      durationMinutes: 45,
    },
  });
  expect(created.response?.status).toBe(200);
  expect(created.data?.id).toBe('45-min');

  const duplicate = await createEventType({
    body: {
      id: '45-min',
      name: 'Дубль',
      description: 'Дубль id',
      durationMinutes: 20,
    },
  });
  expect(duplicate.response?.status).toBe(409);
  expect(duplicate.error).toMatchObject({ code: 'id_taken' });
});

test('SDK getAvailableSlots: рабочий день внутри окна — 200, старты по сетке с 10:00', async () => {
  const { data, response } = await getAvailableSlots({
    path: { id: '15-min' },
    query: { date: nextWeekdayKey() },
  });

  expect(response?.status).toBe(200);
  expect(data?.length).toBeGreaterThan(0);
  expect(data?.every((slot) => new Date(slot.start).getMinutes() % 15 === 0)).toBe(true);
  expect(data?.every((slot) => new Date(slot.start).getHours() >= 10)).toBe(true);
});

test('SDK getAvailableSlots: выходной день — 200 и пустой список', async () => {
  const { data, response } = await getAvailableSlots({
    path: { id: '15-min' },
    query: { date: firstWeekendKey() },
  });

  expect(response?.status).toBe(200);
  expect(data).toEqual([]);
});

test('SDK getAvailableSlots: слоты сегодня не ближе часа от текущего момента', async () => {
  const checkedAt = Date.now();

  const { data } = await getAvailableSlots({
    path: { id: '15-min' },
    query: { date: bookingWindowDays()[0] },
  });

  // Граница в 59 минут: юнит-тесты модуля проверяют ровно 1 час на фиксированном
  // времени, здесь — свойство без гонки с часами машины.
  expect(
    data?.every((slot) => new Date(slot.start).getTime() - checkedAt >= 59 * 60_000),
  ).toBe(true);
});

test('SDK getAvailableSlots: неизвестный тип события — 404 not_found', async () => {
  const result = await getAvailableSlots({
    path: { id: 'no-such-type' },
    query: { date: nextWeekdayKey() },
  });

  expect(result.response?.status).toBe(404);
  expect(result.error).toMatchObject({ code: 'not_found' });
});

test('SDK cancelBooking: отмена — 204 и запись исчезает, повторная — 404 not_found', async () => {
  const listed = await listBookings();
  expect(listed.response?.status).toBe(200);
  const demo = listed.data?.find((booking) => booking.id === 'demo-1');
  expect(demo).toBeTruthy();

  const cancelled = await cancelBooking({ path: { id: 'demo-1' } });
  expect(cancelled.response?.status).toBe(204);

  const after = await listBookings();
  expect(after.data?.map((booking) => booking.id)).toEqual(['demo-2', 'demo-3']);

  const repeated = await cancelBooking({ path: { id: 'demo-1' } });
  expect(repeated.response?.status).toBe(404);
  expect(repeated.error).toMatchObject({ code: 'not_found' });
});
