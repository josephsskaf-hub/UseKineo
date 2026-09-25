// KINEO-ADS-TESTE1-2026-09-26 — relatório do Cowork: a voz leu o WhatsApp "+55 11 98765-4321" como "mais 511-987-6543"
// (pulou dígitos) e o site "allbirds.com" como "alberts.com". O contato é a frase que vende: tem de sair certo.
// Módulo PURO: reescreve SÓ o que vai para a voz (o roteiro salvo, a legenda e o cartão final continuam como a pessoa
// escreveu). Telefone vira dígito por dígito em grupos; domínio vira "nome ponto com" na língua da narração.

const DIGITS: Record<string, readonly string[]> = {
  pt: ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'],
  fr: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'],
  de: ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'],
  it: ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'],
  nl: ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen'],
}
const PLUS: Record<string, string> = { pt: 'mais', en: 'plus', es: 'más', fr: 'plus', de: 'plus', it: 'più', nl: 'plus' }
const DOT: Record<string, string> = { pt: 'ponto', en: 'dot', es: 'punto', fr: 'point', de: 'Punkt', it: 'punto', nl: 'punt' }

const lang2 = (l: string | null | undefined) => (l ?? 'en').slice(0, 2).toLowerCase()

/** Telefone → dígitos falados em grupos (os grupos de quem escreveu), com o "+" dito. Sem tabela da língua: dígitos com espaço. */
export function speakPhone(raw: string, language?: string | null): string {
  const l = lang2(language)
  const words = DIGITS[l]
  const groups = raw.trim().replace(/[()]/g, ' ').split(/[\s.\-/]+/).filter(Boolean)
  const parts: string[] = []
  for (const g of groups) {
    const plus = g.startsWith('+')
    const d = g.replace(/\D/g, '')
    if (!d) continue
    const spoken = d.split('').map((c) => (words ? words[Number(c)] : c)).join(' ')
    parts.push(plus ? `${PLUS[l] ?? 'plus'} ${spoken}` : spoken)
  }
  return parts.join(', ')
}

/** "allbirds.com" → "allbirds ponto com"; "www." sai; "https://" sai. */
export function speakDomain(raw: string, language?: string | null): string {
  const dot = DOT[lang2(language)] ?? 'dot'
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('.').filter(Boolean).join(` ${dot} `)
}

// Telefone: + opcional, 9 a 16 dígitos com separadores comuns. Não pega preço (R$189), ano, nem número curto.
const PHONE = /(?<![\w$€£])\+?\(?\d[\d\s().\-/]{7,18}\d(?![\w%])/g
// Domínio: palavra.tld (tld conhecido) com www/https opcional; nunca e-mail (sem @ antes).
const DOMAIN = /(?<![@\w.])(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|app|shop|store|ai|br|pt|es|ng|in|nl|de|fr|it|uk|us|ca|au|mx|ar|cl|jo)(?:\.[a-z]{2})?(?:\/[^\s,;]*)?(?![\w.])/gi

/** Texto que vai para a voz: telefones e domínios falados por extenso. O resto fica igual. */
export function speakableForTts(text: string, language?: string | null): string {
  return text
    .replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 8 ? speakPhone(m, language) : m))
    .replace(DOMAIN, (m) => speakDomain(m, language))
}
