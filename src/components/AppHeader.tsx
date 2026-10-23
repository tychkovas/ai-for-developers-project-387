// Общий хедер приложения (дизайн, docs/design/booking-app.md; спека, раздел 5):
// название сервиса ведёт на витрину; кнопка справа — «Админка» на всех
// экранах, кроме самой панели владельца, где она меняется на «Назад к витрине».
import { Anchor, Button, Container, Group } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';

export function AppHeader() {
  const { pathname } = useLocation();
  const onAdmin = pathname === '/admin';
  return (
    <Container size="md" py="md">
      <Group justify="space-between">
        <Anchor
          component={Link}
          to="/"
          underline="never"
          size="lg"
          fw={600}
          c="inherit"
        >
          Календарь звонков
        </Anchor>
        <Button
          variant="outline"
          size="sm"
          component={Link}
          to={onAdmin ? '/' : '/admin'}
        >
          {onAdmin ? 'Назад к витрине' : 'Админка'}
        </Button>
      </Group>    </Container>
  );
}
