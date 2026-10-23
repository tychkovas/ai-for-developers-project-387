// Тонкий React-хук поверх сгенерированного SDK: компоненты получают данные
// API-вызовами — так же, как в живом приложении с бэкендом. Ответы идут через
// перехваченный fetch от мок-сервера (src/lib/mockServer.ts) поверх модуля
// данных bookings.ts (ADR-0002 — живого бэкенда нет).
import { useEffect, useState } from 'react';
import { getEventTypes } from '../api';
import type { EventType } from '../api';

export interface EventTypesState {
  eventTypes: EventType[];
  loading: boolean;
}

export function useEventTypes(): EventTypesState {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getEventTypes()
      .then(({ data }) => {
        if (!active) {
          return;
        }
        if (data) {
          setEventTypes(data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { eventTypes, loading };
}
