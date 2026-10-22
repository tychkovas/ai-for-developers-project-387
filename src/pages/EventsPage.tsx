// Каталог типов события (/events, спека раздел 6.2):
// карточки из модуля данных, порядок — по возрастанию длительности;
// карточка целиком кликабельна, и карточка, и кнопка ведут на /book/:id.
import { Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { useEventTypes } from '../lib/useEventTypes';

/** «15 минут» / «2 минуты» / «1 минута» — длительность на карточке. */
function formatDuration(durationMinutes: number): string {
  const mod10 = durationMinutes % 10;
  const mod100 = durationMinutes % 100;
  let word = 'минут';
  if (mod10 === 1 && mod100 !== 11) {
    word = 'минута';
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = 'минуты';
  }
  return `${durationMinutes} ${word}`;
}

export default function EventsPage() {
  const eventTypes = [...useEventTypes()].sort(
    (a, b) => a.durationMinutes - b.durationMinutes,
  );

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Title order={1}>Типы события</Title>
          {eventTypes.map((type) => (
            <Card
              key={type.id}
              component={Link}
              to={`/book/${type.id}`}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              c="inherit"
              td="none"
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap="xs">
                  <Title order={2} size="h3">
                    {type.title}
                  </Title>
                  <Text c="dimmed">{type.description}</Text>
                  <Text size="sm" fw={500}>
                    {formatDuration(type.durationMinutes)}
                  </Text>
                </Stack>
                <Button component="span" mt="xs">
                  Записаться
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      </Container>
    </>
  );
}
