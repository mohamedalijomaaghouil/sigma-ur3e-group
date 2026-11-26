// Collects project data from the repository into src/generated/project.json.
// Sources: progress.yaml, experiments/**/metrics.json, docs/*.md, README.md, local git history.
// Nothing here is invented: missing sources produce empty sections.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const outFile = join(here, '..', 'src', 'generated', 'project.json')

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function readProgress() {
  const file = join(root, 'progress.yaml')
  return YAML.parse(readFileSync(file, 'utf8'))
}

function findMetrics(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) findMetrics(full, acc)
    else if (name === 'metrics.json') acc.push(full)
  }
  return acc
}

function readExperiments() {
  const experiments = []
  const errors = []
  for (const file of findMetrics(join(root, 'experiments'))) {
    const folder = relative(root, dirname(file))
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'))
      const plotsDir = join(dirname(file), 'plots')
      const plots = existsSync(plotsDir)
        ? readdirSync(plotsDir).filter((f) => /\.(png|svg|jpg|jpeg)$/i.test(f)).map((f) => `${folder}/plots/${f}`)
        : []
      experiments.push({ ...data, folder, plots })
    } catch (e) {
      errors.push({ folder, error: String(e) })
    }
  }
  experiments.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  return { experiments, errors }
}

function readDocs() {
  const docs = []
  const readme = join(root, 'README.md')
  if (existsSync(readme)) docs.push({ slug: 'readme', path: 'README.md', content: readFileSync(readme, 'utf8') })
  const order = ['architecture', 'conventions', 'decisions', 'roadmap', 'workflow', 'SETUP', 'PLAN']
  const docsDir = join(root, 'docs')
  if (existsSync(docsDir)) {
    const files = readdirSync(docsDir).filter((f) => f.endsWith('.md'))
    files.sort((a, b) => {
      const ia = order.indexOf(a.replace(/\.md$/, ''))
      const ib = order.indexOf(b.replace(/\.md$/, ''))
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
    })
    for (const f of files) {
      docs.push({ slug: f.replace(/\.md$/, '').toLowerCase(), path: `docs/${f}`, content: readFileSync(join(docsDir, f), 'utf8') })
    }
  }
  for (const d of docs) {
    const title = d.content.match(/^#\s+(.+)$/m)
    d.title = title ? title[1].trim() : d.path
  }
  return docs
}

function readGit() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const sep = '\x1f'
  const raw = git(['log', '-n', '150', `--pretty=format:%H${sep}%h${sep}%an${sep}%aI${sep}%s${sep}%D`])
  const commits = raw
    ? raw.split('\n').map((line) => {
        const [hash, short, author, date, subject, refs] = line.split(sep)
        return { hash, short, author, date, subject, refs: refs ? refs.split(', ').filter(Boolean) : [] }
      })
    : []
  const branchesRaw = git([
    'for-each-ref',
    '--sort=-committerdate',
    `--format=%(refname:short)${sep}%(objectname:short)${sep}%(committerdate:iso-strict)${sep}%(authorname)${sep}%(subject)`,
    'refs/heads',
    'refs/remotes',
  ])
  const branches = branchesRaw
    ? branchesRaw
        .split('\n')
        .map((line) => {
          const [name, short, date, author, subject] = line.split(sep)
          return { name, short, date, author, subject }
        })
        .filter((b) => !b.name.endsWith('/HEAD') && b.name !== 'origin')
    : []
  let aheadBehind = null
  const counts = git(['rev-list', '--left-right', '--count', 'origin/main...HEAD'])
  if (counts) {
    const [behind, ahead] = counts.split(/\s+/).map(Number)
    aheadBehind = { base: 'origin/main', ahead, behind }
  }
  const dirty = git(['status', '--porcelain']).length > 0
  return { available: commits.length > 0, branch, commits, branches, aheadBehind, dirty }
}

const progress = readProgress()

// Guard against a classic YAML pitfall: an unquoted comma inside {...} silently creates an empty key.
const NULLABLE = new Set(['maintainer', 'milestone', 'phase', 'selected_method'])
const suspicious = []
;(function walk(o, path) {
  if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${path}[${i}]`))
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      if (v === null && !NULLABLE.has(k)) suspicious.push(`${path}.${k}`)
      walk(v, `${path}.${k}`)
    }
})(progress, 'progress')
if (suspicious.length) {
  console.error('sync-data: progress.yaml has empty keys (quote values that contain commas):\n  ' + suspicious.join('\n  '))
  process.exit(1)
}
const { experiments, errors } = readExperiments()
const data = {
  generatedAt: new Date().toISOString(),
  progress,
  experiments,
  experimentErrors: errors,
  docs: readDocs(),
  git: readGit(),
}

// Copy experiment plots so the dashboard can display them (public/repo/ is generated, not committed).
const publicRepo = join(here, '..', 'public', 'repo')
rmSync(publicRepo, { recursive: true, force: true })
for (const e of experiments) {
  for (const plot of e.plots) {
    const dest = join(publicRepo, plot)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(root, plot), dest)
  }
}

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(data, null, 2))
console.log(
  `sync-data: ${progress.work_packages?.length ?? 0} work packages, ${experiments.length} experiments, ` +
    `${data.docs.length} docs, ${data.git.commits.length} commits -> ${relative(root, outFile)}`,
)
