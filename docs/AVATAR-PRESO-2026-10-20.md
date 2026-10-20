# Avatar preso na montagem: 20/10/2026 (KINEO-AVATAR-PRESO-2010)

[TRAVA 8.2: o fundador deu o "vai pra tudo" em 20/10]

## O defeito

A montagem final do /avatar (Apresentador 70 cr e Avatar/Presenter Pro 110 cr) **nunca terminava**. Depois do motor de avatar, o `/api/compose/status/<id>` respondia 503 em loop, com este log na Vercel:
`avatar billing verification failed: avatar birth/compose billing mismatch`. O cron `finish-stranded-renders` batia no mesmo erro.

Caso real: o teste do fundador de 20/10. Render `9087456e-b870-4c57-b628-d066ca47d575`, geração `bebe-2010-e27670a6c6f44136`, apresentador de 15 s.

| Onde | O que grava | Valor no caso real |
|---|---|---|
| `app/api/generate-avatar` (nascimento) | debita e assina o preço fixo do motor | **70** (débito `avatar-…` de 70, sem estorno) |
| `app/api/compose` (claim de montagem + intent) | `creditCostForDuration(quality, true, duration)` | **18** (70 × 15/60, arredondado para cima) |
| `lib/avatar/reservation.ts` → `loadPrepaidAvatarClaimForRender` (chamada pelo status) | exige `nascimento === montagem` | 70 ≠ 18, então recusa e devolve 503 para sempre |

Só um avatar de **exatos 60 s** passava (70 × 60/60 = 70). Os outros valores davam: 15 s → 18, 35 s → 41, 52 s → 61, 90 s → 105, e o Avatar 110 a 52 s → 96. O guardião C7 reproduz esses números na base.

## Quando divergiu (git)

