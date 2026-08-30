// KINEO-SPRINT-UI6-2026-08-30 — /my-videos nunca abre em branco: a page e
// server component que ESPERA o select em `videos` antes de mandar 1 byte,
// entao navegar pra ca congelava a tela ate o banco responder (em rede movel,
// segundos de "nada aconteceu"). A /history ganhou skeleton no dia 13/08;
// esta e a tela irma — mesmo acervo, mesma regra Higgsfield: nunca spinner,
// sempre a FORMA do resultado. Header + fileira de filtros + grade 9:16 com
// as MESMAS colunas responsivas do MyVideosClient (5/4/3/2), pra troca
// skeleton→conteudo acontecer sem salto de layout. Rollback: deletar o arquivo.
const SHIMMER =
  'linear-gradient(100deg, rgba(255,255,255,.035) 40%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.035) 60%)'

function bar(width: number | string, height: number, radius = 6) {
  return {
    width,
    height,
    borderRadius: radius,
    background: SHIMMER,
    backgroundSize: '200% 100%',
    animation: 'mvsk 1.4s linear infinite',
  } as const
}

export default function MyVideosLoading() {
  return (
    <div className="px-4 sm:px-6 py-7 pb-20">
      <style>{`
        @keyframes mvsk{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .mvsk-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1280px) {
          .mvsk-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        }
        @media (max-width: 900px) {
          .mvsk-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        }
        @media (max-width: 600px) {
          .mvsk-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        }
      `}</style>
      <header className="mb-6">
        <div style={{ ...bar(120, 10), marginBottom: 12 }} />
        <div style={bar(210, 28, 8)} />
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[72, 96, 88, 80].map((w, i) => (
          <div key={i} style={bar(w, 32, 999)} />
        ))}
      </div>
      <div className="mvsk-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '9 / 16',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,.06)',
              background: SHIMMER,
              backgroundSize: '200% 100%',
              animation: 'mvsk 1.4s linear infinite',
              animationDelay: `${(i % 5) * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
