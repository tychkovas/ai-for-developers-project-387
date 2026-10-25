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

## Агенты OpenCode в GitHub

Интерактивный воркфлоу слушает комментарии к issue и pull request, но запускается только на команду `/opencode` или `/oc`: набор задан параметром `mentions`, а не дефолтом экшена. События от ботов пропускаются, иначе ответ агента снова ставит прогон в очередь. В публичном репозитории команду принимают владелец, участник организации и коллаборатор.

Обе модели из линейки flash: разбор issue, правки по комментарию и отчёт Lighthouse идут на `glm-5.3-flash`, ревью diff, обход TODO и диагностика деплоя — на `deepseek-v4.1-flash`.

| Воркфлоу | Событие | Модель | Назначение | Прогоны |
| --- | --- | --- | --- | --- |
| [opencode.yml](.github/workflows/opencode.yml) | комментарий с `/opencode` или `/oc` | `opencode/glm-5.3-flash` | разобрать issue или PR; по просьбе закоммитить и открыть PR | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/opencode.yml) |
| [opencode-review.yml](.github/workflows/opencode-review.yml) | PR: opened, synchronize, reopened, ready_for_review | `opencode/deepseek-v4.1-flash` | замечания к diff (Mantine, `make lint` / `make build` / `make test`), без коммитов | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/opencode-review.yml) |
| [opencode-triage.yml](.github/workflows/opencode-triage.yml) | новая issue, аккаунт старше 30 дней | `opencode/glm-5.3-flash` | ссылки на документацию, если есть ясный фикс; иначе молчит | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/opencode-triage.yml) |
| [opencode-scheduled.yml](.github/workflows/opencode-scheduled.yml) | каждый понедельник, 09:00 UTC | `opencode/deepseek-v4.1-flash` | сводка TODO и issue, если есть что чинить | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/opencode-scheduled.yml) |
| [nightly-audit.yml](.github/workflows/nightly-audit.yml) | каждый день в 17:08 UTC и вручную | `opencode/glm-5.3-flash` | issue с метриками Lighthouse | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/nightly-audit.yml) |
| [deploy.yml](.github/workflows/deploy.yml) | вручную, workflow_dispatch | `opencode/deepseek-v4.1-flash` | диагностика последнего деплоя на Render | [Actions](https://github.com/tychkovas/ai-for-developers-project-387/actions/workflows/deploy.yml) |

Ревью читает код и пишет комментарий токеном GitHub-приложения (OIDC, `contents: read`). Мержит и одобряет pull request человек. Pull request, открытый ботом, автоматическое ревью пропускает ([anomalyco/opencode#17224](https://github.com/anomalyco/opencode/issues/17224)): для него ревью запускают комментарием `/opencode` или `/oc`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
