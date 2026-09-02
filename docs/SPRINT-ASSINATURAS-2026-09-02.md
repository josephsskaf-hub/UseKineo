# SPRINT ASSINATURAS E VENDAS — 24h contínuas (01/09 22:30 → 02/09 22:30 BRT)

Ordem do fundador (01/09, noite): "total potência, máxima criatividade, cada dia mais
assinantes e mais gente nos planos caros; nada de rodada de 5 min e uma hora parado;
reler, aprender o código, achar o que fazemos de errado. Foco: assinaturas e vendas."
Rodada a cada 20 min (tarefa kineo-sprint-assinaturas-24h). Diário = handoff canônico.
Regras: ver o prompt da tarefa e o CLAUDE.md (pistas do Codex, enfileirar.sh, nunca push).

## LINHA DE BASE — 01/09 22:20 BRT (externos, 7 dias)
| pagantes | MRR | cadastros 7d | cadastros 24h | fizeram vídeo 7d | 1 vídeo | 2 | 3 | 4+ | pessoas no checkout 7d | falhas 24h |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | ~$109 | 153 | 25 | 80 | 69 | 9 | 2 | **0** | 14 | 8 |

Leitura: 86% de quem faz vídeo para no 1º. NINGUÉM chegou ao 4º esta semana (o limiar de
11,8% de conversão). 14 pessoas chegaram ao checkout e 0 assinaram. Meta: mover gente de
v1 → v2 → v4 e dar razão de compra no checkout (sem tocar em preço — pista do Codex).

## O QUE JÁ ESTÁ NO AR HOJE (não refazer)
- Winback A (7, cupom) e B (95 pessoas +25cr; 264 elegíveis restantes — link de 1 clique
  /api/admin/send-winback-25?confirm=SEND&limit=60).
- Crons acordados: send-failure-recovery (a cada 6h) e send-momentum-nudge (13:30 UTC).
- Medições novas: review_peak_cta_seen, clean_paywall_shown.
- Admin: overview paginado (MRR real), live só presença real.
- S25 instalado atrás de S25_PUBLIC; canário falhou por 503 da fal (3/6); retry 02/09 9h.

## CARDÁPIO INICIAL (ordem de impacto; cada rodada pega 1)
1. Vídeo pronto → próximo vídeo com 1 clique (tema irmão sugerido, mesmo motor) — v1→v2.
2. Falha de render → retentar a CENA, não matar o filme (8 falhas/24h; 19 de 33 nunca voltam).
3. Tela de espera honesta por motor (S25 15-20 min; nunca morrer em 503).
4. E-mail pro Emilio (renovou, 40cr, 0 vídeos em 7d) — rascunho Gmail.
5. Rick: legendas OFF (promessa desta semana; cliente pagante + única review).
6. O que só o Studio faz, mostrado quando a pessoa escolhe um motor Studio sem plano
   (sem preço: dizer o que ganha, não quanto custa — preço é do Codex).
7. Momentum: quem fez 2-3 vídeos recebe o "faltam N pro 4º" (checar copy do cron).
8. Página de motor S25 (pronta) + páginas de motor com clipe real como prova.
9. Auditoria: débito sem entrega, claims presos, trial órfão (vigia).
10. Vídeo do dia (Batalha de LA 1942) nas 3 redes assim que o retry sair.

## RODADAS
### #0 — 22:20 BRT — linha de base + diário (Claude, sessão principal)
