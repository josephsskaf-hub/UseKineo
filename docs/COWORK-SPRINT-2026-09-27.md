# Cowork — Sprint 16h Kineo (dom 27/09/2026) — relatório para o Code

Horários em BRT. Os prints estão em `C:\kineo\docs\cowork-sprint-2026-09-27\`.

## 1) Gmail — 10 rascunhos: ENVIADOS (com uma correção autorizada)

**O que encontrei:** os 10 rascunhos existiam e o destinatário e o assunto de cada um batiam com a lista. Mas **os 10 tinham o link quebrado.** O link visível e clicável era um redirecionamento do Google, e não o site:

- `https://www.google.com/url?q=https://www.usekineo.com/studio&source=gmail&ust=…&sa=E`
- Esse parâmetro `ust` expira em ~13 h.
- Num e-mail de cobrança, um link assim parece phishing.
- Print: 01.

**Decisão do fundador:** "Corrigir só o link e enviar". Foi feito assim:
- Troquei **apenas o link** por `https://www.usekineo.com/studio`, no texto e no destino do clique.
- No rascunho da Axel, o original era `http://usekineo.com/studio`. Padronizei para `https://www.usekineo.com/studio`, porque o endereço sem www passa por 2 redirecionamentos.
- O resto do texto não foi alterado.
- Conferi pela API do Gmail que as mensagens enviadas saíram com o link limpo.
- Prints: 02 e 03.

**Hora de envio de cada e-mail (remetente joseph@usekineo.com):**

| # | Para | Assunto | Enviado (BRT) |
|---|---|---|---|
| 1 | salswina@gmail.com | Your Kineo card payment was declined on Sept 23 — 1 click to fix | 16:28:58 |
| 2 | axel.dickburt@gmail.com | Your 142 Kineo credits are waiting — here's what they make | 16:29:53 |
| 3 | zygman112@gmail.com | Kineo is back — your video failed on our side, your credits are intact | 16:31:51 |
| 4 | mounirghidhawi@gmail.com | (idem) | 16:40:12 — **VOLTOU (bounce)** |
| 5 | saurabhk25460@gmail.com | (idem) | 16:42:26 |
| 6 | vashistsharma7056@gmail.com | (idem) | 16:42:48 |
| 7 | bhalabhaitalpada42@gmail.com | (idem) | 16:43:08 |
| 8 | mrf947220@gmail.com | (idem) | 16:43:29 |
| 9 | krzysztofrakowicz1@gmail.com | (idem) | 16:43:51 |
| 10 | kyooouu05@gmail.com | (idem) | 16:44:27 |

**Sobre o e-mail 4:**
- O Gmail devolveu: "550 5.1.1 The email account that you tried to reach does not exist" (mounirghidhawi@gmail.com).
- A conta não existe; provavelmente o e-mail foi digitado errado no cadastro.
- O aviso de devolução chegou às 16:39:23, antes do envio registrado às 16:40. Provavelmente houve uma tentativa anterior pela aba do Gmail que travou. Mesmo assim, o endereço recebeu no máximo 1 cópia, porque ele não existe.

**Ainda nos Rascunhos (fora da lista, não mexi):**
- "Your Kineo Pro renewal didn't go through" para salswina@gmail.com, de 25/09. É uma versão antiga e fala em "Pro". **Não enviar**, porque duplica o e-mail 1.
- "A finished Kineo film for you, Emilio".
- 3 rascunhos "GPT-5H".

**Para o Code:** os rascunhos criados pelo agente estão saindo com links `google.com/url?…`. Provavelmente o texto é copiado de um e-mail já renderizado. Nos próximos rascunhos, colar só a URL limpa.

## 2) Stripe (live, conta acct_1NLBTkIah5dxzSBf)

### 2a. Configurações — nada precisou ser alterado
- Em **Configurações → Faturamento → Assinaturas e e-mails**, a opção "Enviar e-mails quando ocorrer falha nos pagamentos com cartão" **já estava LIGADA**. Print: 04.
  - Em "Configurações → E-mails de clientes" essa opção não existe. Ela fica em Billing.
