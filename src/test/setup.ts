// Setup для vitest (jsdom): MantineProvider вызывает window.matchMedia,
// которого jsdom не реализует — ставим минимальный мок.
// Плюс мок-сервер: SDK ходит в данные через перехваченный fetch
// (в приложении то же делает main.tsx; ADR-0002 — живого бэкенда нет).
import { installMockServer } from '../lib/mockServer';

installMockServer();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
