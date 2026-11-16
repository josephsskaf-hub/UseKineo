'use client'

// KINEO-CLIP-RECREATE-JUNTOS-1511 [dono 15/11: "vamos juntar a aba de Clips com a aba de Recreate, porque no fundo é a mesma coisa… o fluxo de Clips
// é ótimo, parece com o dos outros líderes; o Recreate tem mais opções de vídeo. Juntar os dois num só, usando o melhor de cada: manter o fluxo na
// lateral como hoje, os vídeos que dá para recriar EMBAIXO e o modelo escolhido rodando à DIREITA como padrão."]
// UMA tela, aba "Clip" (Film · Clip · Cartoon · Ads). Este arquivo só POSICIONA as peças que os dois geradores de hoje já entregam:
//   ClipsClient   (app/(dashboard)/clips/ClipsClient.tsx, `moldura`)  — a caixa do clipe, as tendências, os efeitos e My clips;
//   RecreateClient (app/recreate/RecreateClient.tsx, `moldura`)       — o painel do modelo, o palco, a grade dos modelos e o diálogo.
//   esquerda  — sem modelo escolhido: a caixa do Clips; com modelo: o painel do Recreate (vídeo-base + "Change", "Your photo", Generate com o custo);
//   direita   — o modelo escolhido tocando; sem escolha, o primeiro modelo público da grade (o mais novo: o servidor manda do mais novo ao mais antigo);
//   embaixo   — a grade dos modelos (só o que ESTA conta pode ver: o servidor filtra) e, depois, as tendências e os efeitos do Clips e My clips.
// Tocar num cartão só ESCOLHE (preenche o painel); nada gera sozinho. Sem estado, rede, roteador nem evento próprios: o pedido ao /api/clips e ao
// /api/recreate é o de sempre (scripts/test-clip-recreate-juntos-1511.mjs). Interruptor: CLIP_RECREATE_JUNTOS_RELEASE (lib/create/release.ts).
import Link from 'next/link'
import type { ComponentProps, SyntheticEvent } from 'react'
import { KineoBrandIcon } from '@/components/KineoBolt'
import ClipsClient from '@/app/(dashboard)/clips/ClipsClient'
import RecreateClient from '@/app/recreate/RecreateClient'
import RecreatePlayer from '@/app/recreate/RecreatePlayer'
import type { RecreateFormat } from '@/lib/recreate/formats'
import { publicRecreatePath } from '@/lib/recreate/entry'
import CreateTabs from './CreateTabs'
import CreateNavConta from './CreateNavConta'
import { CLIP_MOLDURA_COPY } from './ClipNaMoldura'
import '@/app/recreate/recreate.css'
import '@/app/recreate/currentFlow.css'
import './create.css'
import './clip-recreate-juntos.css'

/** Para onde a URL volta quando a pessoa sai do modelo (a aba Clip). Escolher um modelo leva a URL a /recreate/<id>, como no Recreate de hoje. */
export const JUNTOS_VOLTA = '/create/clip'
export const JUNTOS_COPY = { voltar: '← Clip from your idea', palco: 'Video template', recriar: 'Recreate this ↗', efeitos: 'Clip effects' } as const

export type RecreateProps = Omit<ComponentProps<typeof RecreateClient>, 'moldura'>

/** O modelo que toca à direita antes de qualquer escolha: o primeiro com link público (a vitrine), senão o primeiro da grade desta conta. */
// KINEO-PALCO-INVADER-1611 [dono 16/11 ~01:55: "se a gente puder já colocar o vídeo do Invader na tela principal, seria animal… os que têm de novidade têm que ficar
// sempre no começo"] — ANTES da regra de sempre: o molde ABERTO mais novo da máquina de trechos (o servidor marca `palco` só no molde aberto ao público e só o manda a
// quem pode vê-lo; o catálogo vem do mais novo ao mais antigo). Visitante não recebe o molde: segue a regra de sempre.
export function palcoPadrao(catalogo: readonly RecreateFormat[]): RecreateFormat | null {
  const destaque = catalogo.find(f => f.palco === true)
  if (destaque) return destaque
  return catalogo.find(f => publicRecreatePath(f.id) !== null) ?? catalogo[0] ?? null
}

const detalhe = (f: RecreateFormat) => `${f.type === 'swap' ? 'Face swap' : f.type === 'motion' ? 'Motion' : 'Photo effect'} · ${f.seconds} s · ${f.photoSlots} ${f.photoSlots === 1 ? 'photo' : 'photos'}` // a MESMA linha do palco do Recreate

