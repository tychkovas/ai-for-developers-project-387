// Панель владельца календаря (/admin, спека раздел 6.6): «Предстоящие события» —
// один плоский список записей всех типов события по возрастанию начала
// (ближайшая сверху; порядок — «на бэкенде», listBookings). Строка записи:
// название типа события, интервал, имя гостя, email и кнопка «Отменить».
// Отмена — через сгенерированный SDK cancelBooking (ADR-0002) с подтверждением
// в модалке Mantine: полное удаление, слот мгновенно освобождается. Пусто —
// «Нет предстоящих записей». Список предстоящих не показывает прошедшие записи
// (фильтр upcoming); хедер панели — «Назад к витрине» (спека, раздел 5).
import {
  Button,
  Container,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { LoadingRow } from '../components/LoadingRow';
import { cancelBooking } from '../api';
import type { Booking } from '../api';
import { formatDayMonth, formatTimeRange } from '../lib/format';
import { useEventTypes } from '../lib/useEventTypes';
import { useUpcomingBookings } from '../lib/useUpcomingBookings';

export default function AdminPage() {
  const { bookings, loading, reload } = useUpcomingBookings();
  const { eventTypes } = useEventTypes();
  // Запись, отмену которой подтверждают в модалке; null — модалка закрыта.
  const [pending, setPending] = useState<Booking | null>(null);

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
