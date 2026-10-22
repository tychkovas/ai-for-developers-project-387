// Стили Mantine подключаются один раз в корневом файле приложения.
// Стили @mantine/core обязательны, стили остальных пакетов —
// только если используются компоненты из этих пакетов.
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installMockServer } from './lib/mockServer';
import App from './App.tsx';

// ADR-0002: живого бэкенда нет — фронтенд ходит в API через сгенерированный SDK,
// а его запросы перехватывает мок-сервер поверх модуля данных (bookings.ts).
installMockServer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
