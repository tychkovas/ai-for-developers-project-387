# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/tychkovas/ai-for-developers-project-387/actions)

Интегрируйте работу агентов в GitHub проект

SPA для записи на звонки (упрощённый Cal.com), разрабатываемый совместно с ИИ.

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [React](https://react.dev/)
- [Mantine](https://mantine.dev/) — UI-библиотека
- [oxlint](https://oxc.rs/docs/guide/usage/linter) — линтер
- [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/) — тесты

## Установка

```bash
git clone https://github.com/tychkovas/ai-for-developers-project-387.git
cd ai-for-developers-project-387
make install
```

## Использование

```bash
# Запустить dev-сервер (http://localhost:5173)
make dev

# Проверить линтером (oxlint)
make lint

# Продакшен-сборка (tsc + vite build)
make build

# Тесты: юнит + smoke (сборка входит)
make test
```

## Docker и деплой

Приложение задеплоено на [Render](https://dashboard.render.com/web/srv-dbef5v67bikc7388h4kg) (Web Service, runtime Docker): https://ai-for-developers-project-387-pqz0.onrender.com

Конфигурация сервиса описана в [`render.yaml`](./render.yaml) (Render Blueprint): тип, runtime, план, регион, ветка и путь к Dockerfile. Правки деплоя идут через ревью вместе с кодом, а не остаются только в дашборде.

Приложение упаковано в Docker-образ: фронтенд собирается на первом этапе, а на втором копируются собранная статика, сервер статики (`serve.mjs`) и production-зависимости.

```bash
# Собрать образ (фронтенд + сервер статики)
make docker

# Запустить контейнер; приложение поднимается само и слушает порт из PORT
make docker-run                 # http://localhost:4173
PORT=8080 make docker-run       # задать свой порт
# либо напрямую
docker run --rm -p 8080:8080 -e PORT=8080 call-scheduling:latest
```

`serve.mjs` — минимальный Fastify-сервер: отдаёт файлы из `dist/`, для неизвестных маршрутов SPA подставляет `index.html` (роутинг на клиенте), запрещает выход за пределы `dist/`, а `index.html` отдаёт без долгого кеширования (у статики с хешем в имени — `immutable`).

## Артефакты API-контракта

Контракт описан в TypeSpec (`spec/main.tsp`) и генерируется в артефакты:

```bash
# Вся цепочка: spec/ -> docs/openapi.yaml -> src/api (SDK) -> server (стаб NestJS)
make generate

# По отдельности
make openapi   # TypeSpec -> docs/openapi.yaml
make sdk       # docs/openapi.yaml -> src/api/ (клиентский SDK, hey-api)
make server    # docs/openapi.yaml -> server/ (openapi-generator, нужен Java 11+)
```

Сгенерированные `docs/openapi.yaml`, `src/api/` и `server/` закоммичены и свежесть проверяется в CI. `src/api/` и `server/` — артефакты: они не компилируются и не линтуются.

Артефакты генерации утверждены владельцем (2026-10-22).

Локальный просмотр продакшен-сборки: `make preview` (аналог `npm run preview`)

## Автоматическое ревью pull request

На каждый pull request (`opened`, `synchronize`, `reopened`, `ready_for_review`) воркфлоу `.github/workflows/opencode-review.yml` запускает OpenCode: он читает diff и оставляет замечания к коду quality, потенциальным багам и несоответствиям конвенциям проекта (UI только на Mantine, проверки через `make lint` / `make build` / `make test`). Ревью работает в режиме только на чтение (`id-token: write`, `contents: read`): комментарии оставляет токен GitHub-приложения OpenCode (OIDC), агент ничего не коммитит и не пушит. Мержит и одобряет pull request по-прежнему человек. Для pull request, открытых агентом, ревью запускается вручную комментарием `/oc` (ограничение upstream: anomalyco/opencode#17224).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
