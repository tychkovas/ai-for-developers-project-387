// Корневой компонент приложения.
// MantineProvider обязателен — он даёт всем компонентам Mantine
// доступ к теме и контексту (официальный гайд Mantine для Vite).
// Данные фронтенд получает через сгенерированный SDK; перехват fetch
// и демо-seed — в мок-сервере, который ставит main.tsx (ADR-0002).
// Маршруты (спека, docs/spec/app.md): / — витрина,
// /events — каталог типов события, /book/:slug — выбор слота,
// /book/:slug/confirm — заглушка формы записи (тикет #22).
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import BookPage from './pages/BookPage';
import ConfirmPage from './pages/ConfirmPage';

export default function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/book/:slug" element={<BookPage />} />
          <Route path="/book/:slug/confirm" element={<ConfirmPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
