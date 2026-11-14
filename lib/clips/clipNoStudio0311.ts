// ═══ KINEO-CLIPE-NO-STUDIO-0311 [TRAVA 8.2 — fundador 03/11, pelo Canal do Revisor: "quero consertar tudo agora"] ═══
//
// O CASO (rodada do revisor 02/11, dois 1º vídeos, nota 4, nenhum baixado): os dois pedidos saíram do modo "Just this clip"
// do STUDIO (clip_generate_clicked vem de app/(dashboard)/studio/StudioClient.tsx), não da tela /clips — que já tinha as duas
// portas desde 30/10 (KINEO-CLIPE-OU-FILME-3010). No Studio o texto ia direto ao motor:
//   · deruh14 (PT): "Vender este produto", sem foto → Seedance inventou um cilindro preto genérico;
//   · morongclarence9 (PH): um "MASTER PROMPT" de 4.262 caracteres (vários vídeos de comparação militar) → um clipe mudo de
//     12 s com globo e bandeiras trocadas.
// O QUE MUDA: antes de gastar, o modo clipe do Studio decide pelo texto (a MESMA régua da tela /clips para roteiro de filme):
//   · 'venda'  — pede para vender/anunciar um produto e não há foto: a porta do Anúncio de produto (que pede a foto);
//   · 'filme'  — texto de filme (longo, conto, pede fala/duração, marcadores): o Studio troca para o Filme narrado;
//   · 'clipe'  — segue como hoje.
// Nada é cobrado nos dois desvios; a pessoa vê o porquê e o botão do caminho certo. Módulo puro (guardião
// scripts/test-clipe-no-studio-0311.mjs).
import { pareceRoteiroDeFilme } from './clipTextoLongo'

export const CLIPE_NO_STUDIO_VERSION = 'clipe_no_studio_0311_v1'
export const CLIPE_NO_STUDIO_EVENTOS = { venda: 'studio_clip_sale_to_ads', filme: 'studio_clip_script_to_film' } as const

// Verbo de vender/anunciar + "produto" nas 5 línguas do site (en/de/es/pt/fr). "este/esse/meu/this/my…" é opcional: o que
// importa é pedir a VENDA de um produto que a pessoa não mostrou. Lugar/serviço ("vender minha casa") não casa: exige produto.
const VERBO = '(?:vend(?:er|e|a|o|endo)|sell(?:ing|s)?|anunci(?:ar|e|a|o)|advertis(?:e|ing)|promov(?:er|a|e)|promot(?:e|ing)|divulg(?:ar|ue|a)|verkauf(?:en|e)?|bewerb(?:en|e)|vendre|vends?|vendez|promouvoir)'
const PRODUTO = '(?:produtos?|products?|productos?|produits?|produkte?s?|items?|artigos?|art[ií]culos?|articles?|artikel)'
const LIGA = '(?:\\s+(?:this|my|our|the|a|este|esse|essa|esta|meu|minha|nosso|nossa|o|a|um|uma|mi|mis|nuestro|el|un|una|ce|cet|cette|mon|ma|notre|le|la|un|une|dieses|diese|mein|meine|unser|das|ein|eine|de|do|da|del|du))*'
const VENDA_RE = new RegExp(`(?<![\\p{L}])${VERBO}${LIGA}\\s+${PRODUTO}(?![\\p{L}])`, 'iu')
// Alemão (ordem invertida): o objeto vem antes do verbo — "Dieses Produkt verkaufen", "mein neues Produkt bewerben".
const VENDA_INVERTIDA_RE = new RegExp(`(?<![\\p{L}])${PRODUTO}(?:\\s+\\p{L}+){0,2}\\s+(?:verkaufen|bewerben)(?![\\p{L}])`, 'iu')

/** O texto pede para vender/anunciar um produto (sem dizer qual é visualmente — a foto é que mostra). */
export function pedeVendaDeProduto(texto: string | null | undefined): boolean {
  const t = String(texto ?? '')
  return VENDA_RE.test(t) || VENDA_INVERTIDA_RE.test(t)
}

export type DecisaoClipeNoStudio = 'venda' | 'filme' | 'clipe'

/** KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 v2.1 — o teto do modo clipe do Studio: /api/generate-clip corta em
 *  CLIP_MAX_SECONDS de lib/cinematic/shotSpec.ts (12 s; os botões do Studio vão até 12). Copiado para esta lib seguir sem
 *  import; o guardião scripts/test-clipe-roteiro-qualquer-lingua-1411.mjs lê o shotSpec real e fica vermelho se separar. */
export const CLIPE_NO_STUDIO_MAX_SEGUNDOS = 12

/** O que o modo clipe do Studio faz com este texto (o Studio não manda foto no clipe: o desvio de venda vale sempre). */
export function decidirClipeNoStudio(texto: string | null | undefined): DecisaoClipeNoStudio {
  const t = String(texto ?? '').trim()
  if (!t) return 'clipe'
  if (pedeVendaDeProduto(t)) return 'venda'
  if (pareceRoteiroDeFilme(t, { maxSegundos: CLIPE_NO_STUDIO_MAX_SEGUNDOS })) return 'filme'
  return 'clipe'
}

/** A porta do Anúncio de produto a partir do clipe do Studio (a tela do Anúncio pede a foto). */
export const CLIPE_VENDA_ADS_HREF = '/ads?from=studio_clip&utm_source=studio&utm_medium=clip_sale&utm_campaign=clipe_no_studio_0311'
