// Заглушка экрана формы записи (/book/:slug/confirm?slot=…, спека раздел 6.4):
// реальная форма — тикет #22. Заглушка показывает выбранный слот, чтобы
// маршрут выбора слота работал end-to-end. Контекстная навигация «← Выбор
// слота» ведёт обратно на /book/:slug (спека, раздел 5).
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';

export default function ConfirmPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const slot = searchParams.get('slot');

  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Anchor component={Link} to={`/book/${slug}`} underline="never" size="sm">
            ← Выбор слота
          </Anchor>
          <Title order={1}>Форма записи</Title>
          <Text c="dimmed">
            {slot ? `Выбранный слот: ${slot} — ` : ''}экран появится здесь, форма в разработке.
          </Text>
        </Stack>
      </Container>
    </>
  );
}
