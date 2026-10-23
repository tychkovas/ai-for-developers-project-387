import { defineConfig } from '@hey-api/openapi-ts';

// Клиентский SDK генерируется из OpenAPI-артефакта (ADR-0002: контракт как артефакты).
// Вход: docs/openapi.yaml (генерируется make openapi), выход: src/api/ (коммитится).
// Путь начинается с "./" — иначе hey-api парсит строку как shorthand реестра organization/project.
// Клиент — @hey-api/client-fetch (дефолт hey-api, плагин не задаётся явно).
export default defineConfig({
  input: './docs/openapi.yaml',
  output: 'src/api',
});
