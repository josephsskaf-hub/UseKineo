import {
  getPostVideoCapacity,
  POST_VIDEO_CAPACITY_VERSION,
  type PostVideoCapacityInput,
} from '@/lib/growth/postVideoCapacity'

export interface RecurringPlanValueProps extends PostVideoCapacityInput {
  locale?: string
}

const COPY = {
  en: {
    label: 'Your plan in practice', upTo: 'Up to', film: 'new film / month', films: 'new films / month',
    seconds: 'seconds each', credits: 'monthly credits', calculation: 'see the calculation',
    perFilm: 'credits per film', completeFilm: 'complete film', completeFilms: 'complete films',
    shared: 'If all monthly credits go to this setup. Other creations use the same balance.',
    unknown: 'The number of films depends on the engine and duration.',
    unavailable: 'Monthly film capacity depends on the engines available to your account.',
    insufficient: 'This setup needs more credits per film than this plan provides each month.',
  },
  pt: {
    label: 'Seu plano na prática', upTo: 'Até', film: 'novo filme / mês', films: 'novos filmes / mês',
    seconds: 'segundos cada', credits: 'créditos mensais', calculation: 'ver o cálculo',
    perFilm: 'créditos por filme', completeFilm: 'filme completo', completeFilms: 'filmes completos',
    shared: 'Se todos os créditos mensais forem usados nesta configuração. Outras criações usam o mesmo saldo.',
    unknown: 'A quantidade de filmes depende do motor e da duração.',
    unavailable: 'A capacidade mensal depende dos motores disponíveis para sua conta.',
    insufficient: 'Esta configuração exige mais créditos por filme do que o plano oferece por mês.',
  },
  es: {
    label: 'Tu plan en la práctica', upTo: 'Hasta', film: 'película nueva / mes', films: 'películas nuevas / mes',
    seconds: 'segundos cada una', credits: 'créditos mensuales', calculation: 'ver el cálculo',
    perFilm: 'créditos por película', completeFilm: 'película completa', completeFilms: 'películas completas',
    shared: 'Si todos los créditos mensuales se usan en esta configuración. Otras creaciones usan el mismo saldo.',
    unknown: 'La cantidad de películas depende del motor y de la duración.',
    unavailable: 'La capacidad mensual depende de los motores disponibles para tu cuenta.',
    insufficient: 'Esta configuración requiere más créditos por película de los que el plan ofrece cada mes.',
  },
} as const

/** Presentational only: no checkout, generation, network, timers or analytics. */
export default function RecurringPlanValue({ locale = 'en', ...input }: RecurringPlanValueProps) {
  const language = locale.toLowerCase().split(/[-_]/)[0]
  const copy = COPY[language === 'pt' || language === 'es' ? language : 'en']
  const capacity = getPostVideoCapacity(input)
  if (capacity.monthlyCredits === null) return null

  return <section
    aria-label={copy.label}
    data-post-video-capacity={capacity.status}
    data-capacity-version={POST_VIDEO_CAPACITY_VERSION}
    style={{ margin: '12px 0', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', color: 'var(--text)', textAlign: 'left', minWidth: 0, overflowWrap: 'anywhere' }}
  >
    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 650, color: 'var(--muted2)' }}>{copy.label}</p>
    {capacity.status === 'ready' ? <>
      <p style={{ margin: 0, fontSize: 'clamp(17px, 3.6vw, 22px)', fontWeight: 750, lineHeight: 1.3 }}>
        {copy.upTo} <strong>{capacity.filmsPerMonth}</strong> {capacity.filmsPerMonth === 1 ? copy.film : copy.films}
      </p>
      <p style={{ margin: '6px 0 10px', color: 'var(--muted2)', fontSize: 13, lineHeight: 1.5 }}>
        {capacity.engineName} · {capacity.seconds} {copy.seconds}
      </p>
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12, lineHeight: 1.6, color: 'var(--muted2)' }}>
          {capacity.monthlyCredits} {copy.credits} · {copy.calculation}
        </summary>
        <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6 }}>
          {capacity.monthlyCredits} ÷ {capacity.creditsPerFilm} {copy.perFilm} → {capacity.filmsPerMonth} {capacity.filmsPerMonth === 1 ? copy.completeFilm : copy.completeFilms}.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--muted2)' }}>{copy.shared}</p>
      </details>
    </> : <>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{capacity.monthlyCredits} {copy.credits}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--muted2)' }}>
        {capacity.reason === 'insufficient_monthly_credits' ? copy.insufficient
          : capacity.reason === 'engine_unavailable' || capacity.reason === 'engine_access_unconfirmed' ? copy.unavailable
            : copy.unknown}
        {capacity.creditsPerFilm !== undefined && <> {capacity.creditsPerFilm} {copy.perFilm}.</>}
      </p>
    </>}
  </section>
}
