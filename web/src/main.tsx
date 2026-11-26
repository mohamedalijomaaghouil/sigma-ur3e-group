import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Activity from './pages/Activity'
import Architecture from './pages/Architecture'
import Comparison from './pages/Comparison'
import Evidence from './pages/Evidence'
import VsGroupPage from './pages/VsGroupPage'
import Docs from './pages/Docs'
import Overview from './pages/Overview'
import Progress from './pages/Progress'
import Results from './pages/Results'
import Roadmap from './pages/Roadmap'
import Team from './pages/Team'
import 'katex/dist/katex.min.css'
import './styles.css'

// Apply the saved theme before the first paint.
document.documentElement.dataset.theme =
  localStorage.getItem('ur3e-theme') ?? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="progress" element={<Progress />} />
          <Route path="team" element={<Team />} />
          <Route path="ibvs" element={<VsGroupPage key="ibvs" group="ibvs" />} />
          <Route path="pbvs" element={<VsGroupPage key="pbvs" group="pbvs" />} />
          <Route path="comparison" element={<Comparison />} />
          <Route path="evidence" element={<Evidence />} />
          <Route path="results" element={<Results />} />
          <Route path="docs" element={<Docs />} />
          <Route path="docs/:slug" element={<Docs />} />
          <Route path="activity" element={<Activity />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)
