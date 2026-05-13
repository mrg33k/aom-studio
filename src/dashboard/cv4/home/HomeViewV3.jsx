// V3 — TWOCOL (hero + 2-column desktop AGENTS / PROJECTS, stack mobile).
//
// V1's hero card stays at top. Below: AGENTS column + PROJECTS column
// side-by-side on lg, stacked on mobile.

import { useCornerNav } from '../../CornerContext.jsx'
import useHomeData from './useHomeData.js'
import {
  StatusLine,
  GreetingComment,
  HeroCard,
  TerminalBlockHeader,
  Row,
  FooterKeymap,
  glyphFor,
  toneFor,
} from './HomeShared.jsx'

export default function HomeViewV3() {
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  const data = useHomeData()

  const openAgent = (a) => handleSelectAgent(a)
  const openProject = (p) => handleSelectProject(p)

  return (
    <div className="cv4-home vT" data-testid="cv4-home-twocol">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-1 flex flex-col gap-5 sm:px-6 sm:gap-6">
        <StatusLine worldId={data.worldId} />
        <GreetingComment text={data.greeting} />

        {data.eaAgent && (
          <HeroCard
            kind="AGENT"
            time={data.eaAgent.lastTimeShort || 'idle'}
            slug={data.eaAgent.slug}
            name={data.eaAgent.name}
            body={data.eaAgent.lastText || 'Ready when you are.'}
            onClick={() => openAgent(data.eaAgent)}
          />
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
          <section className="flex flex-col gap-2 lg:col-span-5">
            <TerminalBlockHeader label="AGENTS" count={data.agents.length} />
            <div className="flex flex-col">
              {data.agents.map((a) => (
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

            {data.pinned.length > 0 && (
              <div className="mt-6 flex flex-col gap-2">
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
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2 lg:col-span-7">
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
        </div>

        <FooterKeymap />
      </div>
    </div>
  )
}
