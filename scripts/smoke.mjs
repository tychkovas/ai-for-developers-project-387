// Дымовой тест: приложение собирается, поднимается (vite preview) и отвечает.
// Запуск: node scripts/smoke.mjs (требуется собранный dist/ — `npm run build`).

import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`
const TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 300

if (!existsSync('dist/index.html')) {
  console.error('Smoke FAILED: dist/ не найден — сначала выполните `npm run build`')
  process.exit(1)
}

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'inherit', 'inherit'],
})

let serverExitCode = null
server.on('exit', (code) => {
  serverExitCode = code
})
server.on('error', (err) => {
  console.error(`Smoke FAILED: не удалось запустить preview-сервер: ${err.message}`)
  process.exit(1)
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForServer() {
  const deadline = Date.now() + TIMEOUT_MS
  let lastError = new Error('нет попыток запроса')

  while (Date.now() < deadline) {
    if (serverExitCode !== null) {
      throw new Error(`preview-сервер завершился раньше времени (код ${serverExitCode}); возможно, порт ${PORT} занят`)
    }
    try {
      const res = await fetch(`${BASE_URL}/`)
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(`сервер не ответил за ${TIMEOUT_MS}мс: ${lastError.message}`)
}

function shutdown(code) {
  if (serverExitCode !== null) {
    process.exit(code)
  }
  server.kill('SIGTERM')
  server.on('exit', () => process.exit(code))
  setTimeout(() => process.exit(code), 5_000).unref()
}

try {
  const res = await waitForServer()
  const html = await res.text()

  if (!html.includes('<div id="root">')) {
    throw new Error('в HTML нет корневого элемента <div id="root">')
  }

  console.log(`Smoke OK: ${BASE_URL}/ → HTTP ${res.status}, каркас приложения на месте`)
  shutdown(0)
} catch (err) {
  console.error(`Smoke FAILED: ${err.message}`)
  shutdown(1)
}
