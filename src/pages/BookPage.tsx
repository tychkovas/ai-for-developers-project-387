// Заглушка экрана выбора даты и слота (/book/:slug): реальный календарь
// добавит тикет #21, форма записи — тикет #22. Заглушка нужна, чтобы маршрут
// каталога работал end-to-end. Неизвестный :slug — молчаливый редирект
// на /events (спека, раздел 5), отдельного экрана ошибок нет.
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { useEventTypes } from '../lib/useEventTypes';

export default function BookPage() {
  const { slug } = useParams();
  const eventType = useEventTypes().find((type) => type.id === slug);

  if (!eventType) {
    return <Navigate to="/events" replace />;
  }

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Anchor component={Link} to="/events" underline="never" size="sm">
            ← Типы события
          </Anchor>
          <Title order={1}>{eventType.name}</Title>
          <Text c="dimmed">
            Выбор даты и слота появится здесь — экран в разработке.
          </Text>
        </Stack>
      </Container>
    </>
  );
}
