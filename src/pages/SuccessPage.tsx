// Экран успеха (/success/:id, спека раздел 6.5): заголовок «Вы записаны!» и
// сводка созданной записи — тип события, дата, время, имя и email гостя.
// Запись и её тип события загружаются хуком useBooking поверх сгенерированного
// SDK (ADR-0002); неизвестный id молча ведёт в каталог типов события (спека,
// раздел 5: отдельных экранов ошибок нет). «Записаться ещё» возвращает гостя
// в каталог типов события.
import { Button, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { LoadingRow } from '../components/LoadingRow';
import { formatDayMonth, formatTimeRange } from '../lib/format';
import { useBooking } from '../lib/useBooking';

export default function SuccessPage() {
  const { id } = useParams();
  const { booking, eventType, loading } = useBooking(id);

  if (loading) {
    return (
      <>
        <AppHeader />
        <Container size="md" py="xl">
          <LoadingRow />
        </Container>
      </>
    );
  }
  if (!booking || !eventType) {
    return <Navigate to="/events" replace />;
  }

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Title order={1}>Вы записаны!</Title>
          <Paper withBorder p="md">
            <Stack gap={4}>
              <Text>{`Тип события: ${eventType.name}`}</Text>
              <Text>{`Дата: ${formatDayMonth(booking.start)}`}</Text>
              <Text>{`Время: ${formatTimeRange(booking.start, booking.end)}`}</Text>
              <Text>{`Имя: ${booking.guestName}`}</Text>
              <Text>{`Email: ${booking.guestEmail}`}</Text>
            </Stack>
          </Paper>
          <Button component={Link} to="/events" w="fit-content">
            Записаться ещё
          </Button>
        </Stack>
      </Container>
    </>
  );
}
