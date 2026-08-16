'use client'

// components/wall/WallThumb.tsx — KINEO-UI-DIARIO-2026-08-16 (item 21 do roadmap Higgsfield)
//
// A thumbnail do card do Wall of Proof, com UMA responsabilidade: a pagina cujo
// trabalho e PROVAR nunca pode mostrar um buraco cinza no lugar do video.
//
// POR QUE ISTO EXISTE — o defeito foi MEDIDO, nao suposto (16/08):
// o unico card que a aba padrao ("This week") renderiza hoje em producao e o
// `aSrIVAc81MM`, e TODAS as resolucoes de thumbnail dele respondem **HTTP 404**
// (`maxresdefault`, `hq720`, `sddefault`, `mqdefault`, `hqdefault`, `default`).
// O i.ytimg.com nao devolve corpo vazio num 404: devolve um **JPEG cinza de
// 120x90** perfeitamente valido. O browser decodifica esse JPEG e o pinta —
// entao `onError` do <img> NAO e um detector confiavel aqui e o card apareceu,
// por semanas, como um retangulo cinza esticado dentro da moldura 163x291.
//
// O discriminador honesto e o TAMANHO: o placeholder de ausencia tem sempre
// 120x90; qualquer thumbnail real do YouTube tem >= 320px de largura
// (`mqdefault`). Por isso a checagem e `naturalWidth <= 120`, e nao `onError`.
//
// E POR QUE O CROP **NAO** FOI MEXIDO (o item 21 e a emenda dele estavam
// errados nos dois sentidos, e a medicao de hoje desfaz os dois):
// o YouTube entrega a thumbnail de um Short **pillarboxed** em toda resolucao —
// o quadro vertical fica centralizado com barras nas laterais. Medido hoje na
// producao, em faixas de brilho a cada 5% da largura dos 3 `maxresdefault`
// 1280x720 do mural: as faixas 0-6 e 13-19 sao escuras e so as faixas 7-12
// carregam imagem, isto e a banda central de ~30% da largura. E 720 x 9/16 =
// **405px de 1280 = 31,6%** — a banda de conteudo e EXATAMENTE o quadro
// vertical. Logo `object-fit: cover` numa moldura 9:16 conserva o Short inteiro
// e descarta so as barras: o crop de hoje esta CERTO em `hqdefault` (480x360,
// 202,5px uteis) e igualmente certo em `maxresdefault`. Os "~405px que sobram
// de 1280" que a emenda de 15/08 leu como perda de 68% sao, na verdade, o
// quadro util inteiro. Trocar por `contain` + backdrop borrado — a correcao que
// aquele item pedia — mostraria as BARRAS do YouTube dentro da nossa moldura e
// encolheria o Short para uma tira de 163x92. Nao foi feito, de proposito.

import { useEffect, useRef, useState } from 'react'

/** Largura do JPEG cinza que o i.ytimg.com serve junto do 404. */
const YT_MISSING_THUMB_WIDTH = 120

export default function WallThumb({ src, alt }: { src: string; alt: string }) {
  const [missing, setMissing] = useState(false)
  const ref = useRef<HTMLImageElement | null>(null)

  // Com SSR a imagem pode ficar `complete` ANTES da hidratacao — nesse caminho
  // nem `onLoad` nem `onError` chegam a disparar. A checagem no mount cobre o
  // caso, e e a unica razao deste efeito existir.
  useEffect(() => {
    const img = ref.current
    if (!img || !img.complete) return
    if (img.naturalWidth === 0 || img.naturalWidth <= YT_MISSING_THUMB_WIDTH) setMissing(true)
  }, [])

  if (missing) {
    // Fallback da marca: superficies --surface-1/--surface-2 da tabela de tokens
    // do roadmap (#141416 / #1d1d1f) em hex porque estas duas ainda nao estao
    // no :root do globals.css — quando estiverem, viram var(). Nenhuma animacao:
    // camada estatica, sem custo para prefers-reduced-motion nem para o CLS.
    return (
      <div
        role="img"
        aria-label={alt}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #1d1d1f 0%, #141416 100%)',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
          <circle cx="17" cy="17" r="16" fill="none" stroke="rgba(245,245,247,0.22)" strokeWidth="1.5" />
          <path d="M14 11.5 L23.5 17 L14 22.5 Z" fill="rgba(245,245,247,0.55)" />
        </svg>
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      width={480}
      height={360}
      onLoad={(e) => {
        const img = e.currentTarget
        if (img.naturalWidth <= YT_MISSING_THUMB_WIDTH) setMissing(true)
      }}
      onError={() => setMissing(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
    />
  )
}
