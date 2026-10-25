// Тесты контрастности темы (issue «Улучши контрастность цветов темы Mantine»):
// фиксируем эталонные значения WCAG AA (4.5:1 для обычного текста) для
// сочетаний, которые реально встречаются в UI: белый текст на primary-заливке
// (filled-кнопки), цвет ссылок (anchor), текст light-вариантов кнопок и
// «приглушённый» текст c="dimmed". Расчёт — по формулам WCAG 2.2
// (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
import { cleanup, render } from '@testing-library/react';
import { DEFAULT_THEME } from '@mantine/core';
import { afterEach, expect, test } from 'vitest';
import App from './App';
import { brand, cssVariablesResolver } from './theme';

afterEach(() => {
  cleanup();
});

/** Относительная яркость hex-цвета (#rrggbb) по WCAG 2.2. */
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Контраст двух hex-цветов по WCAG (от 1 до 21). */
function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('белый текст на primary-заливке (filled-кнопки, brand-6) проходит WCAG AA', () => {
  expect(contrast('#ffffff', brand[6])).toBeGreaterThanOrEqual(4.5);
});

test('hover primary-заливки (brand-7) остаётся читаемым для белого текста', () => {
  expect(contrast('#ffffff', brand[7])).toBeGreaterThanOrEqual(4.5);
});

test('цвет ссылок (anchor = brand-6) на белом фоне проходит WCAG AA', () => {
  // Дефолтный blue-6 (#228be6) даёт ~3.6:1 — потому бренд темнее с оттенка 6.
  expect(contrast(DEFAULT_THEME.colors.blue[6], '#ffffff')).toBeLessThan(4.5);
  expect(contrast(brand[6], '#ffffff')).toBeGreaterThanOrEqual(4.5);
});

test('текст light-вариантов (brand-9 на фоне brand-1) проходит WCAG AA', () => {
  expect(contrast(brand[9], brand[1])).toBeGreaterThanOrEqual(4.5);
});

test('c="dimmed" в light-схеме переопределён на gray-7: дефолт не проходит AA, замена проходит', () => {
  // Дефолтный dimmed — gray-6 (~3.3:1 на белом).
  expect(contrast(DEFAULT_THEME.colors.gray[6], '#ffffff')).toBeLessThan(4.5);
  expect(contrast(DEFAULT_THEME.colors.gray[7], '#ffffff')).toBeGreaterThanOrEqual(4.5);
  expect(cssVariablesResolver().light['--mantine-color-dimmed']).toBe(
    'var(--mantine-color-gray-7)',
  );
});

test('приложение прокидывает тему и резолвер в MantineProvider: dimmed-переопределение попадает в CSS', () => {
  render(<App />);

  const styles = Array.from(document.querySelectorAll('style[data-mantine-styles]')).map(
    (style) => style.textContent ?? '',
  );
  expect(
    styles.some((css) => css.includes('--mantine-color-dimmed: var(--mantine-color-gray-7)')),
  ).toBe(true);
});
