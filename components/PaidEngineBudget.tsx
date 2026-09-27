import { paidEngineBudget } from '@/lib/growth/paidEngineProof'

export default function PaidEngineBudget({ slug }: { slug: string }) {
  const budget = paidEngineBudget(slug)
  if (!budget) return null
  return (
    <div data-kineo="paid-engine-budget" style={{ margin: '18px auto 0', maxWidth: 620, padding: '16px 18px', border: '1px solid #3e515d', borderRadius: 14, background: '#132029', textAlign: 'center' }}>
      <p style={{ margin: 0, color: '#f5f5f7', fontSize: '1.1rem', lineHeight: 1.5 }}>
        <strong>{budget.label} {budget.price} USD/month</strong>{' = '}
        <strong>{budget.films} {budget.films === 1 ? 'film' : 'films'}</strong> of {budget.seconds} s with this engine
      </p>
      {/* KINEO-SPRINT16H-B-CAPACIDADE-35S-2026-09-27: the shortest Studio length. Shown only when Starter covers at least one. */}
      {budget.short.starterFilms >= 1 && (
        <p style={{ margin: '6px 0 0', color: '#f5f5f7', fontSize: '.95rem', lineHeight: 1.5 }}>
          {budget.tier === 'basic' ? <><strong>Starter {budget.short.starterPrice} USD/month</strong>{' = '}</> : 'or '}
          <strong>{budget.short.starterFilms} {budget.short.starterFilms === 1 ? 'film' : 'films'}</strong> of {budget.short.seconds} s{budget.tier === 'basic' ? ' with this engine' : ''}
        </p>
      )}
      <p style={{ margin: '8px 0 0', color: '#bbc8d0', fontSize: '.82rem', lineHeight: 1.5 }}>
        Based on the monthly credit grant, used only for this engine and duration. Other creations use the same balance.
      </p>
    </div>
  )
}
