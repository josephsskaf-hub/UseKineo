'use client'

// KINEO-MCP-PAGINA-2026-09-30 — os chips de categoria da galeria de pedidos prontos (molde da Higgsfield:
// All · Shorts · Ads · Clips · Plans). Os cartões continuam renderizados NO SERVIDOR (page.tsx, com o selo do motor e
// o ClaudePromptLink); aqui só se escolhe a categoria e um CSS por atributo esconde o resto — sem JS, todos aparecem.
import { useState, type ReactNode } from 'react'
import { MCP_PALETTE as C } from './palette'

export default function PresetFilter({ categories, children }: { categories: readonly { key: string; label: string }[]; children: ReactNode }) {
  const [filter, setFilter] = useState('all')
  // Uma regra por categoria: com o filtro X, some todo cartão cujo data-cat não contém X (!important: o cartão tem
  // display:flex inline, que venceria a folha).
  const css = categories
    .map((c) => `.kmcp-presets[data-filter="${c.key}"]>[data-cat]:not([data-cat~="${c.key}"]){display:none!important}`)
    .join('\n')
  return (
    <div>
      {/* dangerouslySetInnerHTML: como texto, o React escaparia ">" e aspas e quebraria o seletor. Só constantes da página. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div role="group" aria-label="Filter presets" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>
        {[{ key: 'all', label: 'All' }, ...categories].map((c) => {
          const on = c.key === filter
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(c.key)}
              style={{
                background: on ? C.text : C.card,
                color: on ? C.bg : C.body,
                border: `1px solid ${on ? C.text : C.line}`,
                borderRadius: 999,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                minHeight: 38,
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>
      <div
        className="kmcp-presets"
        data-filter={filter}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}
      >
        {children}
      </div>
    </div>
  )
}
