// Тонкий React-хук поверх сгенерированного SDK: предстоящие записи владельца
// (панель /admin, спека раздел 6.6) — список listBookings с фильтром upcoming:
// только записи, чей конец позже текущего момента (фильтр «на бэкенде»).
// reload перезагружает список после отмены записи. Ответы идут через
// перехваченный fetch от мок-сервера (ADR-0002).
import { useEffect, useState } from 'react';
import { listBookings } from '../api';
import type { Booking } from '../api';

export interface UpcomingBookingsState {
  bookings: Booking[];
  loading: boolean;
  /** Перезагрузка списка — после отмены записи. */
  reload: () => void;
}

export function useUpcomingBookings(): UpcomingBookingsState {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    listBookings({ query: { upcoming: true } })
      .then(({ data }) => {
        if (active) {
          setBookings(data ?? []);
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
  }, [tick]);

  return { bookings, loading, reload: () => setTick((value) => value + 1) };
}
