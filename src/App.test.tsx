// Тесты приложения как чёрного ящика (шов «приложение как чёрный ящик»):
// витрина, хедер, каталог типов события из демо-seed, маршрутизация.
// Данные — через localStorage, маршруты — через history.pushState,
// проверки — по role/text.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from './App';

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

test('каталог: карточки seed-типов в порядке возрастания длительности', () => {
  renderAt('/events');

  const cards = screen
    .getAllByRole('link')
    .filter((link) => (link.getAttribute('href') ?? '').startsWith('/book/'));
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

  fireEvent.click(screen.getByRole('link', { name: /Встреча 15 минут/ }));

  expect(window.location.pathname).toBe('/book/15-min');
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Встреча 15 минут' }),
  ).toBeTruthy();
});

test('клик по кнопке «Записаться» ведёт на /book/:slug', () => {
  renderAt('/events');

  const card = screen.getByRole('link', { name: /Встреча 30 минут/ });
  fireEvent.click(within(card).getByText('Записаться'));

  expect(window.location.pathname).toBe('/book/30-min');
});

test('неизвестный :slug молча редиректит на каталог', () => {
  renderAt('/book/no-such-type');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Типы события' }),
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
