// Единые правила для тем коммитов и заголовков PR: английский Conventional Commits.

const TYPES = ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test']
const SUBJECT_PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9][a-z0-9._/-]*\\))?!?: \\S.*$`)
const CYRILLIC_PATTERN = /[А-Яа-яЁё]/

export function isConventionalSubject(subject) {
  return SUBJECT_PATTERN.test(subject)
}

export function isEnglishSubject(subject) {
  return !CYRILLIC_PATTERN.test(subject)
}

export function isValidCommitSubject(subject) {
  return isConventionalSubject(subject) && isEnglishSubject(subject)
}

export function safeCommitSubject(issueNumber) {
  return issueNumber
    ? `chore: apply opencode agent changes (#${issueNumber})`
    : 'chore: apply opencode agent changes'
}
