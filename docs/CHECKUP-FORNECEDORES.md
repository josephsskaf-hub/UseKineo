# CHECK-UP DIÁRIO DE FORNECEDORES
# Ordem permanente do fundador (12/08/2026): capacidade e tendência ANTES do sintoma.
# Método: consumo real medido no Supabase (cqqukkvjjrguayiyjvhh). Creatomate pela fórmula
# do medidor oficial (lib/creatomateQuota.ts): px×fps×segundos/1e8 × overhead 1,115.
# Vereditos: VERDE >14 dias de folga · AMARELO 7–14 dias ou tendência de estouro · VERMELHO <7 dias ou falhando.

## 13/08/2026

| Fornecedor | Veredito | Medida | Conta |
|---|---|---|---|
| **Supabase Storage** | 🔴 **VERMELHO** | **91,92 GB de 100 GB (91,9%)** | +21,56 GB em 7d (~3,1 GB/dia; 24h: +1,48). Folga de 8,08 GB = **~3 a 5 dias**. |
| Creatomate | 🟢 VERDE | ~1.675 de 30.000 cr no ciclo (desde 10/08) | Ritmo 7d ≈ 751 cr/dia → ~37 dias de folga; renova 10/09; projeção do ciclo ≈ 22K < 30K. Estimativa via fórmula validada (razão 1,115). |
| fal.ai | 🟡 AMARELO (lembrete) | ~$82,80 no mês (40 renders IA × ~$2,07, estimado) | 24h: 8 renders (~$16,60) — o dobro da média 7d (~$10,90/dia). Cruza o gatilho de $100/mês em ~1 dia. Saldo não legível por API → **conferir painel fal.ai/dashboard/billing**. |
| OpenAI | 🟢 VERDE | 0 falhas quota/openai em 24h | Motivos de falha 24h: analyze_blocked_active_render_gate (7), analyze_threw (3), compose_not_ok (2) — nenhum de saldo. Saldo não legível daqui. |
| Resend | 🟢 VERDE (c/ ressalva) | ≥50 e-mails em 24h (piso medido) de 100/dia | Só trial_emails_log é mensurável no banco; crons send-video-ready/recovery/reminders não registram → total real entre 50 e 100. 20 cadastros/24h; um dia de pico tipo TAAFT estoura o limite diário. |

**Ação recomendada (decidir até 15/08):** Storage a 92% com ~3–5 dias de folga.
Opções: (a) limpar vídeos antigos do Storage (969 vídeos; ex.: trials expirados / >30 dias — os 21,5 GB da última semana mostram que só crescer não para); (b) aceitar overage do Supabase Pro (cobrança por GB extra, barata) — **mas conferir o Spend Cap em supabase.com → projeto → Billing: se estiver ON, uploads FALHAM ao bater 100 GB = novo apagão estilo Creatomate 09/08**.

**Não consegui medir:** saldo fal.ai, saldo OpenAI, envios Resend fora do trial ledger (fontes sem API/da parte não logada). E-mail de alerta via Resend **não enviado**: RESEND_API_KEY local é placeholder (7 chars) — alerta entregue via notificação da tarefa + rascunho no Gmail.

**Achado de segurança (advisor Supabase):** tabela `public.trial_revive_backfill_20260811` está com **RLS desligado** — legível/gravável por qualquer um com a anon key. Corrigir com `ALTER TABLE public.trial_revive_backfill_20260811 ENABLE ROW LEVEL SECURITY;` (e policies, ou dropar se era só backfill).
