# AGENTS.md

SPA для бронирования звонков (упрощённый Cal.com): TypeScript + Vite + React, UI — Mantine.

## Команды — только make

- Все операции через Makefile: `make install` / `make dev` / `make build` / `make lint` / `make test`. Не вызывай npm-скрипты напрямую.
- Цели генерации артефактов контракта: `make openapi` (spec/ → docs/openapi.yaml), `make sdk` (→ src/api/, hey-api), `make server` (→ server/, openapi-generator, нужен Java 11+), `make generate` — вся цепочка openapi → sdk → server. Сгенерированные `src/api/` и `server/` коммитятся; в type-check (`tsconfig.app.json`) и линт (`ignorePatterns` в .oxlintrc.json) не входят.
- `make test` сам запускает сборку: smoke-тест поднимает `vite preview` из `dist/`, без свежей сборки он падает.
- Линтер — **oxlint** (`.oxlintrc.json`), не eslint.

## Архитектура

- UI — строго Mantine (`@mantine/core`, `@mantine/hooks`, `@mantine/dates`, `@mantine/form`). Используй готовые компоненты и хуки: прежде чем писать свои стили, компоненты или хуки, сначала ищи готовое решение в библиотеке и предпочитай его.
- Стили Mantine подключаются один раз в `src/main.tsx`; `MantineProvider` — один раз в `src/App.tsx`. Не дублируй.
- `postcss.config.cjs` обязателен (postcss-preset-mantine); расширение `.cjs` — из-за `"type": "module"` в package.json.

## Тесты

- Компонентные тесты — vitest + @testing-library/react (`src/App.test.tsx`); окружение jsdom настроено в `vite.config.ts` (`test.environment`, `setupFiles: src/test/setup.ts` — мок `window.matchMedia` для MantineProvider).
- Globals в vitest выключены: `test`/`expect` импортируются в каждом файле, `cleanup()` и сброс history — вручную в `afterEach`.
- `make test` = юнит-тесты + smoke-тест (`vite preview` из свежего `dist/`, поэтому сборка обязательна).

## CI

- `.github/workflows/ci.yml`: lint → build → test → свежесть артефактов генерации (`make generate` + чистота git status по `docs/openapi.yaml`, `src/api`, `server/`) на каждый push/PR. Java в CI ставится явно (`actions/setup-java`, temurin 21).
- Не удаляй и не переименовывай `.github/workflows/hexlet-check.yml` и репозиторий — от них зависят проверки Хекслета.
- Релизы автоматизированы release-please: тип commit-сообщения (`feat`/`fix`) определяет версию релиза.

## Коммиты

- Строго Conventional Commits (`feat:`, `fix:`, `chore:` …), сообщения на английском. README и тексты UI — на русском.