/** Os títulos (minúsculos) que a grade de modelos desta conta já mostra: o mesmo efeito não aparece de novo nas fileiras do Clips embaixo
 *  (antes, "Melt it" e mais 20 apareciam 2 ou 3 vezes na mesma tela). Sem lista do servidor, nada some. */
export function titulosDaGrade(formatos: readonly { title: string }[] | undefined): ReadonlySet<string> {
  return new Set((formatos ?? []).map(f => f.title.trim().toLowerCase()))
}

export default function ClipRecreateJuntos({ measurementActor = null, recreate }: { measurementActor?: string | null; recreate: RecreateProps }) {
  const semRepetir = titulosDaGrade(recreate.formatos) // sem hook: este componente só posiciona (o guardião o chama como função pura)
  return <ClipsClient measurementActor={measurementActor} rotuloDosAjustes={CLIP_MOLDURA_COPY.details} semRepetir={semRepetir} moldura={clip => <RecreateClient {...recreate} moldura={rc => {
    const modelo = rc.selecionado
    const padrao = modelo ? null : palcoPadrao(rc.catalogo)
    const midia = padrao ? rc.midia(padrao) : null
    // Efeito ou tendência do Clips com um modelo aberto: o painel volta ao Clips primeiro (as mesmas travas do Recreate). Recusou = o clique não passa.
    const voltaAoClipe = (event: SyntheticEvent) => { if (rc.selecionado && !rc.soltar(JUNTOS_VOLTA)) { event.preventDefault(); event.stopPropagation() } }
    return <main className={`recreate rc-current-flow create-shell create-clip ct-juntos${modelo ? ' ct-juntos-modelo' : ''}`} data-create-shell="clip" data-clip-recreate-juntos={modelo ? 'recreate' : 'clip'}>
      <header className="rc-nav ct-nav"><Link href="/" className="rc-brand" onClick={rc.sair}><KineoBrandIcon size={28} /><span>Kineo</span></Link><CreateTabs active="clip" showRecreate={false} showClip /><CreateNavConta /></header>
      {clip.estilos}{/* os estilos e a telemetria do Clips ficam montados nos dois painéis (sem eles, a grade de efeitos perde o CSS quando um modelo está aberto) */}
      {rc.aviso}
      <div className="rc-workspace">
        {modelo ? <aside className="rc-panel" aria-label="Create your version">
          <button type="button" className="ct-juntos-voltar" data-juntos-voltar="" disabled={rc.ocupado} onClick={() => rc.soltar(JUNTOS_VOLTA)}>{JUNTOS_COPY.voltar}</button>
          {rc.painel}
        </aside> : <aside className="rc-panel ct-juntos-clip" aria-label={CLIP_MOLDURA_COPY.title}>
          <div className="rc-panel-intro"><span className="rc-eyebrow">{CLIP_MOLDURA_COPY.eyebrow}</span><h1>{CLIP_MOLDURA_COPY.title}</h1></div>
          <div className="stu clips-workspace ct-clip-box">{clip.grade}</div>
        </aside>}
        <section className="rc-reference" aria-label={modelo ? 'Base video' : JUNTOS_COPY.palco}>
          {modelo ? rc.palco : padrao && midia && <div className="rc-stage" data-juntos-palco={padrao.id}><RecreatePlayer key={padrao.id} src={midia.video} poster={midia.poster} preview label={`${JUNTOS_COPY.palco}: ${padrao.title}`}
            stage={{ kind: JUNTOS_COPY.palco, title: padrao.title, detail: detalhe(padrao), action: <button type="button" className="rc-change" data-juntos-recriar={padrao.id} onClick={() => rc.escolher(padrao)}>{JUNTOS_COPY.recriar}</button> }} /></div>}
        </section>
        <section className="rc-gallery ct-juntos-galeria" ref={rc.galeriaRef} aria-label="Video templates">
          {rc.galeria}
          <div className="stu clips-workspace ct-juntos-efeitos" aria-label={JUNTOS_COPY.efeitos} onClickCapture={voltaAoClipe}>{clip.tendencias}{clip.efeitos}</div>
          <div className="stu clips-workspace ct-juntos-meus">{clip.meusClipes}</div>
        </section>
      </div>
      {rc.dialogo}
    </main>
  }} />} />
}
