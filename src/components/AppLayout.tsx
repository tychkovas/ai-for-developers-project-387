// Базовый макет приложения (спека, разделы 5–6; дизайн, docs/design/booking-app.md):
// общие шапка и подвал на всех экранах. AppShell сам резервирует место под
// фиксированные Header и Footer, поэтому контент страниц не перекрывается.
import { AppShell, Container, Group, Text } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

const currentYear = new Date().getFullYear();

export function AppLayout() {
  return (
    <AppShell header={{ height: 60 }} footer={{ height: 50 }}>
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      <AppShell.Footer>
        <Container size="md" h="100%">
          <Group h="100%">
            <Text size="xs" c="dimmed">
              {`© ${currentYear} Календарь звонков`}
            </Text>
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}
