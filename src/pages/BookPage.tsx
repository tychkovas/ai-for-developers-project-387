// Экран выбора даты и слота (/book/:slug, спека раздел 6.3): слева календарь
// 14-дневного окна записи, справа свободные слоты выбранного дня. Генерация
// слотов — «на бэкенде» (модуль данных bookings.ts через SDK и мок-сервер):
// рабочие часы, сетка 15 минут, упреждение 1 час, занятые скрыты. По умолчанию
// выбран первый день со слотами; повторный клик по дню сбрасывает выбор.
// Клик по слоту ведёт на форму записи (тикет #22). Неизвестный :slug —
// молчаливый редирект на /events (спека, раздел 5).
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import {
  Anchor,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { LoadingRow } from '../components/LoadingRow';
import { isWeekendDay, bookingWindowDays, toDateKey } from '../lib/bookings';
import { useAvailableSlots } from '../lib/useAvailableSlots';
import { useEventTypes } from '../lib/useEventTypes';

export default function BookPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { eventTypes, loading: typesLoading } = useEventTypes();
  const eventType = eventTypes.find((type) => type.id === slug);
  const { slotsByDate, loading: slotsLoading } = useAvailableSlots(eventType?.id);
  // Явный выбор гостя: повторный клик по выбранному дню сбрасывает выбор.
  const [picked, setPicked] = useState<string | null>(null);
  const [hasPicked, setHasPicked] = useState(false);
  // Текущий день и текущий месяц календаря при входе (спека, раздел 6.3).
  const [todayKey] = useState(() => toDateKey(new Date()));
  const [displayedKey, setDisplayedKey] = useState(() => toDateKey(new Date()));

  if (!typesLoading && !eventType) {
    return <Navigate to="/events" replace />;
  }

  const windowDays = bookingWindowDays();
  // Первый день со слотами выбран по умолчанию; свободных дней нет — сегодня.
  const firstWithSlots =
    windowDays.find((date) => (slotsByDate?.[date].length ?? 0) > 0) ?? todayKey;
  const selectedKey = hasPicked ? picked : firstWithSlots;
  const daySlots = selectedKey === null ? [] : (slotsByDate?.[selectedKey] ?? []);

  const toggleDay = (date: string) => {
    setHasPicked(true);
    setPicked(date === selectedKey ? null : date);
  };

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Anchor component={Link} to="/events" underline="never" size="sm">
            ← Типы события
          </Anchor>
          {eventType ? (
            <>
              <Title order={1}>{eventType.name}</Title>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Paper withBorder p="md">
                  <Calendar
                    maxLevel="month"
                    date={displayedKey}
                    onDateChange={setDisplayedKey}
                    minDate={todayKey}
                    maxDate={windowDays[windowDays.length - 1]}
                    excludeDate={isWeekendDay}
                    locale="ru"
                    firstDayOfWeek={1}
                    nextLabel="Следующий месяц"
                    previousLabel="Предыдущий месяц"
                    getDayProps={(date) => ({
                      'aria-pressed': date === selectedKey || undefined,
                      onClick: () => toggleDay(date),
                    })}
                  />
                </Paper>
                <Stack gap="sm">
                  {slotsLoading && <LoadingRow />}
                  {!slotsLoading && selectedKey === null && (
                    <Text c="dimmed">Выберите дату в календаре</Text>
                  )}
                  {!slotsLoading && selectedKey !== null && (
                    <>
                      <Title order={3}>
                        {dayjs(selectedKey).locale('ru').format('D MMMM')}
                      </Title>
                      {daySlots.length === 0 ? (
                        <Text c="dimmed">Нет слотов на этот день</Text>
                      ) : (
                        <Group gap="xs">
                          {daySlots.map((slot) => (
                            <Button
                              key={slot.start}
                              variant="light"
                              onClick={() =>
                                navigate(
                                  `/book/${slug}/confirm?slot=${encodeURIComponent(slot.start)}`,
                                )
                              }
                            >
                              {dayjs(slot.start).format('HH:mm')}
                            </Button>
                          ))}
                        </Group>
                      )}
                    </>
                  )}
                </Stack>
              </SimpleGrid>
            </>
          ) : (
            <LoadingRow />
          )}
        </Stack>
      </Container>
    </>
  );
}
