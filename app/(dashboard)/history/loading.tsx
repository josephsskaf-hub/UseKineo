// KINEO-HIGGSFIELD-20D dia 8 (13/08) — /history nunca abre em branco nem em
// spinner: enquanto o servidor busca os videos, esta grade 9:16 em shimmer ja
// mostra a FORMA do que vem (regra Higgsfield: nunca spinner, sempre a forma
// do resultado). Mesmo header e mesma grade do HistoryClient — a troca
// skeleton→conteudo acontece sem salto de layout. Rollback: deletar este arquivo.
const SHIMMER =
  'linear-gradient(100deg, rgba(255,255,255,.035) 40%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.035) 60%)'

function bar(width: number | string, height: number, radius = 6) {
  return {
    width,
    height,
    borderRadius: radius,
    background: SHIMMER,
    backgroundSize: '200% 100%',
    animation: 'hsk 1.4s linear infinite',
  } as const
}

export default function HistoryLoading() {
  return (
    <div className="px-4 sm:px-6 py-7">
      <style>{'@keyframes hsk{0%{background-position:200% 0}100%{background-position:-200% 0}}'}</style>
      <header className="mb-7">
        <div style={{ ...bar(120, 10), marginBottom: 12 }} />
        <div style={bar(210, 28, 8)} />
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
          gap: '12px',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '9 / 16',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,.06)',
              background: SHIMMER,
              backgroundSize: '200% 100%',
              animation: 'hsk 1.4s linear infinite',
              animationDelay: `${(i % 4) * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
