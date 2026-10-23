// Панель владельца календаря (/admin, спека раздел 6.6): «Предстоящие события» —
// один плоский список записей всех типов события по возрастанию начала
// (ближайшая сверху; порядок — «на бэкенде», listBookings). Строка записи:
// название типа события, интервал, имя гостя, email и кнопка «Отменить».
// Отмена — через сгенерированный SDK cancelBooking (ADR-0002) с подтверждением
// в модалке Mantine: полное удаление, слот мгновенно освобождается. Пусто —
// «Нет предстоящих записей». Список предстоящих не показывает прошедшие записи
// (фильтр upcoming); хедер панели — «Назад к витрине» (спека, раздел 5).
// Ниже списка — блок «Создать тип события» (тикет #24): форма с @mantine/form,
// сохранение только через SDK createEventType; клиентская валидация id
// дублирует серверную, неуникальный id подсвечивает сообщением 409 id_taken.
import {
  Alert,
  Button,
  Container,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { LoadingRow } from '../components/LoadingRow';
import { cancelBooking, createEventType } from '../api';
import type { Booking } from '../api';
import { formatDayMonth, formatTimeRange } from '../lib/format';
import { useEventTypes } from '../lib/useEventTypes';
import { useUpcomingBookings } from '../lib/useUpcomingBookings';

/** Сообщение серверной валидации пустых полей (мок-сервер, POST /event-types). */
const REQUIRED_MESSAGE = 'Проверьте название, описание и длительность';
/** Формат id: латиница, цифры, дефис — тот же, что проверяет сервер. */
const EVENT_TYPE_ID_PATTERN = /^[A-Za-z0-9-]+$/;

export default function AdminPage() {
  const { bookings, loading, reload } = useUpcomingBookings();
  const { eventTypes } = useEventTypes();
  // Запись, отмену которой подтверждают в модалке; null — модалка закрыта.
  const [pending, setPending] = useState<Booking | null>(null);
  // Ошибка создания типа события, не привязанная к полю (сеть и прочее).
  const [createError, setCreateError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      id: '',
      name: '',
      description: '',
      durationMinutes: '' as string | number,
    },
    validate: {
      id: (value) =>
        EVENT_TYPE_ID_PATTERN.test(value.trim()) ? null : 'id: латиница, цифры, дефис',
      name: (value) => (value.trim() ? null : REQUIRED_MESSAGE),
      description: (value) => (value.trim() ? null : REQUIRED_MESSAGE),
      durationMinutes: (value) =>
        Number.isInteger(Number(value)) && Number(value) > 0 ? null : REQUIRED_MESSAGE,
    },
  });

  const eventTypeName = (eventTypeId: string) =>
    eventTypes.find((type) => type.id === eventTypeId)?.name ?? eventTypeId;

  const confirmCancel = async () => {
    if (!pending) {
      return;
    }
    // И успех (204), и 404 (запись уже отменена в другой вкладке) закрывают
    // модалку и перезагружают список — отдельных экранов ошибок нет (спека, 5).
    await cancelBooking({ path: { id: pending.id } });
    setPending(null);
    reload();
  };

  const onCreate = form.onSubmit(async (values) => {
    setCreateError(null);
    const { data, error } = await createEventType({
      body: {
        id: values.id.trim(),
        name: values.name.trim(),
        description: values.description.trim(),
        durationMinutes: Number(values.durationMinutes),
      },
    });
    if (data) {
      form.reset();
      return;
    }
    if (error?.code === 'id_taken') {
      // Уникальность проверяет сервер — источник истины (тикет #24).
      form.setErrors({ id: error.message });
      return;
    }
    setCreateError(error?.message ?? 'Не удалось создать тип события. Попробуйте ещё раз.');
  });

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Title order={1}>Предстоящие события</Title>
          {loading ? (
            <LoadingRow />
          ) : bookings.length === 0 ? (
            <Text c="dimmed">Нет предстоящих записей</Text>
          ) : (
            <Stack gap="sm">
              {bookings.map((booking) => (
                <Paper withBorder p="md" key={booking.id}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={4}>
                      <Text fw={600}>{eventTypeName(booking.eventTypeId)}</Text>
                      <Text c="dimmed">
                        {`${formatDayMonth(booking.start)}, ${formatTimeRange(booking.start, booking.end)}`}
                      </Text>
                      <Text>{booking.guestName}</Text>
                      <Text>{booking.guestEmail}</Text>
                    </Stack>
                    <Button variant="light" color="red" onClick={() => setPending(booking)}>
                      Отменить
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
          <Title order={2}>Создать тип события</Title>
          <form onSubmit={onCreate}>
            <Stack gap="sm">
              {createError && (
                <Alert color="red" role="alert">
                  {createError}
                </Alert>
              )}
              <TextInput
                label="id"
                description="Латиница, цифры и дефис; должен быть уникальным"
                {...form.getInputProps('id')}
              />
              <TextInput label="Название" {...form.getInputProps('name')} />
              <Textarea label="Описание" {...form.getInputProps('description')} />
              <NumberInput
                label="Длительность в минутах"
                min={1}
                {...form.getInputProps('durationMinutes')}
              />
              <Button type="submit" loading={form.submitting} w="fit-content">
                Создать
              </Button>
            </Stack>
          </form>
        </Stack>
      </Container>
      <Modal
        opened={pending !== null}
        onClose={() => setPending(null)}
        title="Отменить запись?"
        centered
      >
        <Stack gap="md">
          <Text>Слот сразу освободится. Действие необратимо.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPending(null)}>
              Оставить
            </Button>
            <Button color="red" onClick={confirmCancel}>
              Отменить запись
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
