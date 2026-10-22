// Тонкий React-хук поверх сгенерированного SDK: тип события по id (:slug
// маршрута /book/:slug). Общая логика экранов выбора слота и формы записи:
// неизвестный slug — молчаливый редирект на каталог типов события (спека,
// раздел 5). Ответы идут через перехваченный fetch от мок-сервера.
import { useEffect, useState } from 'react';
import { getEventType } from '../api';
import type { EventType } from '../api';

export interface EventTypeState {
  /** null — тип события с таким id не найден (или ещё грузится). */
  eventType: EventType | null;
  loading: boolean;
}

export function useEventType(id: string | undefined): EventTypeState {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === undefined) {
      return;
    }
    let active = true;
    getEventType({ path: { id } })
      .then(({ data }) => {
        if (active) {
          setEventType(data ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setEventType(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { eventType, loading };
}
