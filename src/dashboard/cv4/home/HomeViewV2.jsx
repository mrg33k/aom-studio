// V2 — INLINE (no hero card; EA collapses into AGENTS as first row).
//
// Same Console DNA, same row primitive, but the hero card is replaced by
// an [EA] badge on the first AGENTS row. Tests whether the hero is needed.

import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'
import {
  StatusLine,
  GreetingComment,
  TerminalBlockHeader,
  Row,
  FooterKeymap,
  glyphFor,
  toneFor,
} from './HomeShared.jsx'

export default function HomeViewV2() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  return (
    <div className="cv4-home vI" data-testid="cv4-home-inline">
      <div className="mx-auto w-full max-w-[860px] px-4 pb-16 pt-1 flex flex-col gap-5 sm:px-6 sm:gap-6">
        <StatusLine worldId={data.worldId} />
        <GreetingComment text={data.greeting} />

        <section className="flex flex-col gap-2">
          <TerminalBlockHeader label="AGENTS" count={data.agents.length} />
          <div className="flex flex-col">
            {data.eaAgent && (
              <Row
                kind="agent"
                glyphChar={glyphFor(data.eaAgent.state, 'agent')}
                glyphTone={toneFor(data.eaAgent.state)}
                slug={data.eaAgent.slug}
                badge="EA"
                time={data.eaAgent.lastTimeShort}
                preview={data.eaAgent.lastText || 'Ready when you are.'}
                onClick={() => openAgent(data.eaAgent)}
              />
            )}
            {data.otherAgents.map((a) => (
              <Row
                key={a.slug}
                kind="agent"
                glyphChar={glyphFor(a.state, 'agent')}
                glyphTone={toneFor(a.state)}
                slug={a.slug}
                time={a.lastTimeShort}
                preview={a.lastText}
                onClick={() => openAgent(a)}
              />
            ))}
          </div>
        </section>

        {data.pinned.length > 0 && (
          <section className="flex flex-col gap-2">
            <TerminalBlockHeader label="PINNED" count={data.pinned.length} />
            <div className="flex flex-col">
              {data.pinned.map((p) => (
                <Row
                  key={p.key}
                  kind={p.kind}
                  glyphChar="★"
                  glyphTone="amber"
                  slug={p.slug}
                  time={p.tsShort}
                  preview={p.preview}
                  onClick={() => p.kind === 'agent' ? openAgent(p.data) : openProject(p.data)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <TerminalBlockHeader label="PROJECTS" count={data.activeProjects.length} />
          <div className="flex flex-col">
            {data.activeProjects.map((p) => (
              <Row
                key={p.key}
                kind="project"
                glyphChar={glyphFor(p.status, 'project')}
                glyphTone={toneFor(p.status)}
                slug={p.slug}
                time={p.tsShort}
                preview={p.preview}
                onClick={() => openProject(p.data)}
              />
            ))}
          </div>
        </section>

        <FooterKeymap />
      </div>
    </div>
  )
}
