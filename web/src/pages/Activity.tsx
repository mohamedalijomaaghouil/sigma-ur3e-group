import { Badge, Card, Empty, PageHead } from '../components/ui'
import { commitUrl, data, progress } from '../data'
import type { Commit } from '../types'

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Activity() {
  const g = data.git
  const byDay = new Map<string, Commit[]>()
  for (const c of g.commits) byDay.set(dayKey(c.date), [...(byDay.get(dayKey(c.date)) ?? []), c])
  const authors = new Map<string, number>()
  for (const c of g.commits) authors.set(c.author, (authors.get(c.author) ?? 0) + 1)

  return (
    <>
      <PageHead eyebrow="Knowledge" title="Repository activity">
        Read from the local Git clone when the dashboard data is synced (<code>npm run sync</code>). The GitHub API is not used (private repository); links open GitHub for members with access.
      </PageHead>

      {!g.available ? (
        <Empty title="Git history not available">Run the dashboard from inside the repository clone.</Empty>
      ) : (
        <>
          <div className="grid g4">
            <Card><div className="kpi"><div className="label">Current branch</div><div className="value mono" style={{ fontSize: 20 }}>{g.branch}</div><div className="tiny muted">{g.dirty ? 'Uncommitted changes when synced' : 'Clean working tree when synced'}</div></div></Card>
            <Card><div className="kpi"><div className="label">Ahead of {g.aheadBehind?.base ?? 'main'}</div><div className="value">{g.aheadBehind?.ahead ?? '—'}<small>commits</small></div><div className="tiny muted">Not merged into {progress.project.repository.main_branch}</div></div></Card>
            <Card><div className="kpi"><div className="label">Behind {g.aheadBehind?.base ?? 'main'}</div><div className="value">{g.aheadBehind?.behind ?? '—'}<small>commits</small></div><div className="tiny muted">As of the last fetch</div></div></Card>
            <Card><div className="kpi"><div className="label">Commits on this branch</div><div className="value">{g.commits.length}</div><div className="tiny muted">{authors.size} author{authors.size === 1 ? '' : 's'}</div></div></Card>
          </div>

          <div className="grid g-main-side">
            <Card title="Commit history" hint={`branch ${g.branch}`}>
              {[...byDay.entries()].map(([day, commits]) => (
                <div key={day} style={{ marginBottom: 10 }}>
                  <div className="eyebrow" style={{ margin: '6px 0 2px' }}>{day}</div>
                  {commits.map((c) => (
                    <div key={c.hash} className="commit">
                      <span className="node" />
                      <div style={{ minWidth: 0 }}>
                        <div className="subj">{c.subject}</div>
                        <div className="who row">
                          <span>{c.author}</span>
                          <span>· {new Date(c.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          {c.refs.map((r) => <span key={r} className={`ref${r.startsWith('HEAD') ? ' head' : ''}`}>{r}</span>)}
                        </div>
                      </div>
                      <a className="chip" href={commitUrl(c.hash)} target="_blank" rel="noreferrer">{c.short}</a>
                    </div>
                  ))}
                </div>
              ))}
            </Card>

            <div className="stack" style={{ gap: 16, alignContent: 'start' }}>
              <Card title="Branches" hint="local and remote-tracking">
                <div className="stack">
                  {g.branches.map((b) => (
                    <div key={b.name} className="stack" style={{ gap: 2 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="mono small">{b.name}</span>
                        {b.name === g.branch && <Badge color="var(--accent)">checked out</Badge>}
                      </div>
                      <div className="tiny muted">{b.short} · {new Date(b.date).toLocaleDateString('en-GB')} · {b.author} — {b.subject}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Contributors on this branch">
                <div className="stack">
                  {[...authors.entries()].map(([a, n]) => (
                    <div key={a} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="small">{a}</span><span className="mono small muted">{n}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}
