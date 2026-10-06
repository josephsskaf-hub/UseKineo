// KINEO-MOTORES-GEO-2026-10-06 — a normalização ÚNICA que os guardiões de TRAVA da página de motor usam para descontar
// desta mudança SÓ o que ela acrescentou ou corrigiu (TAREFA 12 da sessão CEO, 06/10: página de motor feita para o
// ChatGPT citar). Tudo o mais da página continua travado byte a byte. O conteúdo novo é provado à parte, com mutantes,
// por scripts/test-motores-geo-2026-10-06.mjs.
//
// Quem usa: test-citation-engine-metadata (corpo da EnginePage vs 560b5e2f), test-paid-seedance-bridge-2026-09-28
// (arquivo inteiro vs cdb154e2), test-seedance-hero-plans-2026-09-28 e test-veo-hero-plans-2026-09-30 (HTML renderizado
// de cada motor vs a página-base, ambos com as libs atuais).
//
// FONTE: desfaz EXATAMENTE as 11 edições de app/ai-video-generator/[engine]/page.tsx (linhas novas saem; os prefixos
// `geo ? geo.X : ` inseridos saem; as duas linhas de texto JSX que viraram expressão voltam). Qualquer outra diferença
// continua vermelha nos guardiões.
// HTML: tira os dois blocos novos (marcados com data-kineo) e torna NEUTROS, nos DOIS lados, os 6 lugares cujo texto
// esta mudança passou a escrever (nota de acesso, tempo de entrega, passo 3, nota da fonte de preço, linha final e rótulo
// dos CTAs de cadastro). Neutralizar dos dois lados é o que mantém a comparação honesta: o resto tem de bater igual.

const LINHAS_NOVAS = [
  "import { EngineAnswerLead, EnginePriceCard, engineGeoFor, pausedAccessNote } from '@/components/EngineCitationAnswer' // KINEO-MOTORES-GEO-2026-10-06",
  '  const geo = engineGeoFor(params.engine) // KINEO-MOTORES-GEO-2026-10-06 — camada citável; null = motor pausado/aposentado (página no modo antigo)',
  '          {geo && <EngineAnswerLead geo={geo} />}',
  '        {geo && <EnginePriceCard geo={geo} ctaHref={signupUrl} campaign={campaign} />}',
]
const PREFIXOS_INSERIDOS = [
  'geo ? geo.accessNote : enginePaused(e.param) ? pausedAccessNote(e.name, enginePaused(e.param)!) : ',
  'geo ? geo.ctaLabel : ',
  'geo ? geo.turnaround : ',
  'geo ? geo.howStep3 : ',
]
const LINHAS_TROCADAS = [
  [
    '            {geo ? geo.costsNote : <>Credit costs read from Kineo&rsquo;s single pricing source (August 2026). Engines and costs may change.</>}',
    '            Credit costs read from Kineo&rsquo;s single pricing source (August 2026). Engines and costs may change.',
  ],
  [
    '            {geo ? geo.finalLine : <>One idea in, a ready-to-post vertical Short out. No editing timeline. Free to start.</>}',
    '            One idea in, a ready-to-post vertical Short out. No editing timeline. Free to start.',
  ],
]

/** Fonte (LF) da página de motor → a mesma fonte sem as 11 edições desta mudança. */
export function semMotoresGeoFonte(src) {
  const lf = src.replace(/\r\n/g, '\n')
  let out = lf.split('\n').filter((linha) => !LINHAS_NOVAS.includes(linha)).map((linha) => {
    const troca = LINHAS_TROCADAS.find(([nova]) => nova === linha)
    return troca ? troca[1] : linha
  }).join('\n')
  for (const p of PREFIXOS_INSERIDOS) out = out.split(p).join('')
  return out
}

/** Quantas edições desta mudança a fonte contém (o guardião exige 11 — prova que a normalização tem sujeito). */
export function edicoesMotoresGeo(src) {
  const lf = src.replace(/\r\n/g, '\n')
  const linhas = lf.split('\n')
  return LINHAS_NOVAS.filter((l) => linhas.includes(l)).length
    + PREFIXOS_INSERIDOS.reduce((n, p) => n + (lf.split(p).length - 1), 0)
    + LINHAS_TROCADAS.filter(([nova]) => linhas.includes(nova)).length
}

// Rótulos dos CTAs de cadastro que esta mudança reescreve (novo: "Make a <motor> video →"; antigos: os da porta de
// entrada). "See plans & credits →" e "Create your account" (hero do Seedance/Veo) NÃO casam — seguem travados.
const ROTULO_CTA = /^(?:Make a .+ video →|Start free — \d+ credits →|Try .+ free →|Try Creator 7 days for \$1 →)$/

/** HTML renderizado da página de motor → sem os 2 blocos novos e com os 6 lugares reescritos neutralizados. */
export function semMotoresGeoHtml(html) {
  return html
    .replace(/<p data-kineo="engine-answer"[^>]*>[\s\S]*?<\/p>/g, '')
    .replace(/<section data-kineo="engine-price-card"[\s\S]*?<\/section>/g, '')
    .replace(/(<p style="font-size:0\.82rem;color:#86868b;margin:12px 0 0">)[\s\S]*?(<\/p>)/g, '$1[motores-geo:acesso]$2')
    .replace(/(>Typical turnaround<\/td><td[^>]*>)[\s\S]*?(<\/td>)/g, '$1[motores-geo:tempo]$2')
    .replace(/(>Download &amp; post<\/div><p[^>]*>)[\s\S]*?(<\/p>)/g, '$1[motores-geo:passo3]$2')
    .replace(/(<p style="font-size:0\.74rem;color:#6e6e73;text-align:center;margin:10px 0 0">)[\s\S]*?(<\/p>)/g, '$1[motores-geo:fonte]$2')
    .replace(/(<p style="color:#86868b;margin:8px 0 18px;font-size:0\.95rem">)[\s\S]*?(<\/p>)/g, '$1[motores-geo:linha-final]$2')
    .replace(/(<a [^>]*>)([^<]*)(<\/a>)/g, (m, abre, rotulo, fecha) => (ROTULO_CTA.test(rotulo) ? `${abre}[motores-geo:cta]${fecha}` : m))
}
