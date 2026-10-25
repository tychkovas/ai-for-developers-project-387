// Проверяет темы коммитов в диапазоне BASE_SHA..HEAD на Conventional Commits.
// Запуск: BASE_SHA=<sha> node scripts/check-commit-subjects.mjs
// Без BASE_SHA проверяется origin/<DEFAULT_BRANCH>..HEAD (по умолчанию origin/main..HEAD).

import { execFileSync } from 'node:child_process'
import { isValidCommitSubject } from './conventional-commits.mjs'

const ZERO_SHA = /^0+$/
const SEPARATOR = '\0'

function resolveBase() {
  const base = process.env.BASE_SHA?.trim()
  if (base && !ZERO_SHA.test(base)) return base
  return `origin/${process.env.DEFAULT_BRANCH?.trim() || 'main'}`
}

const range = `${resolveBase()}..HEAD`
console.log(`Проверяем темы коммитов в диапазоне ${range}`)

const output = execFileSync('git', ['log', '--no-merges', '--format=%H%x00%s', range], {
  encoding: 'utf8',
}).trim()

if (!output) {
  console.log('Нет коммитов для проверки')
  process.exit(0)
}

const commits = output.split('\n').map((line) => {
  const [sha, subject] = line.split(SEPARATOR)
  return { sha, subject }
})
const invalid = commits.filter(({ subject }) => !isValidCommitSubject(subject))

if (invalid.length > 0) {
  console.error('Некорректные темы коммитов. Ожидается английский Conventional Commits, например `feat: add booking form`:')
  for (const { sha, subject } of invalid) {
    console.error(`  ${sha.slice(0, 7)} ${subject}`)
  }
  process.exit(1)
}

console.log(`OK: проверено коммитов — ${commits.length}`)
