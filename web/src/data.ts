import raw from './generated/project.json'
import type { CheckStatus, NextStep, ProjectData, ValidationLevel, WorkPackage, WpStatus } from './types'

export const data = raw as unknown as ProjectData
export const progress = data.progress

export const wpById = new Map(progress.work_packages.map((w) => [w.id, w]))
export const questionById = new Map(progress.open_questions.map((q) => [q.id, q]))
export const blockById = new Map(progress.blocks.map((b) => [b.id, b]))

export const WP_STATUS_ORDER: WpStatus[] = ['done', 'in_review', 'in_progress', 'blocked', 'planned', 'deferred']

export const WP_STATUS_LABEL: Record<WpStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  in_review: 'In review',
  blocked: 'Blocked',
  done: 'Done',
  deferred: 'Deferred',
}

export const CHECK_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  passed: 'Passed',
  failed: 'Failed',
  not_applicable: 'Not applicable',
}

export const LEVELS: { key: ValidationLevel; label: string; short: string }[] = [
  { key: 'implementation', label: 'Implementation', short: 'Impl' },
  { key: 'offline', label: 'Offline validation', short: 'Offline' },
  { key: 'simulation', label: 'Simulation validation', short: 'Sim' },
  { key: 'hardware', label: 'Hardware validation', short: 'HW' },
]

/** Normalise implementation status to the check vocabulary for display. */
export function levelStatus(wp: Pick<WorkPackage, 'validation'>, level: ValidationLevel): CheckStatus {
  const v = wp.validation[level]
  if (level === 'implementation') return v === 'done' ? 'passed' : (v as CheckStatus)
  return v as CheckStatus
}

/** Counts of checkpoints over all work packages (not_applicable excluded). */
export function checkpointStats(wps: Pick<WorkPackage, 'validation'>[]) {
  let applicable = 0
  let passed = 0
  let failed = 0
  let inProgress = 0
  for (const wp of wps) {
    for (const l of LEVELS) {
      const s = levelStatus(wp, l.key)
      if (s === 'not_applicable') continue
      applicable++
      if (s === 'passed') passed++
      else if (s === 'failed') failed++
      else if (s === 'in_progress') inProgress++
    }
  }
  return { applicable, passed, failed, inProgress }
}

export function levelStats(wps: Pick<WorkPackage, 'validation'>[], level: ValidationLevel) {
  let applicable = 0
  let passed = 0
  for (const wp of wps) {
    const s = levelStatus(wp, level)
    if (s === 'not_applicable') continue
    applicable++
    if (s === 'passed') passed++
  }
  return { applicable, passed }
}

export function countBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>()
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1)
  return m
}

export function parseDate(s: string) {
  // Dates in progress.yaml are plain YYYY-MM-DD; treat them as local dates.
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return parseDate(s).toLocaleDateString('en-GB', opts)
}

export function daysUntil(s: string, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseDate(s).getTime() - a.getTime()) / 86_400_000)
}

export function repoUrl(path?: string) {
  const base = progress.project.repository.url.replace(/\/$/, '')
  if (!path) return base
  return `${base}/blob/${progress.project.repository.working_branch}/${path}`
}

export function commitUrl(hash: string) {
  return `${progress.project.repository.url.replace(/\/$/, '')}/commit/${hash}`
}

/** Packages touched by each work package, for cross-links. */
export function workPackagesForPackage(pkg: string) {
  return progress.work_packages.filter((w) => w.packages.includes(pkg))
}

/**
 * Overall progress = validation checkpoints passed / applicable checkpoints,
 * over the graded work packages (optional extensions excluded).
 * A checkpoint is one level (implementation, offline, simulation, hardware) of one work package.
 */
export function overallProgress() {
  const core = progress.work_packages.filter((w) => w.block !== 'optional' && w.status !== 'deferred')
  const s = checkpointStats(core)
  const pct = s.applicable ? (100 * s.passed) / s.applicable : 0
  const wpDone = core.filter((w) => w.status === 'done').length
  return { ...s, pct, wpDone, wpTotal: core.length }
}

/** Next step: the one written in progress.yaml, otherwise the first open work package in milestone order. */
export function nextStep(): NextStep | null {
  if (progress.next_step?.title) return progress.next_step
  const msOrder = new Map(progress.milestones.map((m, i) => [m.id, i]))
  const open = progress.work_packages
    .filter((w) => !['done', 'deferred', 'blocked'].includes(w.status))
    .sort((a, b) => (msOrder.get(a.milestone ?? '') ?? 99) - (msOrder.get(b.milestone ?? '') ?? 99))
  const w = open.find((x) => x.status === 'in_progress' || x.status === 'in_review') ?? open[0]
  return w ? { title: w.title, work_package: w.id } : null
}

// ---------------------------------------------------------------- visual servoing groups
export const vsTaskById = new Map((progress.vs_tasks ?? []).map((t) => [t.id, t]))

export function tasksOf(group: string) {
  return (progress.vs_tasks ?? []).filter((t) => t.group === group)
}

export function groupProgress(group: string) {
  const tasks = tasksOf(group)
  const s = checkpointStats(tasks)
  return { ...s, pct: s.applicable ? (100 * s.passed) / s.applicable : 0, done: tasks.filter((t) => t.status === 'done').length, total: tasks.length }
}

/** First task of the group that is not done, in schedule order. */
export function nextTaskOf(group: string) {
  const order = new Map((progress.vs_schedule ?? []).map((w, i) => [w.week, i]))
  return tasksOf(group)
    .filter((t) => !['done', 'deferred'].includes(t.status))
    .sort((a, b) => (order.get(a.week) ?? 99) - (order.get(b.week) ?? 99))[0]
}

export function currentWeek(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return (progress.vs_schedule ?? []).find((w) => parseDate(w.start) <= d && d <= parseDate(w.end))
}

export const GROUP_SUBSYSTEMS: Record<string, string[]> = {
  ibvs: ['ibvs'],
  pbvs: ['pbvs', 'pose_estimation'],
  hybrid: ['hybrid', 'visual_servoing_benchmark'],
}

export function evidenceFor(group: string) {
  const subs = GROUP_SUBSYSTEMS[group] ?? [group]
  const prefix = group === 'hybrid' ? 'HYB-' : `${group.toUpperCase()}-`
  return (data.evidence ?? []).filter((e) => subs.includes(e.subsystem) || String(e.task ?? '').startsWith(prefix))
}

export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}repo/${path}`
}
