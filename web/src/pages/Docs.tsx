import { Marked, type Tokens } from 'marked'
import { useEffect, useMemo, useRef } from 'react'
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card, PageHead } from '../components/ui'
import { data, repoUrl } from '../data'

const docByPath = new Map(data.docs.map((d) => [d.path, d]))

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\- _]/gu, '')
    .replace(/ /g, '-')
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Resolve a link found in `fromPath` (repo-relative) to a repo-relative path. */
function resolvePath(fromPath: string, href: string) {
  const parts = fromPath.split('/').slice(0, -1)
  for (const seg of href.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg && seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

function makeRenderer(currentPath: string) {
  return new Marked({
    gfm: true,
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { tokens, depth, text }: Tokens.Heading) {
        const id = slugify(text.replace(/`/g, ''))
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`
      },
      code({ text, lang }: Tokens.Code) {
        const cls = lang === 'mermaid' ? ' class="mermaid-src"' : ''
        const label = lang === 'mermaid' ? '<div class="tiny muted" style="margin:-4px 0 6px">Mermaid diagram (rendered on GitHub)</div>' : ''
        return `${label}<pre${cls}><code>${escapeHtml(text)}</code></pre>`
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { href, tokens, title }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens)
        const t = title ? ` title="${escapeHtml(title)}"` : ''
        if (/^[a-z]+:/i.test(href)) return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer"${t}>${inner}</a>`
        const [pathPart, anchor = ''] = href.split('#')
        if (!pathPart) return `<a href="#" data-anchor="${escapeHtml(anchor)}"${t}>${inner}</a>`
        const target = resolvePath(currentPath, pathPart)
        const doc = docByPath.get(target)
        if (doc) return `<a href="#" data-doc="${doc.slug}" data-anchor="${escapeHtml(anchor)}"${t}>${inner}</a>`
        return `<a href="${escapeHtml(repoUrl(target))}" target="_blank" rel="noreferrer"${t}>${inner}</a>`
      },
    },
  })
}

export default function Docs() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const doc = data.docs.find((d) => d.slug === (slug ?? 'readme')) ?? data.docs[0]
  const html = useMemo(() => (doc ? (makeRenderer(doc.path).parse(doc.content) as string) : ''), [doc])
  const anchor = params.get('h')

  useEffect(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo(0, 0)
  }, [anchor, doc?.slug])

  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
    if (!a || (!a.dataset.doc && a.dataset.anchor === undefined)) return
    e.preventDefault()
    const target = a.dataset.doc ?? doc.slug
    const h = a.dataset.anchor
    navigate(`/docs/${target}${h ? `?h=${encodeURIComponent(h)}` : ''}`)
  }

  if (!doc) return <PageHead title="Documentation">No documents found.</PageHead>

  return (
    <>
      <PageHead eyebrow="Knowledge" title="Technical documentation"
        right={<a className="btn" href={repoUrl(doc.path)} target="_blank" rel="noreferrer">View {doc.path} on GitHub</a>}>
        Rendered from the Markdown files in the repository. Edit the files, not this page.
      </PageHead>
      <div className="docs-wrap">
        <Card className="docs-nav">
          {data.docs.map((d) => (
            <NavLink key={d.slug} to={`/docs/${d.slug}`} className={() => (d.slug === doc.slug ? 'active' : '')}>
              {d.title.replace(/^UR3e Assistive Bottle Opening$/, 'README')}
              <div className="tiny muted mono">{d.path}</div>
            </NavLink>
          ))}
        </Card>
        <section className="card md" ref={ref} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  )
}
