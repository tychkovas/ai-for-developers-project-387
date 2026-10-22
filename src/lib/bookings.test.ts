// Юнит-тесты модуля данных календаря (шов «модуль данных», спека раздел 8):
// сущности «тип события» и «запись», загрузка/сохранение, демо-seed.
// Внешняя зависимость — время — внедряется параметром now (граница системы).
import { beforeEach, expect, test } from 'vitest';
import {
  ensureSeed,
  getBookings,
  getEventTypes,
  saveBooking,
  saveEventType,
} from './bookings';

beforeEach(() => {
  localStorage.clear();
});

test('первый запуск: создаются оба типа события demo-seed', () => {
  ensureSeed(new Date(2026, 9, 21, 9, 0));

  expect(getEventTypes()).toEqual([
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
});

test('первый запуск: создаются три записи Demo User на ближайшие два рабочих дня', () => {
  // Среда, 21 октября 2026: ближайшие рабочие дни — четверг 22-го и пятница 23-го.
  ensureSeed(new Date(2026, 9, 21, 9, 0));

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

  const bookings = getBookings();
  expect(bookings.map((booking) => booking.start)).toEqual([
    new Date(2026, 9, 26, 11, 0).toISOString(),
    new Date(2026, 9, 26, 15, 0).toISOString(),
    new Date(2026, 9, 27, 10, 30).toISOString(),
  ]);
});

test('сохранение: новый тип события и запись доступны после загрузки', () => {
  ensureSeed(new Date(2026, 9, 21, 9, 0));

  saveEventType({
    id: '45-min',
    title: 'Встреча 45 минут',
    description: 'Разбор на 45 минут',
    durationMinutes: 45,
  });
  saveBooking({
    id: 'b-1',
    eventTypeId: '15-min',
    start: new Date(2026, 9, 22, 12, 0).toISOString(),
    end: new Date(2026, 9, 22, 12, 15).toISOString(),
    guestName: 'Иван Петров',
    guestEmail: 'ivan@example.com',
  });

  expect(getEventTypes().map((type) => type.id)).toEqual(['15-min', '30-min', '45-min']);
  expect(getBookings().map((booking) => booking.id)).toEqual(['demo-1', 'demo-2', 'demo-3', 'b-1']);
});

test('повторный запуск seed не перезаписывает данные', () => {
  const now = new Date(2026, 9, 21, 9, 0);
  ensureSeed(now);
  saveBooking({
    id: 'b-1',
    eventTypeId: '15-min',
    start: new Date(2026, 9, 22, 12, 0).toISOString(),
    end: new Date(2026, 9, 22, 12, 15).toISOString(),
    guestName: 'Иван Петров',
    guestEmail: 'ivan@example.com',
  });

  ensureSeed(now);

  expect(getBookings().map((booking) => booking.id)).toEqual([
    'demo-1',
    'demo-2',
    'demo-3',
    'b-1',
  ]);
  expect(getEventTypes()).toHaveLength(2);
});

test('seed не запускается, когда в localStorage уже есть данные', () => {
  saveBooking({
    id: 'b-1',
    eventTypeId: '15-min',
    start: new Date(2026, 9, 22, 12, 0).toISOString(),
    end: new Date(2026, 9, 22, 12, 15).toISOString(),
    guestName: 'Иван Петров',
    guestEmail: 'ivan@example.com',
  });

  ensureSeed(new Date(2026, 9, 21, 9, 0));

  expect(getEventTypes()).toEqual([]);
  expect(getBookings().map((booking) => booking.id)).toEqual(['b-1']);
});
