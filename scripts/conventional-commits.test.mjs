// Тесты общих правил Conventional Commits для коммитов и заголовков PR.
import { expect, test } from 'vitest'
import { isValidCommitSubject, safeCommitSubject } from './conventional-commits.mjs'

test.each([
  'feat: add booking form',
  'fix(api): handle slot conflict',
  'chore: apply opencode agent changes (#16)',
  'feat!: drop legacy api',
])('принимает корректный subject: %s', (subject) => {
  expect(isValidCommitSubject(subject)).toBe(true)
})

test.each([
  'Бейдж Beta добавлен в шапку',
  'feat: добавить бейдж',
  'random message',
  'feat:',
  'FEAT: uppercase type',
])('отклоняет некорректный subject: %s', (subject) => {
  expect(isValidCommitSubject(subject)).toBe(false)
})

test('safe subject содержит номер issue', () => {
  expect(safeCommitSubject('16')).toBe('chore: apply opencode agent changes (#16)')
  expect(safeCommitSubject()).toBe('chore: apply opencode agent changes')
})
