// Тонкий React-хук поверх модуля данных (спека, раздел 8):
// компоненты читают данные календаря только через хуки, не трогая
// localStorage напрямую. ensureSeed идемпотентен — безопасен на каждом чтении.
import { useState } from 'react';
import { ensureSeed, getEventTypes, type EventType } from './bookings';

export function useEventTypes(): EventType[] {
  const [eventTypes] = useState<EventType[]>(() => {
    ensureSeed();
    return getEventTypes();
  });
  return eventTypes;
}
