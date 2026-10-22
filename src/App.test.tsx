// Тесты приложения как чёрного ящика (шов «приложение как чёрный ящик»):
// витрина, хедер, каталог типов события из демо-seed, выбор слота, форма
// записи, экран успеха, маршруты.
// Данные приходят так же, как в живом приложении: компоненты зовут
// сгенерированный SDK, запросы перехватывает мок-сервер; маршруты —
// через history.pushState, проверки — по role/text.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from './App';
import {
  bookingWindowDays,
  createBooking,
  createEventType,
  ensureSeed,
  getAvailableSlots,
  getBookings,
  isWeekendDay,
} from './lib/bookings';

beforeEach(() => {
  // Каждый тест стартует как «первый запуск» с пустым localStorage.
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.history.pushState(null, '', '/');
});

/** Рендер приложения на заданном маршруте (чёрный ящик: маршрут через history). */
function renderAt(path: string) {
  window.history.pushState(null, '', path);
  render(<App />);
}

test('витрина: заголовок, описание и CTA на /events', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Запишитесь на звонок в пару кликов' }),
  ).toBeTruthy();
  expect(screen.getByText(/свободный слот в календаре/i)).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Записаться на звонок' }).getAttribute('href'),
  ).toBe('/events');
});

test('хедер: название ведёт на /, кнопка «Админка» — на /admin', () => {
  render(<App />);

  expect(
    screen.getByRole('link', { name: 'Календарь звонков' }).getAttribute('href'),
  ).toBe('/');
  expect(screen.getByRole('link', { name: 'Админка' }).getAttribute('href')).toBe('/admin');
});

test('CTA переводит на каталог типов события', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('link', { name: 'Записаться на звонок' }));

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Типы события' }),
  ).toBeTruthy();
  expect(window.location.pathname).toBe('/events');
});

test('каталог: карточки seed-типов в порядке возрастания длительности', async () => {
  renderAt('/events');

  const cards = await screen.findAllByRole('link', { name: /Встреча \d+ минут/ });
  expect(cards.map((card) => card.getAttribute('href'))).toEqual([
    '/book/15-min',
    '/book/30-min',
  ]);
  expect(within(cards[0]).getByText('Короткий созвон на 15 минут')).toBeTruthy();
  expect(within(cards[0]).getByText('15 минут')).toBeTruthy();
  expect(within(cards[0]).getByText('Записаться')).toBeTruthy();
  expect(within(cards[1]).getByText('Созвон на 30 минут, когда 15 мало')).toBeTruthy();
  expect(within(cards[1]).getByText('30 минут')).toBeTruthy();
});

test('клик по карточке ведёт на /book/:slug', async () => {
  renderAt('/events');

  const card = await screen.findByRole('link', { name: /Встреча 15 минут/ });
  fireEvent.click(card);

  expect(window.location.pathname).toBe('/book/15-min');
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Встреча 15 минут' }),
  ).toBeTruthy();
});

test('клик по кнопке «Записаться» ведёт на /book/:slug', async () => {
  renderAt('/events');

  const card = await screen.findByRole('link', { name: /Встреча 30 минут/ });
  fireEvent.click(within(card).getByText('Записаться'));

  expect(window.location.pathname).toBe('/book/30-min');
});

test('неизвестный :slug молча редиректит на каталог', async () => {
  renderAt('/book/no-such-type');

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Типы события' }),
  ).toBeTruthy();
  expect(window.location.pathname).toBe('/events');
});

test('неизвестный маршрут редиректит на витрину', () => {
  renderAt('/somewhere');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Запишитесь на звонок в пару кликов' }),
  ).toBeTruthy();
  expect(window.location.pathname).toBe('/');
});

// ——— Выбор слота /book/:slug (тикет #21, спека раздел 6.3) ———

test('при входе на /book/15-min календарь показывает текущий месяц и выбранный первый день со слотами', async () => {
  renderAt('/book/15-min');

  // Текущий месяц в заголовке календаря.
  expect(await screen.findByText(dayjs().locale('ru').format('MMMM YYYY'))).toBeTruthy();
  // Свободные слоты выбранного дня видны списком.
  expect((await screen.findAllByRole('button', { name: /^\d{1,2}:\d{2}$/ })).length).toBeGreaterThan(0);
  // Выбран первый день со слотами: по умолчанию обычно сегодня.
  const expectedDay =
    bookingWindowDays().find((date) => (getAvailableSlots('15-min', date)?.length ?? 0) > 0) ?? '';
  expect(await screen.findByText(dayjs(expectedDay).locale('ru').format('D MMMM'))).toBeTruthy();
  expect(
    screen.getByRole('button', { pressed: true }).getAttribute('aria-label'),
  ).toBe(dayjs(expectedDay).locale('ru').format('D MMMM YYYY'));
  // Контекстная навигация на каталог типов события.
  expect(screen.getByRole('link', { name: '← Типы события' }).getAttribute('href')).toBe('/events');
});

