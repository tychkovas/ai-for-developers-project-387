# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/tychkovas/ai-for-developers-project-387/actions)
[![Weekly Lighthouse Audit (Cursor)](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-nightly-audit.yml/badge.svg)](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-nightly-audit.yml)

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

## Агенты в GitHub

В репозитории работают автономные агенты в GitHub Actions: разбирают issue и pull request по команде в комментарии, делают ревью PR, триажат новые issue, раз в неделю смотрят TODO, по расписанию снимают Lighthouse и заводят issue, по запросу диагностируют деплой на Render.

Общие правила: события от ботов пропускаются (иначе ответ снова ставит прогон в очередь); в публичном репозитории интерактивную команду принимают владелец, участник организации и коллаборатор; UI только на Mantine; проверки через `make lint` / `make build` / `make test`; ответы и комментарии — на русском; commit subject и PR title — English Conventional Commits (`<type>: <subject>`). Мержит и одобряет pull request человек.

Команды вызова в комментарии: `/opencode`, `/oc`, `/cursor`, `/cu` — все запускают текущий интерактивный workflow (исторические алиасы сохранены). Pull request, открытый ботом, автоматическое ревью пропускает: для него ревью запускают той же командой.

| Воркфлоу | Событие | Назначение | Прогоны |
| --- | --- | --- | --- |
| [cursor.yml](.github/workflows/cursor.yml) | комментарий с `/opencode`, `/oc`, `/cursor` или `/cu` | разобрать issue или PR; по просьбе закоммитить и открыть PR | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor.yml) |
| [cursor-review.yml](.github/workflows/cursor-review.yml) | PR: opened, synchronize, reopened, ready_for_review | замечания к diff (Mantine, `make lint` / `make build` / `make test`), без коммитов | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-review.yml) |
| [cursor-triage.yml](.github/workflows/cursor-triage.yml) | новая issue, аккаунт старше 30 дней | ссылки на документацию, если есть ясный фикс; иначе молчит | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-triage.yml) |
| [cursor-scheduled.yml](.github/workflows/cursor-scheduled.yml) | каждый понедельник, 09:00 UTC | сводка TODO и issue, если есть что чинить | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-scheduled.yml) |
| [cursor-nightly-audit.yml](.github/workflows/cursor-nightly-audit.yml) | каждый понедельник, 21:00 Asia/Dubai, и вручную | issue с метриками Lighthouse | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-nightly-audit.yml) |
| [cursor-deploy.yml](.github/workflows/cursor-deploy.yml) | вручную, workflow_dispatch | диагностика последнего деплоя на Render | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/cursor-deploy.yml) |

### Сейчас

- Активный рантайм: **Cursor CLI** (`agent` в GitHub Actions), модель `composer-2.5`, секрет `CURSOR_API_KEY`.
- Ревью и комментарии пишутся через `GITHUB_TOKEN` и `gh`.
- Render MCP для активного рантайма: [`.cursor/mcp.json`](./.cursor/mcp.json) и секрет `RENDER_API_KEY`.
- Отключённый стек OpenCode: `opencode*.yml` / `deploy.yml` / `nightly-audit.yml` с `if: false`; конфиг [`opencode.json`](./opencode.json) (в т.ч. `"share": "disabled"`) нужен при повторном включении (`OPENCODE_API_KEY`).
- Снимок эпохи OpenCode: ветка [`main-opencode`](https://github.com/tychkovas/ai-for-developers-project-387/tree/main-opencode).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
