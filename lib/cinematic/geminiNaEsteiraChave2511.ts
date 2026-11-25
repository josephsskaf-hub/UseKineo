// KINEO-NOME-HONESTO-2511 [CEO 25/11: "o motor mostrado é o motor real"] — a CHAVE do Gemini no filme grátis, sozinha, sem import nenhum. Mora aqui (e não em
// geminiNaEsteira2511.ts, que a reexporta) para que o nome público do motor (lib/freeFilmEngine.ts, que entra em telas do navegador) leia a chave sem levar
// junto a lista de contas da casa (lib/internalAccounts), que geminiNaEsteira2511.ts importa.
export type ModoGeminiNaEsteira2511 = 'off' | 'internal' | 'public'
// [dono 25/11 15:27: nota 10 ao filme de prova 7c374f02 (CEO); o sim para abrir ao cliente] 'public' = todo filme grátis que chega ao Kling 4 reference com
// clipe de 15 s exatos (a referência admitida: para cliente, UMA pessoa fotorreal, REFERENCIA_UNICA_2411 'public_humano'; duas referências continuam só da
// casa, DUAS_REFERENCIAS_2411 'internal'). Voltar: 'internal' = só a casa; 'off' = o pedido de antes do Gemini, byte a byte.
export const GEMINI_NA_ESTEIRA_2511: ModoGeminiNaEsteira2511 = 'public'
/** O nome público do motor (o mesmo da ficha da fal: google/gemini-omni-flash/v1.2). */
export const GEMINI_OMNI_NOME_PUBLICO_2511 = 'Gemini Omni Flash 1.2'
