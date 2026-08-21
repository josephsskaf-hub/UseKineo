'use client'

// ═══ KINEO-ESPERA-VENDE-2026-08-21 ═════════════════════════════════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (medido em 21/08, tabela `broll_metrics`,
// 342 renders em 14 dias):
//
//     nosso trabalho (roteiro + narração + B-roll + submit) ...  18,4s mediana
//     render no Creatomate .................................... 182,7s mediana
//                                                                (p90: 316,4s)
//
// Ou seja: 90% da espera NÃO É NOSSA. É o fornecedor renderizando 1080×1920@24
// por ~50 segundos de vídeo, e o custo dele é linear em pixels×fps×duração
// (lib/renderProfile.ts). Não existe otimização de código que corte isso —
// só existe baixar resolução, e isso o fundador vetou explicitamente
// ("não interferir nos textos, nas narrações, na voz, no contexto do vídeo...
// é só a questão da gente fazer o vídeo mais rápido, não do que a gente
// estragar o que a gente já tem").
//
// ENTÃO A PERGUNTA MUDOU. Se não dá para encurtar a espera sem estragar o
// produto, a pergunta certa não é "como cortar 3 minutos?" e sim "o que essas
// 220 pessoas por semana estão OLHANDO durante 3 minutos?".
//
// Resposta até hoje: uma barra de progresso e um aviso técnico. Nada mais.
// Nenhum exemplo, nenhum preço, nenhuma prova. É o único momento do funil em
// que a pessoa está presa na nossa tela, com atenção total, e a gente não
// dizia nada. 220 pessoas × 6 minutos = ~22 horas de atenção por semana
// jogadas fora.
//
// O QUE ENTRA NO LUGAR — e por que NESTA ordem:
//   1. FILMES REAIS rodando, com o selo do motor que os fez. Não é enfeite: a
//      dúvida real de quem está esperando o PRIMEIRO vídeo é "será que isso
//      fica bom mesmo?". A resposta honesta é mostrar, não prometer.
//   2. A conta por FILME, derivada do preço e do custo do motor. A pessoa está
//      literalmente vivendo o custo do produto (o tempo) — é o instante de
//      maior disposição para avaliar se vale.
// Sem botão de compra. De propósito: pedir cartão de quem ainda não viu o
// próprio vídeo é o jeito mais rápido de queimar a única chance. A vitrine
// convence; o paywall do download cobra.
//
// ⚠️ PESO: os clipes são os MESMOS de public/previews que a home já usa (8s,
// 640px, 104-296KB), então já estão no cache de quem veio pela home. O de
// 820KB (Maracaibo) fica FORA daqui de propósito — durante um render a banda
// da pessoa está disputada, e um clipe pesado atrasaria o produto de verdade
// para enfeitar a espera dele. Trocar curadoria aqui exige conferir o tamanho
// do arquivo, não só o id.
//
// ⚠️ PAR COM lib/engineWall.ts: estes ids saem da CURADORIA MANUAL DO FUNDADOR
// (CURATED). Não inventar id novo; se um sumir de public/previews, o <video>
// falha em silêncio e o card fica preto — por isso cada um foi conferido em
// disco no dia em que este arquivo nasceu.

import { useEffect, useRef, useState } from 'react'
import { creditCostFor } from '@/lib/credits/engineCost'
import { TIER_CREDITS } from '@/lib/checkoutPricing'

type Vitrine = { id: string; badge: string; legenda: string }

// Curadoria do fundador (CURATED em lib/engineWall.ts), filtrada por PESO.
// Tamanhos conferidos em disco em 21/08.
const FILMES: Vitrine[] = [
  { id: '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba', badge: 'VEO 3.1', legenda: 'Runit Dome' }, // 244KB
  { id: 'c4e4fbab-0978-4daa-9fcf-119096370210', badge: 'KLING 2.5', legenda: 'Roman ruins' }, // 296KB
  { id: '75728dfb-3b29-47fa-aea8-b806d549a2b9', badge: 'SEEDANCE 1.5', legenda: 'North Sentinel' },
  { id: '98a5ac54-3c28-4a8f-8ba2-4071bc0388c4', badge: 'VEO 3.1', legenda: 'Night forest' }, // 256KB
  { id: '26d25419-6719-47ab-b24b-df214e007fbd', badge: 'KLING 2.5', legenda: 'The golden mountain' }, // 104KB
  { id: 'a88b7564-3592-4b12-9560-1646ea998e78', badge: 'SEEDANCE 1.5', legenda: 'Sea tornado' },
]

const SEEDANCE = creditCostFor('cinematic_ai')

export default function WaitingShowcase() {
  // Começa num ponto aleatório para que dois renders seguidos não mostrem a
  // mesma dupla — repetição na espera reforça "é sempre a mesma coisa", que é
  // exatamente a queixa que o fundador fez sobre as trilhas sonoras.
  const [base, setBase] = useState(0)
  const montado = useRef(false)

  useEffect(() => {
    if (montado.current) return
    montado.current = true
    setBase(Math.floor(Math.random() * FILMES.length))
  }, [])

  // Gira a cada 9s (os clipes têm 8s; 9 evita o corte seco no fim do loop).
  useEffect(() => {
    const t = setInterval(() => setBase((b) => (b + 2) % FILMES.length), 9000)
    return () => clearInterval(t)
  }, [])

  const visiveis = [FILMES[base % FILMES.length], FILMES[(base + 1) % FILMES.length]]

  // Filmes de IA que a mensalidade do Creator compra — DERIVADO, nunca
  // redigitado. É a mesma derivação do TrialDowngradeModal.
  const filmesPorMes = SEEDANCE > 0 ? Math.floor(TIER_CREDITS.basic / SEEDANCE) : 0

  return (
    <div className="mt-4">
      <div
        className="text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: 'var(--muted2)' }}
      >
        Made with Kineo — while you wait
      </div>

      <div className="grid grid-cols-2 gap-2">
        {visiveis.map((f) => (
          <div
            key={f.id}
            className="relative rounded-xl overflow-hidden"
            style={{ background: '#0d0d10', border: '1px solid var(--border)', aspectRatio: '500 / 280' }}
          >
            <video
              // `key` no id força o React a REMONTAR o elemento na troca. Sem
              // isso o browser reaproveita o <video> e às vezes segura o frame
              // antigo do clipe anterior por um instante — pisca e parece bug.
              key={f.id}
              src={`/previews/${f.id}.mp4`}
              autoPlay
              muted
              loop
              playsInline
              // preload="metadata" e não "auto": durante um render a banda é do
              // PRODUTO. A vitrine nunca pode competir com o vídeo que a pessoa
              // está pagando para receber.
              preload="metadata"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
            <div
              className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider"
              style={{ background: 'rgba(0,0,0,.72)', color: '#fff', backdropFilter: 'blur(4px)' }}
            >
              {/* SELO HONESTO — regra de marca (CLAUDE.md): o badge é o motor
                  REAL do render. Estes vêm do quality_mode do banco via a
                  curadoria; nunca escrever um selo à mão para "ficar melhor". */}
              {f.badge}
            </div>
            <div
              className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-semibold truncate"
              style={{ color: 'rgba(255,255,255,.92)', textShadow: '0 1px 3px rgba(0,0,0,.9)' }}
            >
              {f.legenda}
            </div>
          </div>
        ))}
      </div>

      {filmesPorMes > 0 && (
        <div className="mt-2 text-[11px]" style={{ color: 'var(--muted2)', lineHeight: 1.5 }}>
          Every film above was made on Creator — {filmesPorMes} AI films a month.
        </div>
      )}
    </div>
  )
}
