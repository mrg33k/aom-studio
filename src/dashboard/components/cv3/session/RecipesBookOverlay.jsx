import { useEffect, useMemo, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'

// R41 -- Recipes book. Skills, made user-friendly.
//
// Two surfaces, one overlay component:
//   - Project chat: GRAND view -- every recipe organized by sector/category,
//     searchable in-place ("video", "resolve", "brand", etc.). Pass mode='project'.
//   - Agent chat: FILTERED view -- only recipes the agent is good at. Pass
//     mode='agent' + agentSlug='<slug>'. The server-side filter in
//     /api/dashboard/recipes?agent=<slug> does the domain mapping.
//
// Click a recipe -> input collector modal opens. The modal asks only what
// the recipe needs (plain language) and fires a message into the chat that
// invokes the skill. Today the input collector is a single free-text
// textarea; richer per-recipe schemas land in a follow-up as .claude/skills/
// inputs.json starts shipping alongside SKILL.md files.
//
// Ben is not the shape. Ash-onboarding-has-no-idea-what-Cleo-can-do IS the
// shape. Solves the discovery problem by putting the catalog one click
// away from any chat surface.

function titleCase(s) {
  return String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function Recipe({ recipe, onPick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      data-testid={`recipe-row-${recipe.name.replace(/^\//, '')}`}
      onClick={() => onPick?.(recipe)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%', padding: '10px 12px',
        borderRadius: 10,
        background: hover ? C.s2 : 'transparent',
        border: '1px solid transparent',
        borderColor: hover ? C.border2 : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        color: C.text, fontFamily: "'Inter', sans-serif",
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#F9A8D4', marginTop: 8, flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 600,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span>{recipe.name}</span>
          {recipe.alias && (
            <span style={{
              fontSize: 10.5, fontWeight: 500, color: C.dim,
            }}>
              {recipe.alias}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: C.text2, lineHeight: 1.4, marginTop: 2,
        }}>
          {recipe.description}
        </div>
      </div>
    </button>
  )
}

function CategorySection({ label, recipes, onPick }) {
  return (
    <section
      data-testid={`recipes-category-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={{ marginBottom: 22 }}
    >
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.muted,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0 4px 10px', fontFamily: "'Inter', sans-serif",
      }}>
        {label}
        <span style={{ marginLeft: 8, color: C.dim }}>{recipes.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {recipes.map(r => (
          <Recipe key={r.name} recipe={r} onPick={onPick} />
        ))}
      </div>
    </section>
  )
}

function InputCollector({ recipe, onCancel, onFire }) {
  const [value, setValue] = useState('')
  return (
    <div
      data-testid="recipe-input-collector"
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(8, 14, 28, 0.9)', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        width: 'min(520px, 100%)',
        padding: 22, borderRadius: 16,
        background: C.s1,
        border: `1px solid ${C.border2}`,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          fontSize: 13, color: C.muted, marginBottom: 4,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {recipe.name}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6,
        }}>
          {titleCase(recipe.name.replace(/^\//, ''))}
        </div>
        <div style={{
          fontSize: 12.5, color: C.text2, marginBottom: 14, lineHeight: 1.5,
        }}>
          {recipe.description}
        </div>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          rows={4}
          placeholder={`What should ${recipe.name} work with? Be brief -- one or two sentences.`}
          style={{
            width: '100%',
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${C.border2}`,
            color: C.text, fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            resize: 'vertical',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 14px', borderRadius: 9,
              background: 'transparent', border: `1px solid ${C.border2}`,
              color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            data-testid="recipe-input-fire"
            onClick={() => onFire(value.trim())}
            disabled={value.trim().length === 0}
            style={{
              padding: '8px 16px', borderRadius: 9,
              background: value.trim() ? 'rgba(59,158,255,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${value.trim() ? 'rgba(59,158,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
              color: value.trim() ? '#3B9EFF' : C.dim,
              fontSize: 12, fontWeight: 700,
              cursor: value.trim() ? 'pointer' : 'default',
            }}
          >
            Cook it →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RecipesBookOverlay({ mode = 'project', agentSlug, onClose, onFire }) {
  const [query, setQuery] = useState('')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const qs = mode === 'agent' && agentSlug
      ? `?agent=${encodeURIComponent(agentSlug)}`
      : ''
    fetch(`/api/dashboard/recipes${qs}`)
      .then(r => r.ok ? r.json() : { recipes: [] })
      .then(data => { if (!cancelled) { setRecipes(data.recipes || []); setLoading(false) } })
      .catch(() => { if (!cancelled) { setRecipes([]); setLoading(false) } })
    return () => { cancelled = true }
  }, [mode, agentSlug])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const visible = q
      ? recipes.filter(r =>
          r.name.toLowerCase().includes(q)
          || (r.description || '').toLowerCase().includes(q)
          || (r.category || '').toLowerCase().includes(q)
          || (r.categoryLabel || '').toLowerCase().includes(q)
        )
      : recipes

    const map = new Map()
    for (const r of visible) {
      const key = r.categoryLabel || r.category
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, list]) => ({ label, recipes: list }))
  }, [query, recipes])

  return (
    <div
      data-testid="recipes-book-overlay"
      data-mode={mode}
      data-agent-slug={agentSlug || ''}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(8, 14, 28, 0.97)',
        zIndex: 500,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 18px',
        borderBottom: `1px solid ${C.border2}`,
        background: 'rgba(8, 14, 28, 0.95)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(249,168,212,0.15)',
          border: '1px solid rgba(249,168,212,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: '#F9A8D4',
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6M10 3v5.5l-4.5 9a2 2 0 0 0 1.8 2.9h9.4a2 2 0 0 0 1.8-2.9L14 8.5V3" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            Recipes
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {mode === 'agent' && agentSlug
              ? `What ${agentSlug} can do`
              : 'Every recipe, organized by category'}
          </div>
        </div>
        <button
          onClick={onClose}
          data-testid="recipes-book-close"
          aria-label="Close recipes"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: C.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border2}` }}>
        <input
          data-testid="recipes-book-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={mode === 'agent' ? 'Filter recipes...' : 'Search: video, resolve, brand, biz, outreach...'}
          style={{
            width: '100%', padding: '10px 12px',
            borderRadius: 10, background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${C.border2}`, color: C.text,
            fontSize: 13, fontFamily: "'Inter', sans-serif",
            outline: 'none',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 40px' }}>
        {loading && (
          <div style={{ color: C.muted, fontSize: 12, padding: '12px 4px' }}>Loading recipes…</div>
        )}
        {!loading && recipes.length === 0 && (
          <div style={{ color: C.muted, fontSize: 12, padding: '12px 4px' }}>
            No recipes available yet. Check that src/data/skills.json has shipped.
          </div>
        )}
        {!loading && grouped.map(g => (
          <CategorySection
            key={g.label}
            label={g.label}
            recipes={g.recipes}
            onPick={setPicked}
          />
        ))}
      </div>

      {picked && (
        <InputCollector
          recipe={picked}
          onCancel={() => setPicked(null)}
          onFire={(text) => {
            onFire?.({ recipe: picked, input: text })
            setPicked(null)
            onClose?.()
          }}
        />
      )}
    </div>
  )
}
