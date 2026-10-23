// Общий индикатор загрузки данных API (каталог, заглушка выбора слота).
import { Group, Loader, Text } from '@mantine/core';

export function LoadingRow() {
  return (
    <Group>
      <Loader size="sm" />
      <Text c="dimmed">Загрузка…</Text>
    </Group>
  );
}
