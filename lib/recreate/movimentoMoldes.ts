// KINEO-RECEITA-FORA-DO-JS-1411 [CEO 14/11: "a receita está no JavaScript público" — o chunk do /recreate trazia "jogada-de-futebol", "Football play" e os textos da ação]
// Os moldes de MOVIMENTO, INTEIROS (a vitrine e a receita: cena, ação, guia), moram aqui. Só o servidor lê este arquivo: nenhum módulo 'use client' o
// alcança pelo grafo de imports (o guardião scripts/test-recreate-movimento-1411.mjs percorre o grafo a partir de todo 'use client' e procura as frases
// da receita). Sem import 'server-only' de propósito: os guardiões carregam estes módulos num loader sem esse dublê; a prova é o guardião do grafo.
// O catálogo completo (troca + efeito + movimento) é lib/recreate/catalogoServidor.ts; ao navegador vai só a vitrine (paraOCliente).
import type { RecreateFormat } from './formats'

/** O pôster de cada molde de movimento (asset nosso; o guia mora no bucket privado: ./guiasManifesto). A rota de assets lê este mapa junto com RECREATE_ASSETS. */
export const MOVIMENTO_ASSETS: Readonly<Record<string, { file: string; contentType: string }>> = {
  'jogada-de-futebol.jpg': { file: 'recreate-mov-jogada-de-futebol.jpg', contentType: 'image/jpeg' }, // KINEO-RECREATE-MOVIMENTO-MOLDE-1411 — quadro de 1 s, 720 px
}

// KINEO-RECREATE-MOVIMENTO-1411 [CEO 14/11 07:00] — os moldes de MOVIMENTO. Cada um: o guia no manifesto do bucket privado, o pôster em MOVIMENTO_ASSETS
// e a linha abaixo (a ferramenta scripts/recreate-movimento-novo-molde.mjs escreve os três). Exemplo (a CEO preenche com o demo validado):
//   { id: 'lance-de-futebol', title: 'Football run', desde: 'AAAA-MM-DD', type: 'motion', preview: '/api/recreate/assets/lance-de-futebol.mp4',
//     poster: '/api/recreate/assets/lance-de-futebol.jpg', guia: 'lance-de-futebol.mp4', seconds: 10, photoSlots: 1, pessoasNoGuia: 1,
//     prompt: '', movimentoAprovado: false,
//     cena: 'standing on a plain green football pitch with plain solid-colour kits around, framed from the knees up, their face clearly visible and turned slightly toward the camera',
//     acao: 'The person runs forward and dribbles a white football, the camera follows at the side, plain green pitch with plain unmarked boards' }
// Guardião: scripts/test-recreate-movimento-1411.mjs (molde de 10 s, guia nosso, uma pessoa, frases positivas, enquadramento).
export const RECREATE_MOVIMENTO_MOLDES: readonly RecreateFormat[] = [
  { id: 'jogada-de-futebol', title: 'Football play', desde: '2026-11-14', type: 'motion', preview: '/api/recreate/assets/jogada-de-futebol.mp4', poster: '/api/recreate/assets/jogada-de-futebol.jpg', guia: 'jogada-de-futebol.mp4', seconds: 6, photoSlots: 1, pessoasNoGuia: 1, prompt: '', movimentoAprovado: false,
    // KINEO-MOVIMENTO-CORPO-INTEIRO-1411 [CEO 14/11, teste pago no painel (US$ 0,57): corpo inteiro na imagem = o vídeo sai com o corpo inteiro, a bola no pé e os defensores]
    // KINEO-RECEITA-FORA-DO-JS-1411 [CEO 14/11, validação 6a08156f: risco no tênis e número/escudo nas camisas] — tênis todo preto de sola preta (cena e ação) e camisas de frente e costas numa cor só (sem teste pago)
    cena: 'standing on the grass of a football pitch during a daytime match, full body from head to shoes, the person fills most of the frame height, their face clearly visible and turned slightly toward the camera, a white football on the grass at their feet, in a relaxed athletic stance ready to run, wearing a plain navy long-sleeve shirt, dark trousers and plain all-black shoes with black soles, with an out-of-focus stadium behind them: plain grey stands and a plain low white wall around the pitch, natural afternoon light', // KINEO-MOVIMENTO-REVISOR-2-1411 — era: plain dark stands (a ação agora diz grey)
    acao: 'The person dribbles a football at full speed across the pitch in the middle of a live TV football match, the camera panning with them. They dribble past a defender, then collide with the defender and both fall onto the grass. The person wears plain all-black shoes with black soles. Players of both teams wear plain solid kits with plain blank shirts, fronts and backs in one solid colour: one team all red, the other all white. Natural afternoon light. The pitch is surrounded only by a plain low white wall and plain grey stands.' }, // KINEO-MOVIMENTO-REVISOR-2-1411 [ideia da CEO 14/11 contra a placa com letras aos 4 s: prender o entorno no FIM da ação; sem teste pago]
]
