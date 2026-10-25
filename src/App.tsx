// Корневой компонент приложения.
// MantineProvider обязателен — он даёт всем компонентам Mantine
// доступ к теме и контексту (официальный гайд Mantine для Vite).
// Данные фронтенд получает через сгенерированный SDK; перехват fetch
// и демо-seed — в мок-сервере, который ставит main.tsx (ADR-0002).
// Маршруты (спека, docs/spec/app.md): / — витрина,
// /events — каталог типов события, /book/:slug — выбор слота,
// /book/:slug/confirm — форма записи, /success/:id — экран успеха,
// /admin — панель «Предстоящие события». Общие шапка и подвал —
// в базовом макете AppLayout. Тема — кастомная (src/theme.ts): палитра
// brand и резолвер CSS-переменных с повышенной контрастностью (WCAG AA).
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import BookPage from './pages/BookPage';
import ConfirmPage from './pages/ConfirmPage';
import SuccessPage from './pages/SuccessPage';
import AdminPage from './pages/AdminPage';
import { cssVariablesResolver, theme } from './theme';

export default function App() {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
    >
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/book/:slug" element={<BookPage />} />
            <Route path="/book/:slug/confirm" element={<ConfirmPage />} />
            <Route path="/success/:id" element={<SuccessPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {/* Тосты об успешных действиях (тикет #26): портал на уровне корня —
          уведомление переживает смену маршрута. Монтируется один раз. */}
      <Notifications position="top-right" />
    </MantineProvider>
  );
}