test('выходные дни в календаре не выбираются', async () => {
  renderAt('/book/15-min');
  await screen.findAllByRole('button', { name: /^\d{1,2}:\d{2}$/ });

  // Ближайшая суббота текущего месяца видна в месячной сетке и заблокирована.
  const firstOfMonth = dayjs().startOf('month');
  const saturday = firstOfMonth.add((6 - firstOfMonth.day() + 7) % 7, 'day');
  const button = screen.getByRole('button', {
    name: saturday.locale('ru').format('D MMMM YYYY'),
  });
  expect((button as HTMLButtonElement).disabled).toBe(true);
});

test('навигация по месяцам не уходит за пределы окна записи', async () => {
  renderAt('/book/15-min');
  await screen.findAllByRole('button', { name: /^\d{1,2}:\d{2}$/ });

  // Окно 14 дней захватывает максимум два месяца: вперёд не более одного раза.
  const next = screen.getByRole('button', { name: 'Следующий месяц' }) as HTMLButtonElement;
  const spansTwoMonths =
    dayjs(bookingWindowDays().at(-1)).format('YYYY-MM') !== dayjs().format('YYYY-MM');
  if (spansTwoMonths) {
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    expect(
      (screen.getByRole('button', { name: 'Следующий месяц' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  } else {
    expect(next.disabled).toBe(true);
  }
});

test('клик по слоту ведёт на /book/:slug/confirm?slot=…', async () => {
  renderAt('/book/15-min');

  const slots = await screen.findAllByRole('button', { name: /^\d{1,2}:\d{2}$/ });
  fireEvent.click(slots[0]);

  expect(window.location.pathname).toBe('/book/15-min/confirm');
  expect(window.location.search).toMatch(/^\?slot=/);
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Запись' }),
  ).toBeTruthy();
  expect(screen.getByRole('link', { name: '← Выбор слота' }).getAttribute('href')).toBe(
    '/book/15-min',
  );
});

test('повторный клик по выбранному дню сбрасывает выбор — «Выберите дату в календаре»', async () => {
  renderAt('/book/15-min');
  await screen.findAllByRole('button', { name: /^\d{1,2}:\d{2}$/ });

  fireEvent.click(screen.getByRole('button', { pressed: true }));

  expect(await screen.findByText('Выберите дату в календаре')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^\d{1,2}:\d{2}$/ })).toBeNull();
});

test('полностью занятый день показывает «Нет слотов на этот день»', async () => {
  ensureSeed();
  createEventType({
    id: 'full-day',
    name: 'День целиком',
    description: 'Блокировка всего рабочего дня',
    durationMinutes: 540,
  });
  // Занятый день — последний рабочий день окна: он всегда позже первого дня
  // со слотами, поэтому при входе выбранным остаётся свободный день.
  const days = bookingWindowDays();
  const busyKey = days.toReversed().find((date) => !isWeekendDay(date));
  if (busyKey === undefined) {
    throw new Error('в окне нет рабочих дней');
  }
  const [year, month, day] = busyKey.split('-').map(Number);
  const busyDay = new Date(year, month - 1, day, 10, 0, 0, 0);
  createBooking({
    eventTypeId: 'full-day',
    start: busyDay.toISOString(),
    guestName: 'Занятый день',
    guestEmail: 'busy@example.com',
  });

  renderAt('/book/15-min');
  await screen.findAllByRole('button', { name: /^\d{1,2}:\d{2}$/ });

  // Открыть полностью занятый день в календаре (при необходимости — листануть месяц).
  const busyLabel = dayjs(busyDay).locale('ru').format('D MMMM YYYY');
  if (!screen.queryByRole('button', { name: busyLabel })) {
    fireEvent.click(screen.getByRole('button', { name: 'Следующий месяц' }));
  }
  fireEvent.click(screen.getByRole('button', { name: busyLabel }));

  expect(await screen.findByText('Нет слотов на этот день')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^\d{1,2}:\d{2}$/ })).toBeNull();
});

// ——— Форма записи и экран успеха (тикет #22, спека разделы 6.4–6.5) ———

/** Свободный слот «Встреча 15 минут» — так же, как гость выбрал его на /book/:slug. */
function pickFreeSlot() {
  ensureSeed();
  const day = bookingWindowDays().find(
    (date) => (getAvailableSlots('15-min', date)?.length ?? 0) > 0,
  );
  const slot = getAvailableSlots('15-min', day ?? '')?.[0];
  if (slot === undefined) {
    throw new Error('нет свободных слотов в окне записи');
  }
  return slot;
}

