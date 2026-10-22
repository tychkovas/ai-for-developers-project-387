// Корневой компонент приложения.
// MantineProvider обязателен — он даёт всем компонентам Mantine
// доступ к теме и контексту (официальный гайд Mantine для Vite).
// Маршруты (спека, docs/spec/app.md): / — витрина,
// /events — каталог типов события, /book/:slug — заглушка выбора слота.
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ensureSeed } from './lib/bookings';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import BookPage from './pages/BookPage';

export default function App() {
  // Демо-seed при первом запуске (спека, раздел 7); идемпотентен.
  ensureSeed();

  return (
    <MantineProvider defaultColorScheme="light">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/book/:slug" element={<BookPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
