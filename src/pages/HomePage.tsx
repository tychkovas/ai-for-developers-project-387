// Главная страница (витрина): рассказывает про сервис
// и ведёт на страницу записи (→ /events).
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <Container size="md" py="xl">
        <Stack gap="lg" justify="center" mih="60vh" maw={640}>
          <Title order={1}>Запишитесь на звонок в пару кликов</Title>
          <Text size="lg" c="dimmed">
            Выберите подходящий тип события и свободный слот в календаре
            владельца — и запись подтверждена. Без регистрации:
            достаточно имени и email, всё хранится прямо в браузере.
          </Text>
          <Group>
            <Button size="md" component={Link} to="/events">
              Записаться на звонок
            </Button>
          </Group>
        </Stack>
      </Container>
    </>
  );
}
