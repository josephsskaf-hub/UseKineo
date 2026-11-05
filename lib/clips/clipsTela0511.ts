// KINEO-CLIPS-TELA-0511 — fundador 05/11: toda tela de criação segue o mesmo esqueleto (entrada primeiro, um botão principal, preço só nele,
// opcionais recolhidos, mesmas cores de botão) e, em Clips, a galeria de clipes fica ABAIXO da caixa. Referência: /kids-cartoon e a tela nova
// de anúncio (.ace-more, em lib/kidsCartoon/telaCartoon.ts). Este arquivo guarda só o que é novo; a ordem da tela está em ClipsClient.tsx.
// Só apresentação: nada aqui muda preço, crédito, motor, rota de API ou o que vai no pedido de gerar.
// Guardião: scripts/test-clips-tela-0511.mjs
import { FORA_DE_ESTACAO } from '@/lib/clipesNos2Lugares'
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

/** A lista é a mesma da home e do /made-with-kineo. Tira da VITRINE, nunca do catálogo: ?effect=witch, /effects/<slug> e /ai-halloween-video seguem no ar. */
export function efeitosDaVitrineDoClipe<E extends { key: string }>(effects: readonly E[]): E[] {
  return effects.filter((fx) => !FORA_DE_ESTACAO.efeitos.includes(fx.key))
}

const MAIS_OPCOES: Record<InterfaceLanguage, string> = {
  en: 'More options',
  pt: 'Mais opções',
  es: 'Más opciones',
  fr: 'Plus d’options',
  de: 'Weitere Optionen',
  it: 'Altre opzioni',
  nl: 'Meer opties',
  pl: 'Więcej opcji',
  tr: 'Daha fazla seçenek',
  ru: 'Другие настройки',
  uk: 'Інші налаштування',
  ar: 'خيارات أكثر',
  ur: 'مزید اختیارات',
  hi: 'और विकल्प',
  id: 'Opsi lainnya',
  vi: 'Tùy chọn khác',
}

export function clipsTelaMaisOpcoes(language: InterfaceLanguage): string {
  return MAIS_OPCOES[language] ?? MAIS_OPCOES.en
}

// O recolhido copia .ace-more (mesma borda, raio, altura mínima e foco); o botão usa o mesmo --accent do .kkc-go.
export const CLIPS_TELA_CSS = `
.stu.clips-workspace{--indigo:var(--accent,#0A5CFF)}
.stu.clips-workspace .grid.creation-grid.clip-livre{grid-template-columns:minmax(0,1fr);gap:14px}
.stu.clips-workspace .clip-livre .rail{position:static}
.stu.clips-workspace .clip-more{border:1px solid var(--border);border-radius:12px;background:var(--card);min-width:0}
.stu.clips-workspace .clip-more>summary{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;list-style:none;font-size:13px;min-height:44px}
.stu.clips-workspace .clip-more>summary::-webkit-details-marker{display:none}
.stu.clips-workspace .clip-more>summary::after{content:'▾';margin-inline-start:auto;color:var(--muted);transition:transform .15s ease}
.stu.clips-workspace .clip-more[open]>summary::after{transform:rotate(180deg)}
.stu.clips-workspace .clip-more>summary:focus-visible{outline:3px solid var(--accent,#0A5CFF);outline-offset:3px;border-radius:12px}
.stu.clips-workspace .clip-more-list{color:var(--muted);font-size:12px;min-width:0;overflow-wrap:anywhere}
.stu.clips-workspace .clip-more-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:6px 12px 14px;min-width:0}
.stu.clips-workspace .clip-more-engines{grid-column:1/-1;min-width:0}
.stu.clips-workspace .clip-more .clip-engines{margin:0}
.stu.clips-workspace .cost{padding:0;background:none;border:0;border-radius:0;overflow:visible}
.stu.clips-workspace .cost::before{display:none}
.stu.clips-workspace .cost .sum{color:var(--muted)}
.stu.clips-workspace .go.ok,.stu.clips-workspace .go.no{border-radius:11px;font-weight:750}
.stu.clips-workspace .go.ok:hover{transform:none;box-shadow:none;filter:brightness(1.08)}
.stu.clips-workspace .clip-livre .cost{display:flex;flex-wrap:wrap;gap:8px}
.stu.clips-workspace .clip-livre .cost .go{width:auto;min-width:280px;padding:14px 26px;font-size:16px}
.stu.clips-workspace .clip-meus{margin-top:6px}
@media(max-width:760px){.stu.clips-workspace .clip-more-body{grid-template-columns:minmax(0,1fr)}.stu.clips-workspace .clip-livre .cost .go{width:100%;min-width:0}}
`
