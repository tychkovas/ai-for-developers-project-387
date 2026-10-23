import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

// API-контракт «Календаря звонков» (карта #8, тикеты #9–#11).
// Утверждён владельцем (2026-10-21): сверка со спекой + коммит feat: approve api contract.
// Контракт как артефакты без живого бэкенда: ADR-0002.
// Источник внешнего поведения: docs/spec/app.md (утверждена 2026-10-21).
// Термины: GLOSSARY.md — «запись», «тип события», «слот», «гость», «владелец календаря».
@service(#{ title: "Календарь звонков" })
namespace CallScheduling;

// ===== Модели (спека, раздел 4: тип события, раздел 8: запись) =====

@doc("Тип события: данные, которые владелец календаря создаёт в админке (спека, раздел 4).")
model EventType {
  @doc("Уникальный идентификатор (латиница, цифры, дефис). На фронте — слаг роута /book/:id.")
  id: string;

  @doc("Название, например «Встреча 15 минут».")
  name: string;

  @doc("Описание для карточки в каталоге типов события.")
  description: string;

  @doc("Длительность в минутах. Сетка слотов — 15 минут: тип занимает ⌈durationMinutes / 15⌉ соседних слотов.")
  durationMinutes: int32;
}

@doc("Свободный слот для записи (спека, раздел 3): интервал в локальном времени, ISO 8601 со смещением.")
model Slot {
  @doc("Начало слота, ISO 8601 со смещением локального времени.")
  start: utcDateTime;

  @doc("Конец слота: начало плюс длительность типа события.")
  end: utcDateTime;
}

@doc("Запись (спека, раздел 8): гость записан на слот типа события.")
model Booking {
  @doc("Идентификатор записи.")
  id: string;

  @doc("Идентификатор типа события (EventType.id).")
  eventTypeId: string;

  @doc("Начало записи, ISO 8601 со смещением локального времени.")
  start: utcDateTime;

  @doc("Конец записи: начало плюс длительность типа события. Вычисляется при создании.")
  end: utcDateTime;

  @doc("Имя гостя, непустое.")
  guestName: string;

  @doc("Email гостя, проверяется формат.")
  guestEmail: string;
}

@doc("Тело создания типа события (спека, раздел 4): все поля, без вложенных структур.")
model CreateEventType {
  @doc("Уникальный идентификатор (латиница, цифры, дефис).")
  id: string;

  @doc("Название типа события.")
  name: string;

  @doc("Описание типа события.")
  description: string;

  @doc("Длительность в минутах.")
  durationMinutes: int32;
}

@doc("Тело создания записи (спека, раздел 6.4): гость приходит с выбранным слотом, end вычисляется.")
model CreateBooking {
  @doc("Идентификатор типа события (EventType.id).")
  eventTypeId: string;

  @doc("Начало выбранного слота, ISO 8601 со смещением.")
  start: utcDateTime;

  @doc("Имя гостя, непустое.")
  guestName: string;

  @doc("Email гостя, проверяется формат.")
  guestEmail: string;
}

// ===== Ошибки (спека + карта #8, тикет #10) =====

@doc("Машиночитаемый код ошибки: для программной ветки; сообщения для людей — русские.")
enum ErrorCode {
  @doc("Ресурс не найден: неизвестный id типа события или записи.")
  not_found,

  @doc("Ошибка валидации полей запроса: имя, email, id, длительность.")
  validation_failed,

  @doc("Конфликт уникальности: id типа события уже существует.")
  id_taken,

  @doc("Слот занят другой записью или уже прошёл.")
  slot_taken,
}

@doc("Общая схема ошибки: машиночитаемый код + русское человекочитаемое сообщение.")
model Error {
  @doc("Машиночитаемый код ошибки.")
  code: ErrorCode;

  @doc("Человекочитаемое сообщение на русском, пригодное для показа в UI.")
  message: string;
}

@doc("Неизвестный id типа события или записи (спека: неизвестный slug → каталог, невалидный slot → назад).")
@error
model NotFoundError extends Error {
  @statusCode status: 404;
}

@doc("Валидация полей тела запроса (спека 6.4: «Введите имя», «Введите корректный email»).")
@error
model ValidationError extends Error {
  @statusCode status: 400;
}

@doc("Конфликт: дубль id типа события (спека 6.6) или занятый/прошедший слот при создании записи.")
@error
model ConflictError extends Error {
  @statusCode status: 409;
}

// ===== Эндпоинты: сценарии гостя и владельца (спека, раздел 6) =====

@tag("EventTypes")
@route("/event-types")
@operationId("getEventTypes")
@doc("Каталог типов события (спека, раздел 6.2). Порядок — по возрастанию длительности.")
@get
op getEventTypes(): EventType[];

@tag("EventTypes")
@route("/event-types/{id}")
@operationId("getEventType")
@doc("Тип события по идентификатору (спека, раздел 6.3). Неизвестный id — 404.")
@get
op getEventType(@path id: string): EventType | NotFoundError;

@tag("EventTypes")
@route("/event-types")
@operationId("createEventType")
@doc(
  "Создание типа события владельцем календаря из админки (спека, раздел 6.6). Правка и удаление — вне скоупа. Некорректные поля — 400, дубль id — 409.",
)
@post
op createEventType(@body body: CreateEventType): EventType | ValidationError | ConflictError;

@tag("Slots")
@route("/event-types/{id}/slots")
@operationId("getAvailableSlots")
@doc(
  "Свободные слоты выбранного дня для типа события (спека, раздел 6.3). Включаются только рабочие дни в 14-дневном окне, не ближе часа от текущего момента и не занятые записями.",
)
@get
op getAvailableSlots(
  @path id: string,
  @query date: plainDate,
): Slot[] | NotFoundError;

@tag("Bookings")
@route("/bookings")
@operationId("createBooking")
@doc(
  "Создание записи на выбранный слот (спека, раздел 6.4). Конец вычисляется из длительности типа события. Занятый или прошедший слот — 409.",
)
@post
op createBooking(@body body: CreateBooking): Booking | ValidationError | NotFoundError | ConflictError;

@tag("Bookings")
@route("/bookings")
@operationId("listBookings")
@doc(
  "Панель «Предстоящие события» (спека, раздел 6.6): один список записей всех типов. Сортировка — по возрастанию начала. upcoming=true — только записи, чей конец позже текущего момента.",
)
@get
op listBookings(@query upcoming?: boolean): Booking[];

@tag("Bookings")
@route("/bookings/{id}")
@operationId("cancelBooking")
@doc("Отмена записи: полное удаление, слот мгновенно освобождается (спека, раздел 6.6).")
@delete
op cancelBooking(@path id: string): {
  @statusCode status: 204;
} | NotFoundError;
