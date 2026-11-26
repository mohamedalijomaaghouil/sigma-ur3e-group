import { assetUrl, commitUrl, fmtDate, repoUrl } from '../data'
import type { EvidenceRecord } from '../types'
import { IconExternal } from './Icons'
import { Badge, Empty } from './ui'

const LEVEL_COLOR: Record<string, string> = { offline: 'var(--s-planned)', simulation: 'var(--b-parallel)', hardware: 'var(--s-done)' }

/** Approved evidence only; drafts are counted, not shown. */
export function EvidenceGallery({ items, emptyHint }: { items: EvidenceRecord[]; emptyHint?: string }) {
  const approved = items.filter((e) => e.status === 'approved')
  const drafts = items.length - approved.length
  if (approved.length === 0) {
    return (
      <Empty title="No approved evidence yet">
        {emptyHint ?? 'Pictures, screenshots, videos and plots appear here once their record in media/evidence/ is approved.'}
        {drafts > 0 && <div style={{ marginTop: 4 }}>{drafts} record{drafts === 1 ? '' : 's'} awaiting approval.</div>}
      </Empty>
    )
  }
  return (
    <>
      <div className="gallery">
        {approved.map((e) => {
          const isImage = e.file && /\.(png|jpe?g|svg|gif|webp)$/i.test(e.file)
          return (
            <article key={e.record} className="ev-card">
              <div className="ev-media">
                {isImage ? (
                  <a href={assetUrl(e.file!)} target="_blank" rel="noreferrer"><img src={assetUrl(e.file!)} alt={e.title} loading="lazy" /></a>
                ) : e.url ? (
                  <a className="ev-link" href={e.url} target="_blank" rel="noreferrer"><IconExternal /> {e.type === 'video' ? 'Open video' : 'Open link'}</a>
                ) : (
                  <span className="ev-link muted">{e.type}</span>
                )}
              </div>
              <div className="ev-body">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="chip">{e.task || '—'}</span>
                  {e.validation_level && <Badge color={LEVEL_COLOR[e.validation_level] ?? 'var(--s-planned)'}>{e.validation_level}</Badge>}
                </div>
                <b className="small" style={{ fontWeight: 600 }}>{e.title}</b>
                {e.description && <div className="tiny muted">{e.description}</div>}
                <div className="tiny muted row">
                  <span>{e.contributor || 'unknown contributor'}</span>
                  {e.date && <span>· {fmtDate(e.date)}</span>}
                  {e.git_commit && <a className="mono" href={commitUrl(e.git_commit)} target="_blank" rel="noreferrer">· {e.git_commit.slice(0, 7)}</a>}
                  {e.experiment && <a href={repoUrl(e.experiment)} target="_blank" rel="noreferrer">· experiment</a>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {drafts > 0 && <div className="tiny muted" style={{ marginTop: 8 }}>{drafts} more record{drafts === 1 ? '' : 's'} awaiting approval.</div>}
    </>
  )
}
