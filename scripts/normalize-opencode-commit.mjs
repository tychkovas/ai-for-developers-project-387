// Пост-обработка после opencode: если бот оставил некорректную тему коммита
// или заголовок PR, переписываем их на безопасный английский Conventional Commits.
// Запуск: GH_TOKEN=... GITHUB_REPOSITORY=owner/repo ISSUE_NUMBER=... node scripts/normalize-opencode-commit.mjs

import { execFileSync } from 'node:child_process'
import { isValidCommitSubject, safeCommitSubject } from './conventional-commits.mjs'

const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
const repo = process.env.GITHUB_REPOSITORY
const issueNumber = process.env.ISSUE_NUMBER?.trim()
const defaultBranch = process.env.DEFAULT_BRANCH?.trim() || 'main'
const baseHead = process.env.BASE_HEAD?.trim()
const apiBase = (process.env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '')
const serverUrl = (process.env.GITHUB_SERVER_URL ?? 'https://github.com').replace(/\/$/, '')
const SEPARATOR = '\0'

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options }).trim()
}

function log(message) {
  console.log(`[normalize-opencode-commit] ${message}`)
}

function removeLocalExtraheader() {
  try {
    execFileSync('git', ['config', '--local', '--unset-all', `http.${serverUrl}/.extraheader`], {
      stdio: 'ignore',
    })
  } catch {
    // ключа нет — ничего не делаем
  }
}

if (!token || !repo) {
  console.error('[normalize-opencode-commit] GH_TOKEN и GITHUB_REPOSITORY обязательны')
  process.exit(1)
}

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])

if (!branch || branch === 'HEAD' || branch === defaultBranch) {
  log(`ветка ${branch}; нормализация не нужна`)
  process.exit(0)
}

if (branch.startsWith('opencode/pr')) {
  log(`ветка ${branch} относится к fork-PR; пропускаем`)
  process.exit(0)
}

const [headSha, subject, authorEmail] = git(['log', '-1', '--format=%H%x00%s%x00%ae']).split(SEPARATOR)
const isBotBranch = branch.startsWith('opencode/')
const isBotCommit = authorEmail.includes('opencode-agent')

if (baseHead) {
  if (headSha === baseHead) {
    log(`новых коммитов после opencode нет (HEAD ${headSha.slice(0, 7)}); пропускаем`)
    process.exit(0)
  }
} else if (!isBotBranch && !isBotCommit) {
  log(`HEAD ${headSha.slice(0, 7)} не принадлежит боту; пропускаем`)
  process.exit(0)
}

let currentSubject = subject
let commitChanged = false

if (!isValidCommitSubject(subject)) {
  const fallbackSubject = safeCommitSubject(issueNumber)
  log(`некорректная тема коммита: "${subject}" -> "${fallbackSubject}"`)

  const fullMessage = execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' })
  const body = fullMessage.split('\n').slice(1).join('\n').replace(/^\n+/, '').trimEnd()
  const message = body ? `${fallbackSubject}\n\n${body}` : fallbackSubject

  execFileSync('git', ['commit', '--amend', '--no-verify', '-m', message], { stdio: 'inherit' })
  currentSubject = fallbackSubject
  commitChanged = true
}

const pullRequest = await findPullRequest(branch, token)
const titleNeedsUpdate = Boolean(pullRequest && !isValidCommitSubject(pullRequest.title))

if (!commitChanged && !titleNeedsUpdate) {
  log('commit subject и заголовок PR уже соответствуют Conventional Commits')
  process.exit(0)
}

const pushToken = await getPushToken()

if (commitChanged) {
  removeLocalExtraheader()
  const basicAuth = Buffer.from(`x-access-token:${pushToken}`).toString('base64')
  execFileSync(
    'git',
    [
      'push',
      `${serverUrl}/${repo}.git`,
      `HEAD:refs/heads/${branch}`,
      `--force-with-lease=refs/heads/${branch}:${headSha}`,
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: `http.${serverUrl}/.extraheader`,
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basicAuth}`,
      },
    },
  )
  log('коммит переписан и отправлен в origin')
}

if (pullRequest && titleNeedsUpdate) {
  const title = isValidCommitSubject(currentSubject) ? currentSubject : safeCommitSubject(issueNumber)
  log(`некорректный заголовок PR #${pullRequest.number}: "${pullRequest.title}" -> "${title}"`)
  await github(`/repos/${repo}/pulls/${pullRequest.number}`, pushToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  log(`заголовок PR #${pullRequest.number} обновлён`)
}

async function getPushToken() {
  const oidcUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const oidcRequestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN

  if (!oidcUrl || !oidcRequestToken) return token

  try {
    const oidcResponse = await fetch(`${oidcUrl}&audience=opencode-github-action`, {
      headers: { Authorization: `Bearer ${oidcRequestToken}` },
    })
    if (!oidcResponse.ok) throw new Error(`OIDC ${oidcResponse.status}`)

    const { value } = await oidcResponse.json()
    const exchangeResponse = await fetch('https://api.opencode.ai/exchange_github_app_token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${value}` },
    })
    if (!exchangeResponse.ok) throw new Error(`exchange ${exchangeResponse.status}`)

    const { token: appToken } = await exchangeResponse.json()
    if (!appToken) throw new Error('пустой токен')

    log('используем токен opencode GitHub App (push запустит CI)')
    return appToken
  } catch (error) {
    log(`не удалось получить токен приложения, используем GITHUB_TOKEN: ${error.message}`)
    return token
  }
}

async function findPullRequest(branchName, authToken) {
  const [owner] = repo.split('/')
  const query = new URLSearchParams({ head: `${owner}:${branchName}`, state: 'open' })
  const pullRequests = await github(`/repos/${repo}/pulls?${query}`, authToken)
  return pullRequests[0] ?? null
}

async function github(path, authToken, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${authToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`)
  }

  return response.json()
}
