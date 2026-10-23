// Экран формы записи (/book/:slug/confirm?slot=…, спека раздел 6.4): сводка
// выбранного слота (тип события, дата, интервал) и поля Имя/Email с клиентской
// валидацией @mantine/form. Создание записи — только через сгенерированный SDK
// (ADR-0002): успех ведёт на /success/:id, занятый к моменту отправки слот
// (409 slot_taken) — редирект обратно на выбор слота. Невалидный, занятый или
// прошедший slot в URL — редирект на /book/:slug при загрузке (спека, раздел 5).
// Неизвестный :slug — молчаливый редирект на /events. Формат email дублирует
// серверный (мок-сервер, POST /bookings) — серверная валидация остаётся
// источником истины.
import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { LoadingRow } from '../components/LoadingRow';
import { createBooking } from '../api';
import { formatDayMonth, formatTimeRange } from '../lib/format';
import { useAvailableSlots } from '../lib/useAvailableSlots';
import { useEventType } from '../lib/useEventType';

export default function ConfirmPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slotParam = searchParams.get('slot');
  const { eventType, loading: typesLoading } = useEventType(slug);
  const { slotsByDate, loading: slotsLoading } = useAvailableSlots(eventType?.id);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { guestName: '', guestEmail: '' },
    validate: {
      guestName: (value) => (value.trim() ? null : 'Введите имя'),
      guestEmail: (value) =>
        /^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'Введите корректный email',
    },
  });

  // Выбранный слот сверяется с доступными: невалидный, прошедший или уже
  // занятый слот в URL гостю не показывается (спека, раздел 5).
  const startMs = slotParam === null ? NaN : new Date(slotParam).getTime();
  const slot =
    slotsByDate === null
      ? undefined
      : Object.values(slotsByDate)
          .flat()
          .find((item) => new Date(item.start).getTime() === startMs);

  if (!typesLoading && !eventType) {
    return <Navigate to="/events" replace />;
  }
  if (eventType && !slotsLoading && slotsByDate && !slot) {
    return <Navigate to={`/book/${eventType.id}`} replace />;
  }

  const onSubmit = form.onSubmit(async (values) => {
    if (!eventType || !slot) {
      return;
    }
    setSubmitError(null);
    const { data, error } = await createBooking({
      body: {
        eventTypeId: eventType.id,
        start: slot.start,
        guestName: values.guestName.trim(),
        guestEmail: values.guestEmail.trim(),
      },
    });
    if (data) {
      navigate(`/success/${data.id}`);
      return;
    }
    if (error?.code === 'slot_taken') {
      // Слот заняли, пока гость заполнял форму (спека, раздел 6.4).
      navigate(`/book/${eventType.id}`);
      return;
    }
    // Остальные ошибки сервера — понятное сообщение в интерфейсе.
    setSubmitError(error?.message ?? 'Не удалось записаться. Попробуйте ещё раз.');
  });

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          {eventType && slot ? (
            <>
              <Anchor component={Link} to={`/book/${eventType.id}`} underline="never" size="sm">
                ← Выбор слота
              </Anchor>
              <Title order={1}>Запись</Title>
              <Paper withBorder p="md">
                <Stack gap={4}>
                  <Text fw={600}>{eventType.name}</Text>
                  <Text c="dimmed">{`${formatDayMonth(slot.start)}, ${formatTimeRange(slot.start, slot.end)}`}</Text>
                </Stack>
              </Paper>
              <form onSubmit={onSubmit}>
                <Stack gap="sm">
                  {submitError && (
                    <Alert color="red" role="alert">
                      {submitError}
                    </Alert>
                  )}
                  <TextInput
                    label="Имя"
                    placeholder="Иван Иванов"
                    {...form.getInputProps('guestName')}
                  />
                  <TextInput
                    label="Email"
                    placeholder="ivan@example.com"
                    {...form.getInputProps('guestEmail')}
                  />
                  <Button type="submit" loading={form.submitting} w="fit-content">
                    Записаться
                  </Button>
                </Stack>
              </form>
            </>
          ) : (
            <LoadingRow />
          )}
        </Stack>
      </Container>
    </>
  );
}
