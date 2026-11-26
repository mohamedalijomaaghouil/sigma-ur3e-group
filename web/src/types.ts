// Types mirroring progress.yaml and the generated project.json.

export type WpStatus = 'planned' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'deferred'
export type ImplStatus = 'not_started' | 'in_progress' | 'done'
export type CheckStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'not_applicable'
export type ValidationLevel = 'implementation' | 'offline' | 'simulation' | 'hardware'

export interface Deliverable {
  name: string
  acceptance?: string
  preliminary?: boolean
}

export interface Evidence {
  label: string
  path?: string
  url?: string
  commit?: string
}

export interface WorkPackage {
  id: string
  title: string
  block: string
  phase: number | null
  milestone: string | null
  status: WpStatus
  depends_on: string[]
  blocked_by: string[]
  packages: string[]
  graded_steps: string[]
  description: string
  deliverables: Deliverable[]
  validation: {
    implementation: ImplStatus
    offline: CheckStatus
    simulation: CheckStatus
    hardware: CheckStatus
  }
  evidence: Evidence[]
}

export interface Milestone {
  id: string
  title: string
  date: string
  work_packages: string[]
  description: string
}

export interface Phase {
  id: string
  title: string
  start: string
  end: string
  goal: string
}

export interface Package {
  name: string
  block: string
  phase: number | null
  status: string
  maintainer: string | null
  purpose: string
}

export interface Interface {
  name: string
  type: string
  from: string
  to: string[]
}

export interface Block {
  id: string
  name: string
  description: string
}

export interface OpenQuestion {
  id: string
  question: string
  blocks: string[]
  ask: string
  status: string
}

export interface Requirement {
  id: string
  title: string
  items: { text: string; work_packages: string[] }[]
  report: string
}

export interface Subsystem {
  id: string
  name: string
  work_packages: string[]
  primary: string
  alternatives: string[]
  references: string[]
  validation: string
  metrics: string[]
}

export interface Member {
  name: string
  responsibilities: string[]
}

export interface NextStep {
  title: string
  work_package?: string
  detail?: string
}

export interface Progress {
  schema_version: number
  updated: string
  maintainer?: string
  next_step?: NextStep
  project: {
    name: string
    title: string
    short_title: string
    institution: string
    summary: string
    use_case_steps: string[]
    development_levels: { id: string; name: string; status: string; note?: string }[]
    hardware: { item: string; status: string }[]
    software: { ros_distro: string; ros_distro_note: string; stack: string[] }
    demo: { date: string; status: string; note: string }
    repository: { url: string; working_branch: string; main_branch: string }
  }
  team: {
    note: string
    members: Member[]
    groups: { id: string; name: string; members: string[] }[]
  }
  blocks: Block[]
  packages: Package[]
  interfaces: Interface[]
  decisions: { id: string; title: string; status: string }[]
  decisions_note: string
  requirements: Requirement[]
  phases: Phase[]
  subsystems: Subsystem[]
  milestones: Milestone[]
  work_packages: WorkPackage[]
  open_questions: OpenQuestion[]
}

export interface ExperimentMethod {
  name: string
  role: 'primary' | 'alternative' | 'reference' | 'validation'
  metrics: Record<string, number | string | null>
}

export interface Experiment {
  schema_version: number
  subsystem: string
  experiment_id: string
  title: string
  date: string
  git_commit: string
  validation_level: 'offline' | 'simulation' | 'hardware'
  dataset: string
  methods: ExperimentMethod[]
  selected_method: string | null
  conclusion: string
  limitations: string[]
  folder: string
  plots: string[]
}

export interface Doc {
  slug: string
  path: string
  title: string
  content: string
}

export interface Commit {
  hash: string
  short: string
  author: string
  date: string
  subject: string
  refs: string[]
}

export interface Branch {
  name: string
  short: string
  date: string
  author: string
  subject: string
}

export interface ProjectData {
  generatedAt: string
  progress: Progress
  experiments: Experiment[]
  experimentErrors: { folder: string; error: string }[]
  docs: Doc[]
  git: {
    available: boolean
    branch: string
    commits: Commit[]
    branches: Branch[]
    aheadBehind: { base: string; ahead: number; behind: number } | null
    dirty: boolean
  }
}
