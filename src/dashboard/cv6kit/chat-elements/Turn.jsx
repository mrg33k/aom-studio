import React from 'react';

/**
 * CV6 kit Chat — Turn, Bubble, UserMsg, and content block components.
 * Faithful to ui_kits/agent-chat/anatomy.html; uses chat.css class names only (no inline styles for theme).
 *
 * The agent turn = avatar (.tav) + stacked blocks (.tbody). Blocks are typed elements:
 * - Bubble (plain text message inside .bubble)
 * - CommBlock (success/question/snag with .cblk)
 * - DataBlock (table or chart with .cdata + .cdata-h + .tbl or .bars)
 * - EmailBlock (email with .cmail)
 * - GalleryBlock (photos with .cgal)
 * - AudioBlock (audio with .caudio)
 * - VideoBlock (video with .cvideo)
 * - CodeBlock (code with .ccode or .codechip)
 * - ChoicesBlock (option chips with .chips)
 * - FileRow (document with .frowm)
 * - ThinkingState (typing state with .thinking)
 * - UserMsg (user message with .umsg)
 *
 * All render inside [data-cv6kit] ancestor; classes resolve via chat.css scoping.
 */

/* ---- SVG icon definitions ---- */
const ICON = {
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>,
  warn: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01" /><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>,
  question: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 17v.01" /><path d="M12 13a2 2 0 0 0-2-2 2 2 0 0 0 0 4 2 2 0 0 1 0 4" /></svg>,
  file: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>,
  table: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="16" y2="21" /><line x1="3" y1="8" x2="21" y2="8" /><line x1="3" y1="16" x2="21" y2="16" /></svg>,
  chart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="3" x2="3" y2="21" /><line x1="3" y1="21" x2="21" y2="21" /><path d="M3 15l5-4 3 2 6-6" /></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
  image: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  code: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
};