- **Smart Retries já estava LIGADO**: "Cartões — Smart Retry · Tentar novamente até 4 vezes em 3 semanas". Prints: 05 e 06.
- Não alterei nada, então não existe print de "depois".
- Outras configurações atuais, só lidas:
  - "Se todas as novas tentativas falharem → **cancelar a assinatura**" e "deixar a fatura vencida".
  - "Enviar e-mails sobre renovações futuras": DESLIGADO.
  - "Lembrete 7 dias antes do fim da avaliação": DESLIGADO.
  - "Expiração de cartões": LIGADO.

### 2b. Cliente salswina@gmail.com
Prints: 07, 08, 09 e 10.
- Existem **2 cadastros** com esse e-mail. O de 22/08 não tem nenhum pagamento. O que paga é **cus_V7xL5GScRO8II0** (metadata supabase_user_id `e7f1a87c-0aea-4bc4-89b2-b1beb6e5c461`).
- **Assinatura:** `sub_1U7hVBIah5dxzSBfVGyCXK1w` — **Kineo — Studio, US$ 29,00/mês**. Status **Vencida (past_due)**. Começou em 23/08/2026. Período atual: 23/09 a 23/10.
  - O preço é o antigo: hoje o Studio custa US$ 39,90.
- **Faturas:**
  - H91AVF24-0001: US$ 29, **paga** em 23/08.
  - H91AVF24-0002 (`in_1UIwHLIah5dxzSBfoX2kha68`): US$ 29, criada em 23/09, com **falha no pagamento em 23/09 às 20:57**. Status "Tentando novamente".
- **Próxima tentativa agendada (Smart Retries): 1 de out., 00:57.**
  - A Stripe avisa: "se não for possível tentar corrigir a falha original, o pagamento só será executado se a forma de pagamento for atualizada".
- **Cartão salvo:** Visa •••• 9863, vence em 08/2030.
- **Fim da carência:** pela regra atual (até 4 tentativas em 3 semanas), as tentativas vão até cerca de **14/10**. Se todas falharem, a assinatura é **cancelada automaticamente** e a fatura fica vencida.
- A próxima fatura prevista é de US$ 29 em 23/10.

## 3) Vercel — só leitura (time josephsskaf-hub's projects, projeto kineo)
- **KINEO_REVERSE_TRIAL_ENABLED:** EXISTE. Valor **`true`**. Ambientes: **Production and Preview** (não está em Development). Adicionada em 6/08. Print: 12.
- **NEXT_PUBLIC_ADS_PASS_LIVE:** **NÃO EXISTE**. A busca não achou nada nas variáveis do projeto e a aba "Shared" está vazia. Print: 13.
- A API da Vercel negou a listagem ("You don't have permission to list the project environment variable"), então li direto no painel. Não editei nada.

## 4) Kineo — 10 anúncios das empresas: PULADO
- A conta logada em usekineo.com é **josephsskaf@gmail.com**, com **185 créditos**. A conta **josephskaf@hotmail.com não está logada.** Print: 14.
- Pela regra da tarefa, pulei o passo: não gerei nada e não gastei créditos. O saldo de 43 → 13 citado refere-se à conta hotmail.
- **Para destravar:** o fundador precisa entrar na conta hotmail no Chrome. Depois disso, eu gero os 10 roteiros.

## 5) Não feito hoje, como pedido
Nada de testes do Studio Ads, compras, alteração de preço ou variáveis na Vercel.

## Resumo
- **Gmail:** 10 enviados com o link corrigido (autorizado). 1 voltou: mounirghidhawi@gmail.com não existe.
- **Stripe:** e-mails de falha e Smart Retries já estavam ligados. salswina está past_due, Studio a US$ 29, próxima tentativa em 01/10 00:57, cancelamento automático por volta de 14/10 se nada mudar.
- **Vercel:** KINEO_REVERSE_TRIAL_ENABLED=true (Prod+Preview). NEXT_PUBLIC_ADS_PASS_LIVE não existe.
- **Kineo:** anúncios não gerados, porque a conta hotmail não está logada.
