// Продакшн-сервер для раздачи собранного Vite-приложения из dist/.
// Работает на Fastify + @fastify/static; порт берётся из переменной окружения PORT.

import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { join } from 'node:path'

const PORT = Number(process.env.PORT) || 4173
// DIST_DIR переопределяется при необходимости; по умолчанию — dist/ рядом со скриптом.
const DIST_DIR = process.env.DIST_DIR || join(process.cwd(), 'dist')

const fastify = Fastify({ logger: true })

await fastify.register(fastifyStatic, {
  root: DIST_DIR,
  // Сборка Vite даёт хеш в имени файла — статику кешируем долго, index.html не кешируем.
  cacheControl: true,
  maxAge: '365d',
  immutable: true,
  index: ['index.html'],
  // Индекс и прочие HTML-файлы без хеша в имени не должны кешироваться надолго.
  setHeaders(reply, path) {
    if (path.endsWith('.html')) {
      reply.header('Cache-Control', 'no-cache')
    }
  },
})

// Fallback для маршрутов SPA (например /booking/123): отдаём index.html,
// роутинг дальше происходит на клиенте через react-router.
fastify.setNotFoundHandler((req, reply) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return reply.code(405).send('Method Not Allowed')
  }
  return reply.sendFile('index.html')
})

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
