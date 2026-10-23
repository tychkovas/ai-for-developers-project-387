// Тонкий React-хук поверх сгенерированного SDK: свободные слоты всех дней
// 14-дневного окна для типа события. UI ходит в данные только через SDK;
// ответы идут через перехваченный fetch от мок-сервера (src/lib/mockServer.ts)
// поверх модуля данных bookings.ts (ADR-0002 — живого бэкенда нет).
// Окно записи — чистая логика модуля данных, без обращения к хранилищу.
import { useEffect, useState } from 'react';
import { getAvailableSlots } from '../api';
import type { Slot } from '../api';
import { bookingWindowDays } from './bookings';

export interface AvailableSlotsState {
  /** Слоты по дням окна: ключ 'YYYY-MM-DD' → список свободных слотов. */
  slotsByDate: Record<string, Slot[]> | null;
  loading: boolean;
}

export function useAvailableSlots(eventTypeId: string | undefined): AvailableSlotsState {
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Slot[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventTypeId === undefined) {
      return;
    }
    let active = true;
    const dates = bookingWindowDays();
    Promise.all(
      dates.map(async (date) => {
        const { data } = await getAvailableSlots({ path: { id: eventTypeId }, query: { date } });
        return [date, data ?? []] as const;
      }),
    )
      .then((entries) => {
        if (active) {
          setSlotsByDate(Object.fromEntries(entries));
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [eventTypeId]);

  return { slotsByDate, loading };
}