- **16/07** (`1350a5c80`, PUSH #17): nasce a conferência `birth.creditCost !== cost` no status. Nesse dia o compose reservava `creditCostFor(quality, true)`, o preço fixo, e os dois números batiam.
- **21/08** (`3f03b76bd`, "FIX2: consertei a verificacao e esqueci a RESERVA"): a reserva pré-paga e o `intendedCost` do compose passaram para `creditCostForDuration(...)`. O motivo era o cinematic, onde o nascimento também escala com a duração. O avatar ficou junto por tabela: o nascimento dele continua com preço fixo, e desde esse dia o claim de montagem do avatar sai com um número diferente do nascimento.
- O último avatar/apresentador concluído na tabela `videos` é de **15/07/2026** (4 vídeos, todos da conta do fundador). Antes de 21/08 a falta de vídeos não vinha deste defeito: o produto só não estava sendo usado.

## O conserto

1. `app/api/compose/route.ts`: o avatar pré-pago reserva, grava o claim de montagem e grava o intent com o **custo do nascimento** (`avatarPrepaidCost = avatarBirthClaim.creditCost`). Nada é recalculado pela duração. O cinematic e o Kineo 1 continuam byte a byte com o número de sempre. A checagem do nascimento contra a tabela (70/110) não mudou.
2. `lib/avatar/reservation.ts`: `avatarComposeCostMatchesBirth` aceita a igualdade direta (o formato novo). Para os claims de montagem **já gravados** no formato velho, aceita só o número exato que a régua dá para a duração gravada no próprio claim, com a mesma qualidade e com o nascimento no preço de tabela. Qualquer outro número continua recusado.
3. **Sem cobrança dupla**: o avatar pré-pago não é debitado na montagem. O status marca `creditsDeducted` e fica fora de `shouldDeductCredits` (guardião S1). O único débito conferido é o do nascimento, com o valor do nascimento. **Idempotente**: o claim de montagem é o mutex por geração; a mesma geração reenviada devolve o mesmo render.
4. **Intocados (provado byte a byte, S3/S4)**: `generate-avatar`, `avatar-status`, o Ads Produção (`/api/ads/producao/montage` monta fora do compose e usa `loadPrepaidAvatarClaimForGeneration`, que não mudou) e o Apresentador v2 do Studio Ads (`lib/ads/v2Presenter.ts`, `adV2Montage.ts`, `v2Advance.ts`, com montador próprio fora do `/api/compose`).

## Destravar os presos

- O cron `finish-stranded-renders`, na **fase 3**, lê `compose_submission_claim` com `render_id`, sem filtro de motor, pula o render que já tem linha `completed` em `videos` e cutuca o `/api/compose/status` em modo serviço. Com o conserto, a conferência passa (o claim velho 18 a 15 s é aceito), o status persiste o MP4 do Creatomate e manda o aviso. O guardião S2 prova isso no código.
- **Prazo da janela**: a fase 3 só olha claims de montagem com até **20 h** de idade. O claim do render `9087456e` é de 20/10 às 19:00:48 UTC, então o cron o pega se o deploy sair **até 21/10 ~12:00 BRT**. Depois disso há duas saídas. A primeira é o fundador abrir, logado, `https://www.usekineo.com/api/compose/status/9087456e-b870-4c57-b628-d066ca47d575?quality=presenter&duration=15`: a mesma rota persiste o vídeo sem custo novo de fornecedor. A segunda é reenviar a montagem no /avatar com a mesma geração, que devolve o mesmo render.
- O link do Creatomate tem validade longa (dias), então dá tempo.
- A linha em `videos` desse render vai mostrar `credits_used = 18`, porque o intent velho foi gravado com 18. O débito real é 70, no nascimento. A diferença é só cosmética; os renders novos já gravam 70.

## Quem foi afetado desde julho (leitura do banco, 20/10)

| Usuário | Render | Geração | Créditos | Data | Situação | Recomendação |
|---|---|---|---|---|---|---|
| josephsskaf@gmail.com (fundador) | `9087456e-b870-4c57-b628-d066ca47d575` | `bebe-2010-e27670a6c6f44136` | 70 debitados (nascimento), sem estorno | 20/10 18:56 UTC | preso na montagem (503) | **Reprocessar** pelo cron/link acima. Não estornar: o avatar foi entregue pela fal e o vídeo sai pago. |

- **Clientes pagantes afetados: 0.** Todos os 5 nascimentos de avatar da história (`avatar_submission_claim`) e todos os 9 débitos de avatar/presenter (`credit_debits`) são da conta do fundador. Desde 15/07, só **um** render de avatar chegou ao `/api/compose`: o de 20/10, acima.
- Uma cliente (`lara55lara0@hotmail.com`, 16/09) rodou 2 **dry-runs** do Avatar (custo 0, sem nascimento nem débito), então não foi afetada.
- 35 contas logadas (fora o fundador) abriram o /avatar desde 28/07 e **nenhuma** gerou avatar. O gargalo do produto, para elas, veio antes deste defeito.
- Fora deste defeito, mas registrado: 4 nascimentos do fundador (01/10, 09/10 e dois em 17/10, 360 cr no total) nunca chamaram o `/api/compose`. São testes internos e o Ads Produção, que monta fora do compose. Não há o que reprocessar aqui.

## Achado lateral (não consertado aqui)

`sweepAbandonedAvatarDebits` (`lib/credits/refund.ts`) trata `render_id = 'avatar-<id>'` como se o `<id>` fosse o `avatar_request_id`. Na verdade é o **id do claim** (`avatarBillingReference`). A busca por pedido nunca acha nada e devolve "0 créditos". Na prática, a varredura de estorno de avatar abandonado **nunca estorna ninguém**. Hoje isso não pesa (0 clientes), mas é dinheiro do cliente no dia em que o Avatar vender. O conserto pede uma entrega separada.

## Guardião

`scripts/test-avatar-preso-2010.mjs`: executa `reservation.ts` num vm com assinaturas reais e banco dublê (o caso real fica vermelho na base e verde hoje), confere o compose, o status, o cron e os vizinhos, além do desfaz encadeado (camada mais nova do `/api/compose`: `semMeta95Refazer1910` chama `semAvatarPreso2010` primeiro) e 15 mutantes.
