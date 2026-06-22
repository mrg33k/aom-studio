import React from 'react';

/**
 * CV6 kit Chat — Code Block element.
 * Show code only when it matters: collapsed to a chip by default, expanding to a
 * titled, syntax-lit block with copy and explain.
 *
 * Props:
 *   filename     - Name of the file (e.g., 'resolver.ts')
 *   language     - Language abbreviation (e.g., 'ts', 'js', 'py')
 *   code         - Raw code string (may have newlines)
 *   changes      - Optional stats string (e.g., '+12 -3')
 *   explanation  - Optional plain-English explanation of the code
 *   onExplain    - Optional callback when "Explain in plain English" is clicked
 *   onViewDiff   - Optional callback when "View diff" is clicked
 *   onCopy       - Optional callback when copy button is clicked (default copies to clipboard)
 *   expanded     - Optional: start expanded (default: collapsed chip)
 *
 * Renders inside a [data-cv6kit] ancestor so scoped classes resolve.
 */

const ICON_CODE = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#79c0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>;

const ICON_COPY = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>;

const ICON_INFO = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6"/><path d="M12 17h.01"/></svg>;

export function CodeBlock({
  filename = 'example.ts',
  language = 'ts',
  code = 'function example() {\n  return 42;\n}',
  changes = '',
  explanation = 'This is a code block.',
  onExplain,
  onViewDiff,
  onCopy,
  expanded = false,
}) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(code).catch(() => {});
    }
  };

  return (
    <div className="cblk">
      {!isExpanded ? (
        /* Collapsed chip view */
        <div
          className="codechip"
          onClick={() => setIsExpanded(true)}
          role="button"
          tabIndex={0}
          aria-label={`Show ${filename}`}
          style={{ cursor: 'pointer' }}
        >
          <span className="cg">{ICON_CODE}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg)' }}>
              {filename}
            </div>
            {changes && (
              <div
                className="mono"
                style={{ fontSize: '10.5px', color: 'var(--faint)' }}
              >
                {language.toUpperCase()} {changes && `· ${changes}`}
              </div>
            )}
          </div>
          <button
            className="pillbtn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            aria-label="Show code"
          >
            Show code
          </button>
        </div>
      ) : (
        /* Expanded block view */
        <>
          <div className="ccode">
            <div className="ccode-h">
              {ICON_CODE}
              <span className="fn">{filename}</span>
              <span className="lang">{language}</span>
              <button
                className="cbtn"
                onClick={handleCopy}
                aria-label="Copy code"
                title="Copy code"
              >
                {ICON_COPY}
              </button>
            </div>
            <pre>
              <span className="cl">// route docs-only projects too</span>
              {'\n'}
              <span className="kw">function</span>{' '}
              <span className="fnname">resolveRepoPath</span>(name) {'{'}
              {'\n'}
              {' '}
              <span className="kw">if</span> (name === <span className="st">'space-rising'</span>)
              {' '}
              {'{'}
              {'\n'}
              {'  '}
              <span className="kw">return</span>{' '}
              <span className="st">'projects/space-rising'</span>;
              {'\n'}
              {' '}
              {'}'}
              {'\n'}
              {'  '}
              <span className="kw">return</span> registry.
              <span className="fnname">lookup</span>(name);
              {'\n'}
              {'}'}
            </pre>
          </div>

          {/* Action chips below the code block */}
          <div className="chips">
            <button
              className="chip-btn"
              onClick={() => {
                if (onExplain) onExplain();
              }}
            >
              {ICON_INFO}
              Explain in plain English
            </button>
            {onViewDiff && (
              <button
                className="chip-btn"
                onClick={onViewDiff}
              >
                View diff
              </button>
            )}
          </div>

          {/* Explanation bubble below the chips */}
          {explanation && (
            <div
              className="bubble"
              style={{
                fontSize: '12.5px',
                color: 'var(--muted)',
                marginTop: '11px',
              }}
            >
              {explanation}
            </div>
          )}

          {/* Collapse button (inline at the top-right of ccode) */}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              marginTop: '9px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid var(--accent-weak)',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
            aria-label="Collapse code"
          >
            Hide code
          </button>
        </>
      )}
    </div>
  );
}
