# Cowork — Dodo Payments: tirar do modo teste e deixar pronto para o fundador colar as chaves (10/09/2026)

Bloco para colar no Cowork (Chrome do fundador, logado em app.dodopayments.com).
Descrição da ação (≤300): "Conferir a verificação da conta Dodo; se aprovada, ativar o modo ao vivo, criar os 4 produtos com os preços vigentes, o webhook live e deixar as telas da chave de API e do segredo do webhook abertas para o fundador. Nunca copiar chaves nem enviar documentos."

---

COWORK · DODO PAYMENTS AO VIVO · 10/09

Você está no Chrome do fundador, logado em https://app.dodopayments.com (empresa bus_0Nn5v9El2AVSInekYCwgu, produto Kineo). Objetivo: descobrir o que falta para o Dodo cobrar de verdade (Índia via UPI/RuPay) e deixar tudo pronto, parando exatamente onde só o fundador pode agir.

REGRAS FIXAS
- Nunca digite senha, CPF/CNPJ, dado bancário, nem envie documento. Nunca copie, leia em voz alta ou cole chave de API ou segredo de webhook: ao chegar numa tela que mostra uma chave, PARE e deixe a tela aberta para o fundador.
- Não crie conta nova, não troque e-mail, não altere dados bancários.
- Não gaste nada. Não apague nada.
- Se algo pedir upload de documento, registre o que foi pedido e siga para o próximo passo.

PASSO 1 — ESTADO DA VERIFICAÇÃO
1. Abra Settings → Business (ou "Verification"/"Compliance"). Registre: status da verificação (aprovada / em análise / pendência), data, e qualquer mensagem pedindo algo (documento, dado, esclarecimento).
2. Abra a caixa de mensagens/notificações do painel e o e-mail josephsskaf@gmail.com (Gmail já logado): procure "Dodo" nos últimos 5 dias. Registre qualquer pedido do Dodo.
3. Se a verificação NÃO estiver aprovada: pule para o RELATÓRIO e liste exatamente o que o Dodo está pedindo. Não tente resolver pendência de documento.

PASSO 2 — MODO AO VIVO (só se aprovada)
1. No canto do painel, troque de "Test mode" para "Live mode". Confirme que o seletor mostra Live.
2. Settings → Payment methods (live): ative UPI, cartões (RuPay/Visa/Master) e Pix, se estiverem disponíveis. Registre o que ativou e o que não estava disponível.

PASSO 3 — PRODUTOS LIVE (só em Live mode)
Crie exatamente estes 4 produtos (Products → Add product). Moeda USD. Se já existirem produtos live com estes nomes, não duplique: registre os IDs.
- "Kineo — Starter" · assinatura mensal · USD 9.90 · descrição: "60 credits / month"
- "Kineo — Creator" · assinatura mensal · USD 19.90 · descrição: "150 credits / month"
- "Kineo — Studio" · assinatura mensal · USD 39.90 · descrição: "300 credits / month"
- "Kineo — First Pack" · pagamento único · USD 4.90 · descrição: "30 credits, one-time"
Para cada um, copie o ID do produto (começa com pdt_) para o relatório. ID de produto NÃO é segredo.
Atenção: os produtos do modo teste têm preços antigos ($7/$15/$29). Não use esses valores.

PASSO 4 — WEBHOOK LIVE
1. Developer → Webhooks (em Live mode) → Add endpoint.
2. URL: https://www.usekineo.com/api/dodo/webhook
3. Eventos: todos.
4. Salve. Na tela que mostra o "Signing secret" do webhook: NÃO copie. Deixe essa aba aberta e anote no relatório "aba do segredo do webhook aberta".

PASSO 5 — CHAVE DE API LIVE
1. Developer → API keys (Live mode) → Create key, nome "kineo-vercel-live".
2. Na tela que mostra a chave: NÃO copie. Deixe a aba aberta e anote "aba da chave de API aberta".

RELATÓRIO (cole no chat do fundador, nesta ordem)
- Verificação: status + pedidos pendentes (texto exato).
- Modo: teste ou live.
- Métodos live ativos: lista.
- Produtos live: nome → pdt_… (4 linhas).
- Webhook live: URL confirmada + "aba do segredo aberta" (sim/não).
- Chave de API live: "aba aberta" (sim/não).
- Qualquer erro ou tela inesperada, com o texto exato.

---

## Depois do Cowork — o que só o fundador faz (Vercel → Settings → Environment Variables, Production)

Colar, sem mostrar a ninguém:
- `DODO_API_KEY` = a chave da aba aberta (Passo 5)
- `DODO_WEBHOOK_SECRET` = o segredo da aba aberta (Passo 4) — substitui o de teste
- `DODO_PRODUCT_STARTER` / `DODO_PRODUCT_CREATOR` / `DODO_PRODUCT_STUDIO` / `DODO_PRODUCT_FIRST_PACK` = os 4 pdt_ do relatório
- `DODO_MODE` = `live`

Depois: Deployments → Redeploy do último (env nova só vale em deploy novo). Aí o Claude confere `/api/admin/payment-rails` e o botão UPI aparece só para IP da Índia.
