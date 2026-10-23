// Тонкий React-хук поверх сгенерированного SDK: запись по id вместе с её типом
// события — сводка экрана успеха (/success/:id, спека раздел 6.5). В API-
// контракте нет GET /bookings/{id}, поэтому запись ищется в списке listBookings.
// Ответы идут через перехваченный fetch от мок-сервера (ADR-0002).
import { useEffect, useState } from 'react';
import { getEventType, listBookings } from '../api';
import type { Booking, EventType } from '../api';

export interface BookingState {
  /** null — запись с таким id не найдена (или ещё грузится). */
  booking: Booking | null;
  /** Тип события записи; null — не найден. */
  eventType: EventType | null;
  loading: boolean;
}

export function useBooking(id: string | undefined): BookingState {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === undefined) {
      return;
    }
    let active = true;
    listBookings()
      .then(async ({ data }) => {
        const found = data?.find((item) => item.id === id) ?? null;
        if (!found) {
          return null;
        }
        const { data: type } = await getEventType({ path: { id: found.eventTypeId } });
        return { booking: found, eventType: type ?? null };
      })
      .then((result) => {
        if (active) {
          setBooking(result?.booking ?? null);
          setEventType(result?.eventType ?? null);
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
  }, [id]);

  return { booking, eventType, loading };
}
