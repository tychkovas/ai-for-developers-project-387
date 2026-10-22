// Тесты шва «SDK через мок-сервер»: фронтенд ходит в данные только через
// сгенерированный клиент hey-api, а перехватчик fetch маршрутизирует запросы
// в модуль данных bookings.ts, отвечая по контракту (spec/main.tsp):
// 200/400/404/409 и тело { code, message }.
import { beforeEach, expect, test } from 'vitest';
import { createBooking, createEventType, getEventTypes } from '../api';
import { installMockServer } from './mockServer';

installMockServer();

// День точно вне demo-seed: три дня вперёд от текущего момента, 12:00.
function futureNoon(): Date {
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  start.setHours(12, 0, 0, 0);
  return start;
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
