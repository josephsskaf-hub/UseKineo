# A espera do filme — Div. 5 Plataforma, 11/11/2026 (noite)

Pedido da CEO (fundador: "tasks pra melhorar a receita até as 21:30"). Hoje 2 de 5 clientes reais saíram durante o render do Kling 4
grátis e nunca viram o filme (05:06 e 07:06 BRT).

Leitura no banco, só consulta: 14 dias, contas da casa fora, mesma régua de `lib/internalAccounts.ts`. Nenhum render pago.

## 1. Quantos primeiros filmes ficaram prontos com a pessoa fora

"Fora" quer dizer nenhum evento do navegador entre 3 min antes e 1 min depois do filme pronto.

| | Primeiros filmes | p50 do render | p90 | Pessoa fora na hora | Voltou em 1 h | Voltou em 24 h | Nunca voltou |
|---|---|---|---|---|---|---|---|
| **Todos** | **74** | 6,7 min | 10,3 min | **25 (34%)** | 6 | 6 | **18 (72% dos que saíram)** |
| Kling 4 (grátis) | 52 | 7,3 min | 10,1 min | 18 | 4 | 4 | 13 |
| Seedance | 18 | 5,5 min | 12,4 min | 6 | 2 | 2 | 4 |
| H3 Turbo | 4 | 3,7 min | 3,9 min | 1 | 0 | 0 | 1 |

- **Quem volta, volta logo:** ninguém voltou entre 1 h e 24 h. O e-mail das horas seguintes não trouxe ninguém.
- **Quando saíram:** dos 22 com sinal, **13 saíram nos 2 primeiros minutos**, 4 entre 2 e 4, 4 entre 4 e 6, e 1 depois disso.
- **Ficar decide tudo:**

  | | Viu o filme | Baixou | Abriu oferta | Pagou |
  |---|---|---|---|---|
  | Ficou (49) | **37 (76%)** | **18** | 11 | 2 |
  | Saiu (25) | **2 (8%)** | 2 | 3 | 1 |

## 2. O e-mail "filme pronto"

- **Atraso:** nenhum. Os 96 filmes entregues em 14 dias tiveram e-mail. Nos últimos 20, o atraso foi de **2 s em média e 3 s no máximo**.
  - Os dois casos de hoje saíram no mesmo segundo do filme pronto (05:06:39 e 07:06:14), pelo caminho de aba fechada (`email: status_route`). Um e-mail só para cada.
- **O provedor aceitou?** Sim: o evento `video_ready_email_sent` só é gravado quando o Resend responde 2xx (`app/api/compose/status/[renderId]/route.ts:1425-1450`).
- **Devolução:** **não dá para saber.** Não há webhook de devolução, e a chave do Resend no `.env.local` está inválida (trocada), então não consultei o provedor.
- **O link:** o botão "⬇ Download Your Short" aponta para o **MP4 cru no bucket do Supabase** (`safeVideoUrl`, `route.ts:1259`).
  - Abre sem login: testado em 11/11, `200 video/mp4`, 6,4 MB.
  - Mas **não traz a pessoa de volta à Kineo**, e o clique **não deixa rastro**.
- **Oferta do filme completo:** sai no mesmo e-mail com o botão azul grande, e o filme vira botão secundário.
  - O link `/api/film-complete/checkout` sem sessão vai a `/login?redirect=…`, que **preserva o destino** (`lib/authRedirect.ts` aceita `/api/…`; o login faz navegação completa).
- **Idioma:** o e-mail sai inteiro em inglês ("Your Short is ready! ⚡ … YouTube Short"). A oferta tem tradução para 16 línguas, mas o envio não passa `language`.

**Veredito:** nenhum DEFEITO dos três pedidos (atraso, link que cai na home, login que perde o destino), então não houve conserto no e-mail. O que existe é fraqueza de desenho, e ela vai para as propostas abaixo.

## 3. A tela de espera

A tela é a mesma para `/generate` e `/studio/create`: GenerateClient → `PremiereStage`. No modo filme, que inclui o Kling 4 grátis:

> `app/(dashboard)/generate/GenerateClient.tsx:17478` (antes): "Typically ready in ~3 min. You can close this tab — we'll email you the link when your premiere is ready."

- **Promete 3 min**, e o real é 7,3 min (p50) e 10,1 min (p90) no Kling 4.
- **Convida a fechar a aba**, e 13 de 22 fecharam nos 2 primeiros minutos.
- Não mostra tempo estimado além dessa frase. A barra de progresso é a do render.

## 4. A mudança de hoje (commit local, este branch)

Novo texto: "Usually ready in 5–10 minutes. Stay on this page and your film plays right here the moment it's done — if you need to leave, we'll email you the link."

- Só o modo filme. O modo rápido/creator ficou byte a byte.
- Guardião `scripts/test-espera-honesta-1111.mjs`: 9 verificações, com 2 mutantes. `tsc` limpo.
- `desfaz-estreia-3110` já estava quebrada antes desta mudança, porque outra entrega mexeu no arquivo. Não derruba nenhum verde.
- **É tela:** decisão da CEO, ou do braço de telas, publicar ou não.
- **Não conferido em tela:** a espera só aparece com render real, que é pago.

O número que sustenta: de quem ficou, 76% viram o filme; de quem saiu, 8%. Se a frase segurar 1 em cada 3 dos 13 que saem nos 2
primeiros minutos, são **~4 primeiros filmes vistos a mais a cada 14 dias**, sobre uma base de 39.

## 5. Propostas (coisa nova; só escrito)

1. **Botão do e-mail cai na nossa página do filme**, tocando, com o próximo passo, em vez do MP4 cru. Hoje a volta pelo e-mail é invisível e sem oferta ao lado. Medir com `?utm_source=video_ready_email`.
2. **E-mail no idioma da pessoa:** a oferta já tem 16 línguas; falta passar `language` e traduzir o título/assunto. As duas de hoje eram brasileiras.
3. **Pedir a notificação do navegador DURANTE a espera:** a infraestrutura já existe (`lib/push.ts`, `/api/push/subscribe`, envio em `route.ts:1501`). São só 6 assinaturas em 14 dias para 74 primeiros filmes. O pedido certo é no minuto 1, quando 13 de 22 vão embora.
4. **Prévia parcial:** mostrar a 1ª cena pronta enquanto o resto renderiza, para dar motivo de ficar. Obra maior; depende do pipeline do Kling 4.
5. **WhatsApp:** só com número pedido no cadastro, e não temos. Fica para depois.
