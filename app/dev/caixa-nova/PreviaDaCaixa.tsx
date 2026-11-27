'use client'
// KINEO-CAIXA-NOVA-1511 — prévia de desenvolvimento: um CaixaNaMoldura de mentira (estado local) na MESMA CaixaNovaDoFilme da tela real.
// O número do botão vem do MESMO precoDoGenerate da tela real. O Generate daqui não navega nem cobra (só registra no console).
import { useEffect, useRef, useState } from 'react'
import type { CaixaNaMoldura } from '@/components/studio/StudioSimples'
import CaixaNovaDoFilme from '@/components/create/CaixaNovaDoFilme'
import { precoDoGenerate } from '@/lib/create/filmNaMoldura'
import { duracoesDoMotor, MOTOR_PADRAO } from '@/lib/create/motorOpcional'

export default function PreviaDaCaixa({ contaPaga, ideia, aviso, gratis, tema }: { contaPaga: boolean; ideia: string; aviso: boolean; gratis: boolean; tema: 'light' | 'dark' | null }) {
  const caixa = useRef<HTMLTextAreaElement>(null)
  const [texto, setTexto] = useState(ideia)
  const [duracao, setDuracao] = useState(60)
  const [formato, setFormato] = useState('9:16')
  const [lingua, setLingua] = useState('auto')
  const [palavraPorPalavra, setPalavraPorPalavra] = useState(false)
  const opcoesDuracao = duracoesDoMotor(MOTOR_PADRAO, false)
  const c: CaixaNaMoldura = {
    motor: MOTOR_PADRAO, texto, escrever: setTexto, caixa, aviso: aviso ? 'This text is too long. Shorten it a little and try again.' : null, limiteMax: 2000,
    duracao, opcoesDuracao, setDuracao, formato, formatos: ['9:16', '16:9', '1:1', '4:5'], setFormato, lingua, setLingua, palavraPorPalavra, setPalavraPorPalavra,
    camera: '', setCamera: () => {}, gerarComReferencias: () => {},
    maisOpcoes: '/studio?avancado=1', temFilmeGratis: gratis, gerar: () => console.info('[dev caixa-nova] Generate (prévia: nada é enviado)'),
    contaPaga, motores: [], motoresEstado: 'falhou', abrirMotores: () => {}, escolherMotor: () => {}, kling4: null,
  }
  useEffect(() => { if (tema) document.documentElement.dataset.theme = tema }, [tema]) // fotos em claro e escuro sem mexer na preferência guardada
  const preco = precoDoGenerate({ motor: c.motor, duracao, contaPaga, palavraPorPalavra, texto, opcoesDuracao, kling4: null })
  return <CaixaNovaDoFilme c={c} preco={preco} showRecreate showClip />
}
