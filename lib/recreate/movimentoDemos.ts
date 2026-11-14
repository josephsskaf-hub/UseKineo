import 'server-only'

// KINEO-MOVIMENTO-REVISOR-2-1411 [2º revisor da CEO 14/11, itens 1, 2 e 3] — o DEMO do cartão de um molde de movimento, quando ele é o resultado do PRÓPRIO
// produto (um clipe da conta da casa no nosso bucket), mora AQUI, num módulo só do servidor: o RecreateClient ('use client') importa RECREATE_FORMATS
// inteiro, então uma URL do bucket no `preview` do catálogo iria no JavaScript público mesmo com o molde fechado. No catálogo, o `preview` do molde de
// movimento é sempre o asset nosso atrás do login (/api/recreate/assets/<chave>); a rota de assets, depois de conferir quem pode ver o molde, redireciona
// (302) para o demo daqui. Sem demo aqui, o cartão mostra o próprio guia.
// Cada URL: do bucket público renders DESTE ambiente (NEXT_PUBLIC_SUPABASE_URL), em clips/<dono>/<clipe>.mp4, e o dono é a conta da casa (trava de dono).
// Quem escreve aqui: scripts/recreate-movimento-novo-molde.mjs --trocar-demo (confere tudo pelo código real antes).

/** A conta da casa (josephsskaf@gmail.com; id conferido no banco em 14/11). Só clipe dela vira demo de molde. */
export const MOVIMENTO_DEMO_DONOS: readonly string[] = ['e92d81bf-0068-46c3-8de7-1f67e2006756']

/** id do molde → URL do clipe da casa que o cartão mostra. */
export const MOVIMENTO_DEMOS: Readonly<Record<string, string>> = {
}
