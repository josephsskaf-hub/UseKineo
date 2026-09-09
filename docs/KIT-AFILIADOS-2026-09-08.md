# KIT PARA 20 CRIADORES DE CANAL FACELESS — afiliados com o $1 (08/09/2026, tarefa 9)

**O que a auditoria achou primeiro:** 15 afiliados ativos, 30% recorrente, 27
cliques na história, **0 atribuições, 0 comissões**. Dois motivos:
1. Os afiliados nunca receberam material nem motivo para postar (carta de
   07/09 foi a primeira).
2. O formato `usekineo.com/?ref=CODE` — o que os rascunhos da casa mandavam —
   **não gravava nada**. Só `usekineo.com/a/CODE` grava clique e cookie.
   Consertado em 08/09: `?ref=CODE` agora redireciona para `/a/CODE` (mesmo
   cookie, mesmo clique). Prova: `curl -I 'https://www.usekineo.com/?ref=8WVZSBUX'`
   → 307 para `/a/8WVZSBUX` → cookie `sf_aff`.

## O que o criador ganha (sem inventar nada)

- **30% recorrente** sobre tudo que a pessoa pagar, pelo tempo que ficar.
  $29/mês → $8,70/mês por assinante, todo mês.
- Link próprio `usekineo.com/a/CODE`, cookie de 90 dias, painel em /affiliate.
- O gancho para o público dele: **$1 por 7 dias** (80 créditos, Creator).
  É a menor entrada do nicho — nenhum concorrente faz.

## Quem procurar (20)

Canais faceless de mistério / história / "weird facts" / finanças com 10k–200k
inscritos que já postam Shorts diários, no YouTube e no TikTok. Prioridade:
quem já faz tutorial de ferramenta ("how I make my Shorts with AI"). Os 12
pagantes da casa são exatamente esse perfil — o afiliado é o mesmo cliente,
do outro lado.

Onde: busca no YouTube por "faceless channel tutorial 2026", "AI shorts
automation", em inglês, espanhol e hindi; comentários dos nossos próprios
vídeos; quem já é cliente e tem canal (lista em /admin/people, coluna vídeos).

## A mensagem (DM ou e-mail, voz do fundador — EN)

**Assunto:** 30% forever + a $1 door for your audience

```
Hey [name],

I run Kineo (usekineo.com) — type an idea, get a finished cinematic Short in
about 3 minutes. Nine engines behind one button (Veo 3.1, Kling 3, Seedance).

I watched [video]. Your audience is exactly who Kineo was built for, so I'd
rather pay you than an ad network:

  · 40% of everything they pay, every month, for as long as they stay
  · a $1 door: 7 days of the Creator plan with 80 credits, then $29/mo —
    nobody in this space has an entry that low
  · your own link and dashboard: usekineo.com/affiliate

If you want, I'll cut 3 clips from your own topics with Kineo so your video
has real footage — just send me 3 ideas.

Joseph
usekineo.com
```

## Material pronto para eles

- 12 filmes do fundador (posters e previews em `public/previews/curation-sep07/`
  e `public/previews/ex-*.mp4`) — o Cowork monta um .zip com 5 verticais + 3
  horizontais para o criador colar no vídeo dele.
- Frase de descrição: "Made with Kineo — type an idea, get a cinematic Short.
  $1 for 7 days → usekineo.com/a/CODE".
- Nunca prometer: "free credits", "no card", motores no Starter/Creator que
  são do Studio (Kling 3, Veo, H3, Omni, Avatar).

## Como medir (por pessoa)

`affiliate_clicks` (clique) → `affiliate_referrals` (cadastro atribuído) →
`payment_success` com `card_trial=true` → `subscription_invoice_paid` com
`trial_conversion=true` → `affiliate_commissions`. Hoje: 27 → 0 → 0 → 0 → 0.
A meta da primeira semana: 20 criadores contatados, 5 postando, 50 cliques
atribuídos, 5 entradas de $1.

## ✅ O que depende do fundador

1. Aprovar a mensagem e escolher os 20 (ou mandar o Cowork buscar 40 canais
   com os critérios acima para você cortar para 20).
2. Enviar da sua caixa/DM — nunca automático (é B2B, é pessoa).
