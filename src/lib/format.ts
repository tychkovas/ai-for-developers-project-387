// Форматирование дат и времени в UI: русская локализация и человекочитаемый
// формат вида «21 октября» / «11:00–11:15» (спека, раздел 1). Единое место
// форматирования — экраны не задают локальные форматы сами.
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

/** Дата вида «21 октября»: локальный ключ 'YYYY-MM-DD' или ISO-строка. */
export function formatDayMonth(value: string): string {
  return dayjs(value).locale('ru').format('D MMMM');
}

/** Время вида «11:00» в локальном часовом поясе. */
export function formatTime(value: string): string {
  return dayjs(value).format('HH:mm');
}

/** Интервал записи вида «11:00–11:15». */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}
