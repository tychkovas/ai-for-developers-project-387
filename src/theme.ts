// Тема приложения (issue «Улучши контрастность цветов темы Mantine»).
// Дефолтные цвета Mantine 9 в light-схеме не проходят WCAG AA (4.5:1
// для обычного текста, https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html):
// белый текст на primary-заливке и цвет ссылок (--mantine-color-anchor) —
// это оттенок 6 (blue-6, ~3.6:1 на белом), а «приглушённый» текст c="dimmed" —
// gray-6 (~3.3:1). Поэтому палитра brand повторяет дефолтный blue в светлых
// оттенках 0–5 (фоны, hover), но темнее в текстовых 6–9, а переменная
// --mantine-color-dimmed переопределяется на gray-7 (~8:1 на белом).
// Документация: https://mantine.dev/theming/create-theme/,
// https://mantine.dev/styles/mantine-css-vars/.
import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Оттенок 6 — фон filled-кнопок (белый текст, 5.0:1) и цвет ссылок на белом;
// оттенок 9 — текст light-вариантов кнопок на фоне оттенка 1 (9.3:1).
export const brand: MantineColorsTuple = [
  '#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7',
  '#339af0', '#1971c2', '#1864ab', '#134a80', '#0d3a66',
];

export const theme = createTheme({
  colors: { brand },
  primaryColor: 'brand',
});

// Переопределение дефолтных CSS-переменных — проп cssVariablesResolver
// у MantineProvider (в Mantine 9 резолвер не входит в createTheme).
export const cssVariablesResolver = () => ({
  variables: {},
  // В тёмной теме дефолтные цвета Mantine уже проходят WCAG AA — переопределение не требуется.
  dark: {},
  light: {
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
  },
});