/** Открыть форму записи на заданном слоте и дождаться заголовка «Запись». */
async function openConfirm(start: string) {
  renderAt(`/book/15-min/confirm?slot=${encodeURIComponent(start)}`);
  await screen.findByRole('heading', { level: 1, name: 'Запись' });
}

test('confirm: сводка показывает тип события, дату и интервал; «← Выбор слота» ведёт на /book/:slug', async () => {
  const slot = pickFreeSlot();

  await openConfirm(slot.start);

  expect(screen.getByText('Встреча 15 минут')).toBeTruthy();
  const interval = `${dayjs(slot.start).locale('ru').format('D MMMM')}, ${dayjs(slot.start).format('HH:mm')}–${dayjs(slot.end).format('HH:mm')}`;
  expect(screen.getByText(interval)).toBeTruthy();
  expect(screen.getByRole('link', { name: '← Выбор слота' }).getAttribute('href')).toBe(
    '/book/15-min',
  );
});

test('confirm: пустое имя и неверный формат email блокируют отправку', async () => {
  const slot = pickFreeSlot();
  await openConfirm(slot.start);

  // Пустое имя: submit блокируется, форма остаётся на месте.
  fireEvent.click(screen.getByRole('button', { name: 'Записаться' }));
  expect(await screen.findByText('Введите имя')).toBeTruthy();
  expect(window.location.pathname).toBe('/book/15-min/confirm');

  // Неверный формат email: та же проверка, что у сервера.
  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ivan(at)example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Записаться' }));
  expect(await screen.findByText('Введите корректный email')).toBeTruthy();
  expect(window.location.pathname).toBe('/book/15-min/confirm');
  // Запись не создана.
  expect(getBookings().some((booking) => booking.guestEmail === 'ivan(at)example')).toBe(false);
});

test('confirm: валидная отправка создаёт запись и ведёт на /success/:id', async () => {
  const slot = pickFreeSlot();
  await openConfirm(slot.start);

  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван Иванов' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ivan@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Записаться' }));

  // Успех: сводка из пяти пунктов созданной записи.
  expect(await screen.findByRole('heading', { level: 1, name: 'Вы записаны!' })).toBeTruthy();
  expect(window.location.pathname).toMatch(/^\/success\/.+$/);
  expect(screen.getByText('Тип события: Встреча 15 минут')).toBeTruthy();
  expect(
    screen.getByText(`Дата: ${dayjs(slot.start).locale('ru').format('D MMMM')}`),
  ).toBeTruthy();
  expect(
    screen.getByText(`Время: ${dayjs(slot.start).format('HH:mm')}–${dayjs(slot.end).format('HH:mm')}`),
  ).toBeTruthy();
  expect(screen.getByText('Имя: Иван Иванов')).toBeTruthy();
  expect(screen.getByText('Email: ivan@example.com')).toBeTruthy();
  // Запись действительно создана в модуле данных.
  expect(getBookings().some((booking) => booking.guestName === 'Иван Иванов')).toBe(true);

  // «Записаться ещё» ведёт в каталог типов события.
  fireEvent.click(screen.getByRole('link', { name: 'Записаться ещё' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Типы события' })).toBeTruthy();
  expect(window.location.pathname).toBe('/events');
});

test('confirm: слот, занятый к моменту отправки, редиректит на /book/:slug', async () => {
  const slot = pickFreeSlot();
  await openConfirm(slot.start);
  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ivan@example.com' } });

  // «Другая вкладка» заняла тот же слот, пока гость заполнял форму (409 slot_taken).
  createBooking({
    eventTypeId: '15-min',
    start: slot.start,
    guestName: 'Другая вкладка',
    guestEmail: 'other@example.com',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Записаться' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'Встреча 15 минут' })).toBeTruthy();
  expect(window.location.pathname).toBe('/book/15-min');
  expect(getBookings().some((booking) => booking.guestName === 'Иван')).toBe(false);
});

test('confirm: слот, занятый к моменту открытия формы, редиректит на /book/:slug', async () => {
  const slot = pickFreeSlot();
  createBooking({
    eventTypeId: '15-min',
    start: slot.start,
    guestName: 'Занятый слот',
    guestEmail: 'busy@example.com',
  });

  renderAt(`/book/15-min/confirm?slot=${encodeURIComponent(slot.start)}`);

  expect(await screen.findByRole('heading', { level: 1, name: 'Встреча 15 минут' })).toBeTruthy();
  expect(window.location.pathname).toBe('/book/15-min');
});

test.each([
  ['не-дата', 'not-a-date'],
  ['прошедший', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()],
])('confirm: %s slot в URL редиректит на /book/:slug', async (_case, slotValue) => {
  renderAt(`/book/15-min/confirm?slot=${encodeURIComponent(slotValue)}`);

  expect(await screen.findByRole('heading', { level: 1, name: 'Встреча 15 минут' })).toBeTruthy();
  expect(window.location.pathname).toBe('/book/15-min');
});