/* ---- Turn — base agent message ---- */
export function Turn({ avatar = 'EL', name = 'Agent', status = null, time = null, children = null }) {
  return (
    <div className="turn">
      <div className="tav">{avatar}</div>
      <div className="tbody">
        <div className="tname">
          <b>{name}</b>
          {status && <span className={`astat ${status.live ? 'is-live' : ''}`}><span className="sd"></span>{status.label}</span>}
          {time && <span className="tt">{time}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---- Bubble — plain text message ---- */
export function Bubble({ children }) {
  return <div className="bubble">{children}</div>;
}

/* ---- UserMsg — user reply ---- */
export function UserMsg({ children }) {
  return <div className="umsg">{children}</div>;
}

/* ---- CommBlock — success / question / snag ---- */
export function CommBlock({
  kind = 'success',
  title = 'Success',
  body = '',
  choices = [],
  onChoose = null,
  recommendedId = null,
  recommendedPath = null,
}) {
  const kindClass = kind === 'question' ? 'is-question' : kind === 'snag' ? 'is-snag' : 'is-success';
  const icon = kind === 'question' ? ICON.question : kind === 'snag' ? ICON.warn : ICON.check;

  return (
    <div className={`cblk ${kindClass}`}>
      <div className="cblk-h">
        <span className="ci">{icon}</span>
        <span className="ct">{title}</span>
      </div>
      {body && <div className="cblk-b">{body}</div>}

      {Array.isArray(choices) && choices.length > 0 && (
        <div className="chips">
          {choices.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose && onChoose(c.id)}
              className={`chip-btn ${c.id === recommendedId ? 'is-primary' : ''} ${c.id === recommendedId ? 'is-rec' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {recommendedPath && (
        <div className="cpath">
          <span>{recommendedPath}</span>
        </div>
      )}
    </div>
  );
}

/* ---- DataBlock — table or chart ---- */
export function DataBlock({
  title = 'Data',
  columns = [],
  rows = [],
  footerRow = null,
  chart = false,
  onToggleChart = null,
}) {
  const [showChart, setShowChart] = React.useState(chart);

  const handleToggle = (c) => {
    setShowChart(c);
    onToggleChart && onToggleChart(c);
  };

  if (!columns.length || !rows.length) {
    return <div className="cdata">No data</div>;
  }

  return (
    <div className="cdata">
      <div className="cdata-h">
        <div className="dt">{title}</div>
        <div className="toggle">
          <button className={showChart ? '' : 'on'} onClick={() => handleToggle(false)}>
            {ICON.table} Table
          </button>
          <button className={showChart ? 'on' : ''} onClick={() => handleToggle(true)}>
            {ICON.chart} Chart
          </button>
        </div>
      </div>

      {!showChart ? (
        <div className="tbl">
          <div className="tr th" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
            {columns.map((col, i) => (
              <div key={i} style={{ textAlign: col.align || 'left' }}>
                {col.label}
              </div>
            ))}
          </div>
          {rows.map((row, i) => (
            <div key={i} className="tr" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
              {columns.map((col, j) => (
                <div key={j} className={col.type === 'number' ? 'num' : ''}>
                  {row[col.key]}
                </div>
              ))}
            </div>
          ))}
          {footerRow && (
            <div className="tr tf" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
              {columns.map((col, i) => (
                <div key={i}>{footerRow[col.key]}</div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bars">
          {rows.map((row, i) => (
            <div key={i} className="bar">
              <i style={{ height: `${(parseFloat(row[columns[1].key]) / Math.max(...rows.map((r) => parseFloat(r[columns[1].key])))) * 100}%` }} />
              <span>{row[columns[0].key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- EmailBlock — email message ---- */
export function EmailBlock({
  from = 'sender@example.com',
  fromName = 'Sender',
  subject = 'Subject',
  body = '',
  tag = null,
  quote = null,
  actions = [],
}) {
  const initials = fromName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="cmail">
      <div className="cmail-h">
        <div
          className="ma"
          style={{
            background: `linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)}, #${Math.floor(Math.random() * 16777215).toString(16)})`,
            color: 'var(--bone)',
          }}
        >
          {initials}
        </div>
        <div>
          <div className="mfrom">{fromName}</div>
          <div className="msub">{from}</div>
        </div>
        {tag && <span className="cmail-tag">{tag}</span>}
      </div>
      {quote && <div className="cmail-q">{quote}</div>}
      {body && <div className="cmail-f" style={{ padding: '13px 14px', borderTop: 'none', display: 'block' }}>{body}</div>}
      {actions.length > 0 && (
        <div className="cmail-f">
          {actions.map((a, i) => (
            <button key={i} className="pillbtn" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- GalleryBlock — photo gallery ---- */
export function GalleryBlock({ images = [], caption = null, onImageClick = null }) {
  if (!images.length) return null;

  const grid = images.slice(0, 6);
  const moreCount = images.length - 6;

  return (
    <div>
      <div className="cgal">
        {grid.map((img, i) => (
          <div
            key={i}
            className={`ph ${img.span === 2 ? 'span2' : ''}`}
            onClick={() => onImageClick && onImageClick(i)}
            style={{ backgroundImage: `url(${img.src})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}
          >
            {i === 5 && moreCount > 0 && <div className="more">+{moreCount}</div>}
          </div>
        ))}
      </div>
      {caption && <div className="gal-cap">{caption}</div>}
    </div>
  );
}

/* ---- AudioBlock — audio player ---- */
export function AudioBlock({ transcript = '', duration = '0:00', onPlay = null }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const waveform = Array.from({ length: 30 }, () => Math.random() > 0.5);

  return (
    <div className="caudio">
      <button
        className="play"
        onClick={() => {
          setIsPlaying(!isPlaying);
          onPlay && onPlay(!isPlaying);
        }}
      >
        {isPlaying ? '||' : ICON.play}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {transcript && <div style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.4, marginBottom: 6 }}>{transcript}</div>}
        <div className="wave">
          {waveform.map((on, i) => (
            <i key={i} className={on ? 'on' : ''} style={{ height: `${40 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--muted)', flex: 'none' }}>{duration}</span>
    </div>
  );
}

/* ---- VideoBlock — video poster ---- */
export function VideoBlock({ posterSrc = '', duration = '2:34', title = 'Video', onPlay = null }) {
  return (
    <div className="cvideo" onClick={() => onPlay && onPlay()} style={{ backgroundImage: `url(${posterSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}>
      <button className="vplay" onClick={() => onPlay && onPlay()} style={{ cursor: 'pointer' }}>
        {ICON.play}
      </button>
      <div className="vmeta">
        <span className="vchip">{title}</span>
        <span className="vchip">{duration}</span>
      </div>
    </div>
  );
}

/* ---- CodeBlock — code display ---- */
export function CodeBlock({
  filename = 'code.js',
  language = 'javascript',
  code = '',
  collapsed = true,
  onCollapse = null,
}) {
  const [isOpen, setIsOpen] = React.useState(!collapsed);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    onCollapse && onCollapse(!isOpen);
  };

  if (collapsed && !isOpen) {
    return (
      <div className="codechip" onClick={handleToggle}>
        <div className="cg">{ICON.code}</div>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg)' }}>{filename}</div>
          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{code.split('\n').length} lines</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ccode">
      <div className="ccode-h">
        <div className="fn">{filename}</div>
        <div className="lang">{language}</div>
        <button className="cbtn" onClick={handleToggle}>
          -
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}

/* ---- ChoicesBlock — quick reply / option chips ---- */
export function ChoicesBlock({ choices = [], onChoose = null, recommendedId = null }) {
  return (
    <div className="chips">
      {choices.map((c) => (
        <button
          key={c.id}
          onClick={() => onChoose && onChoose(c.id)}
          className={`chip-btn ${c.id === recommendedId ? 'is-primary' : ''} ${c.id === recommendedId ? 'is-rec' : ''}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

/* ---- FileRow — document / attachment row ---- */
export function FileRow({ filename = 'file.txt', size = '3 KB', onOpen = null }) {
  return (
    <div className="frowm">
      <span className="fg">{ICON.file}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg)' }}>{filename}</div>
        <div className="mono" style={{ fontSize: '10px', color: 'var(--faint)' }}>{size}</div>
      </div>
      <button className="pillbtn" onClick={() => onOpen && onOpen()}>
        Open
      </button>
    </div>
  );
}

/* ---- ThinkingState — typing / working indicator ---- */
export function ThinkingState({ label = 'Thinking...' }) {
  return (
    <div className="thinking">
      <span className="dot3">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{label}</span>
    </div>
  );
}

/* ---- Showcase / test render ---- */
export function TurnShowcase() {
  return (
    <div data-cv6kit style={{ background: 'var(--ground)', padding: '20px', borderRadius: '16px', fontFamily: 'var(--font-sans)' }}>
      <style>{'@keyframes think { 0%,60%,100%{ opacity:.3; transform:translateY(0);} 30%{ opacity:1; transform:translateY(-3px);} }'}</style>

      {/* Example 1: Agent turn with bubble + success block */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon" status={{ label: 'LIVE', live: true }} time="9:41">
          <Bubble>On it. I pulled the repo and found the resolver skips docs-only projects. Here is what I am seeing and one call I need from you.</Bubble>
          <CommBlock kind="success" title="REPRODUCED" body="Confirmed on space-rising; it never reaches the runner." />
          <FileRow filename="task-runner.log" size="3 KB" />
        </Turn>
      </div>

      {/* Example 2: User message */}
      <div style={{ marginBottom: '24px' }}>
        <UserMsg>Go ahead and patch it, keep it reversible.</UserMsg>
      </div>

      {/* Example 3: Agent with thinking state */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon">
          <ThinkingState label="Patching the resolver..." />
        </Turn>
      </div>

      {/* Example 4: Question block with choices */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon">
          <CommBlock
            kind="question"
            title="DECISION NEEDED"
            body="Should we deprecate the old format or keep both?"
            choices={[{ id: 'keep', label: 'Keep both' }, { id: 'deprecate', label: 'Deprecate old' }]}
            recommendedId="deprecate"
          />
        </Turn>
      </div>

      {/* Example 5: Data table */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon">
          <DataBlock
            title="Performance metrics"
            columns={[{ key: 'name', label: 'Metric', type: 'string' }, { key: 'value', label: 'Value', type: 'number', align: 'right' }]}
            rows={[{ name: 'Build time', value: '2.3s' }, { name: 'Bundle size', value: '142 KB' }, { name: 'Requests', value: '24' }]}
            chart
          />
        </Turn>
      </div>

      {/* Example 6: Code block (collapsed) */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon">
          <Bubble>Here is the fix:</Bubble>
          <CodeBlock filename="resolver.js" language="javascript" code={'function skip(p) {\n  return p.docs && !p.code;\n}'} collapsed />
        </Turn>
      </div>

      {/* Example 7: Email block */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon">
          <EmailBlock
            from="alice@example.com"
            fromName="Alice"
            subject="Review needed"
            quote="Ready for 0.3.0 tag?"
            body="Looks good to me."
          />
        </Turn>
      </div>

      {/* Example 8: Gallery */}
      <div style={{ marginBottom: '24px' }}>
        <Turn avatar="EL" name="Elon">
          <Bubble>Here are the preview renders:</Bubble>
          <GalleryBlock
            images={[
              { src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMzMzMyIvPjwvc3ZnPg==' },
              { src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzY2NjY2NiIvPjwvc3ZnPg==' },
              { src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzk5OTk5OSIvPjwvc3ZnPg==' },
              { src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjY2NjYyIvPjwvc3ZnPg==' },
            ]}
            caption="4 frames · drag to review"
          />
        </Turn>
      </div>
    </div>
  );
}
