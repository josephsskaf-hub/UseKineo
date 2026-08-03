# 🟢 INCIDENTE OPENAI — RESOLVIDO em 01/08/2026 01:04 UTC

**PARA TODA SPRINT: LEIA ISTO ANTES DE FALAR DE OPENAI/ENV. O PROBLEMA JÁ FOI RESOLVIDO.
NÃO PEÇA AO FUNDADOR PARA TROCAR A ENV DE NOVO. NÃO ABRA GATE SOBRE ISSO.**

## Linha do tempo
- 31/07 15:55Z — OpenAI começa a responder `insufficient_quota` (83 eventos `openai_quota_dead`)
- Último vídeo ok antes do blackout: 31/07 10:55Z → **~14h de motor morto**
- Dia do blackout foi o recorde: 68 cadastros/24h; ~50 caíram em produto quebrado
- 01/08 ~00:50Z — fundador colou chave nova; sessão CEO redeployou (dpl 5rttNbQ3A)
- **01/08 01:04:48Z — vídeo `completed` em produção (Lake Natron), ZERO erros. VALIDADO.**

## Causa raiz
A `OPENAI_API_KEY` da Vercel era de **maio/2026** — conta OpenAI ANTIGA (era ShortsForgeAI),
que zerou os créditos. A conta atual do fundador (login josephsskaf@gmail.com, org "Personal")
nunca tinha sido a de produção (chave "Aestivora Vora" last-used 17/07, $0 spend).

## Estado atual (verdade em 01/08 01:10Z)
- Produção usa chave nova `kineo-prod` da org Personal — saldo $23.98 + auto-reload
  (recarrega até $30 quando bate $20; **máx $30/mês — pode ficar apertado, vigiar**)
- Env `OPENAI_API_KEY` é **Sensitive** (write-only) — ninguém consegue ler o valor; só substituir
- Pipeline validado de ponta a ponta: GPT script → TTS → Whisper → footage → render → completed

## O que as sprints DEVEM fazer sobre isso
1. Placar: monitorar `openai_quota_dead` (deve ficar em 0) e retorno dos ~50 queimados de 31/07
   (nudge automático de ativação cobre eles nas 24h)
2. Se `insufficient_quota` voltar: o caminho é ADICIONAR crédito/subir auto-reload na org Personal
   (gate do fundador) — a env está CERTA agora, não pedir troca
3. Não gastar chamadas re-diagnosticando isto


---

# 🟢 INCIDENTE #2 — CREATOMATE SEM CRÉDITOS — RESOLVIDO em 01/08 05:06Z

**Status: FECHADO. Fundador fez upgrade Essential→Growth 10K (~05:00Z, outro cartão).
Prova: vídeo `completed` de USUÁRIO REAL às 05:06:21Z. Duração do apagão #2: ~55 min.
Novo ciclo Creatomate: 10.000 créditos, reset 31/08. NÃO re-diagnosticar.**
E-mail ao suporte ficou como rascunho no Gmail (pode nem precisar enviar — se enviado,
tratar resposta como bônus). As tarefas 2 e 3 abaixo (alarme + monitor de consumo)
CONTINUAM VALENDO — são a herança permanente do incidente.

- Creatomate responde **402 "Insufficient credits"** em todo submit (logs runtime confirmam)
- Conta: plano **Essential $54/mês, 2.010/2.000 créditos usados, reset só 19/08** — 18 dias
- OpenAI está SAUDÁVEL (TTS passou nos logs) — não confundir com o incidente #1
- UX: usuário vê "Render service rejected the job", crédito é devolvido (correto)
- Caminhos de conserto (nesta ordem):
  1. Upgrade Growth $129/mês = 10k créditos, ativa na hora — FUNDADOR está tentando
     noutro cartão (limite estourado no principal). Cobrança de upgrade deve ser pro-rata.
  2. E-mail de emergência ao support@creatomate.com — RASCUNHO PRONTO no Gmail do fundador
     (pedindo top-up de emergência / reset antecipado). Monitorar resposta nas sprints.
  3. Reset natural 19/08 (inaceitável — não planejar em cima disso)

## Tarefas para as sprints (prioridade máxima enquanto aberto)
1. Checar a cada sprint se o render voltou: `select count(*) from videos where
   status='completed' and created_at > '2026-08-01T04:20Z'` — >0 = fechado, atualizar aqui
2. **CÓDIGO: alarme de Creatomate não existia** — o 402 NÃO disparou e-mail (openaiAlert só
   cobre OpenAI). Replicar o playbook (detecção + e-mail Resend + throttle) para Creatomate
   em lib/creatomateAlert.ts, wired no catch de submitCreatomateOnce. LIÇÃO PERMANENTE:
   TODO fornecedor pago do pipeline precisa de alarme de quota no DIA 1 (OpenAI, Creatomate,
   FAL, Pixabay). Auditar os que faltam.
3. **Monitor de consumo**: sprint das 10h inclui % de créditos Creatomate usados no placar
   (via sessão logada creatomate.com — Credit Usage no sidebar). Alerta interno se >80%.
4. Vítimas do 402 (a partir de 04:11Z) entram no win-back automático quando fechar.


---

# 🛡️ ESTADO DAS REDES DE PROTEÇÃO DOS FORNECEDORES — 03/08 (noite, verificado nas dashboards)

| Fornecedor | Proteção | Config | Ponto fraco restante |
|---|---|---|---|
| OpenAI (org Personal) | Auto-reload ON ✅ | bate $10 → recarrega até $25 · **teto mensal $100** (máx do tier 1; fundador configurou 03/08) | Teto cobre ~26 dias no burn atual (~$3,8/dia). Sprints: monitorar consumo mensal; quando a OpenAI liberar tier 2, subir teto p/ $150+. Se consumo mensal passar de $85, avisar no relatório 22h. |
| fal (Seedance hooks) | Auto top-up ON + alerta e-mail $10 ON (ativado 03/08) | bate $20 → +$40 (cartão •8677) | Cartão •8677 pode ser o de limite estourado — fundador confirmando. Burn ~$5,2/dia. |
| Creatomate | Growth 10K (reset 31/08) | 10.000 créditos | Sem auto-scale — monitor de % no placar (>80% = avisar). creatomateAlert.ts pendente (tarefa código). |
| OpenAI/Creatomate alarmes | openaiAlert ON · creatomateAlert PENDENTE | | |

SPRINTS: placar diário inclui saldo OpenAI (se legível via sessão), % Creatomate.
Teto OpenAI CONFIRMADO em $100 (máx do tier) — alarme interno se consumo mensal > $85.
