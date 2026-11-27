'use client'

import type { ReactNode, RefObject } from 'react'
import CaixaDeCriar, { type ChipDaCaixa, type ExemploDaCaixa } from './CaixaDeCriar'
import { IMG_ENGINES, type ImgModelKey } from '@/lib/imageModels'
import ControlIcon from '@/components/ControlIcon'

type Props = {
  prompt: string
  setPrompt: (text: string) => void
  promptRef: RefObject<HTMLTextAreaElement>
  model: ImgModelKey
  setModel: (model: ImgModelKey) => void
  formats: { key: string; label: string }[]
  size: string
  setSize: (size: string) => void
  cost: number
  error: string | null
  pending: boolean
  buttonLabel: string
  references: ReactNode
  examples: ExemploDaCaixa[]
  selected: number
  choose: (idx: number) => void
  generate: () => void
}

export default function ImageCreationBox(p: Props) {
  const engine = IMG_ENGINES.find(e => e.key === p.model)!
  function engines(advanced: boolean, close: () => void) {
    return IMG_ENGINES.filter(e => !['schnell', 'dev', 'seedream'].includes(e.key) === advanced).map(e =>
      <button type="button" className="cx-opcao cx-opcao-larga" key={e.key} aria-pressed={e.key === p.model}
        onClick={() => { p.setModel(e.key); close() }}>{e.name}<small>{e.credits}</small></button>)
  }
  const chips: ChipDaCaixa[] = [
    { id: 'engine', nome: 'Engine', valor: engine.name, icone: <ControlIcon name="image" />, menu: close =>
      <div className="cx-lista">{engines(false, close)}
        <details open={['grok', 'recraft', 'nanobanana'].includes(p.model) || undefined}>
          <summary>More engines</summary>{engines(true, close)}
        </details>
      </div> },
    { id: 'format', nome: 'Format', valor: p.formats.find(s => s.key === p.size)!.label.split(' · ')[0],
      icone: <ControlIcon name="image" />, menu: close => <div className="cx-lista">{p.formats.map(s =>
        <button type="button" key={s.key} className="cx-opcao" aria-pressed={s.key === p.size}
          onClick={() => { p.setSize(s.key); close() }}>{s.label}</button>)}</div> },
  ]
  return <CaixaDeCriar titulo="What do you want to make?" texto={p.prompt} aoEscrever={s => p.setPrompt(s.slice(0, 2000))}
    caixaRef={p.promptRef} placeholder="Describe your image…" aviso={p.error} limiteMax={2000}
    foto={null} chips={chips} gerar={{ aoClicar: p.generate, custo: p.cost, label: p.buttonLabel, checking: p.pending, testId: 'image-generate' }}
    confianca={['Review the cost before generating', 'Download your image']} nota={p.references}
    exemplos={p.examples} exemplosTitulo="Try one" exemplosDica="Choose an example to start with its idea."
    exemploAtivo={p.examples[p.selected]?.id ?? null} aoEscolherExemplo={e => p.choose(p.examples.findIndex(x => x.id === e.id))} />
}
