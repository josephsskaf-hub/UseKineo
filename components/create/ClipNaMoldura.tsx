'use client'

// KINEO-CLIP-NA-MOLDURA-1011 [fundador 10/11: clicou num clipe da home e caiu na tela ANTIGA de Clips — "quero a tela nova"]
// A aba Clip É o gerador de Clips de hoje (app/(dashboard)/clips/ClipsClient.tsx: mesmo estado, mesmo pedido, preço só no botão, mesmo upload,
// mesmo polling, mesmos eventos) desenhado na moldura do Recreate. Este arquivo só POSICIONA as peças que o ClipsClient entrega:
//   painel (esquerda)  — abas, título e a caixa do clipe (texto, Add photo, avisos, "Details" fechado com motor/duração/formato, botão);
//   palco (centro)     — "My clips" (e a estreia do clipe pedido, que vive na caixa);
//   fileira (embaixo)  — "Trending this week" + os efeitos, como a fileira de exemplos das outras abas.
// Não tem estado, rede, roteador nem evento próprio. Interruptor: CREATE_CLIP_INPLACE (lib/create/clipNaMoldura.ts).
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import ClipsClient from '@/app/(dashboard)/clips/ClipsClient'
import CreateTabs from './CreateTabs'
import CreateNavConta from './CreateNavConta'
import '@/app/recreate/recreate.css'
import './create.css'

export const CLIP_MOLDURA_COPY = { eyebrow: 'CLIP', title: 'One scene. Your idea in motion.', details: 'Details' } as const // cabeçalho e painel como o CreateShell da main (abas no topo, sem subtítulo)

export default function ClipNaMoldura({ measurementActor = null, showRecreate = true }: { measurementActor?: string | null; showRecreate?: boolean }) {
  return <ClipsClient measurementActor={measurementActor} rotuloDosAjustes={CLIP_MOLDURA_COPY.details} moldura={p => <main className="recreate create-shell create-clip" data-create-shell="clip">
    <header className="rc-nav ct-nav"><Link href="/" className="rc-brand"><KineoBrandIcon size={28} /><span>Kineo</span></Link><CreateTabs active="clip" showRecreate={showRecreate} showClip /><CreateNavConta /></header>
    <div className="rc-workspace">
      <aside className="rc-panel" aria-label={CLIP_MOLDURA_COPY.title}>
        <div className="rc-panel-intro"><span className="rc-eyebrow">{CLIP_MOLDURA_COPY.eyebrow}</span><h1>{CLIP_MOLDURA_COPY.title}</h1></div>
        <div className="stu clips-workspace ct-clip-box">{p.estilos}{p.grade}</div>
      </aside>
      <section className="rc-reference ct-clip-stage" aria-label="My clips">
        <div className="stu clips-workspace">{p.meusClipes}</div>
      </section>
      <section className="rc-gallery ct-clip-gallery" aria-label="Trending this week">
        <div className="stu clips-workspace">{p.tendencias}{p.efeitos}</div>
      </section>
    </div>
  </main>} />
}
