# [Citações] Missão: triplicar os clientes que vêm do ChatGPT — 29/09/2026

Para a sessão do Codex "Kineo · Citações no ChatGPT". Pedido do fundador (28/09, ~04h): "já manda pro GPT pra agente triplicar por lá as citações do GPT". Escrito pelo Claude Code (CEO) com os números do banco da mesma madrugada.

## Por que esta é a aposta nº 1

Últimos 30 dias (profiles + events, contas internas fora):

| Fonte do cadastro | Cadastros | Pagantes |
|---|---|---|
| chatgpt | 331 | 5 |
| taaft | 138 | 0 |
| sem utm | 125 | 1 |
| todas | 683 | 6 |

O ChatGPT traz metade dos cadastros e 5 de cada 6 pagantes. Medição de 22/09 (memória da casa): entre as páginas citadas, só a do Seedance (/ai-video-generator/seedance) gerou pagante; a do Kineo 1 teve 175 sessões, 94 contas e 0 pagantes. Motor grátis atrai quem fica grátis. Quem paga está em US, ES, GB, NL; IN (131 cadastros), NG e PK não pagaram ninguém.

## Meta (revista pelo fundador em 29/09: "5 pagantes por mês é muito pouco, aumenta")

A meta da casa é 10 a 15 pagantes POR DIA (fundador, 06/09). O ChatGPT é o canal que já paga, então ele carrega a maior parte dela.

**Meta de 30 dias: 50 pagantes/mês vindos do ChatGPT (10x o de hoje).** A conta: com ~2% de conversão (as portas pagas convertem mais que o 1,5% atual), 50 pagantes pedem ~2.500 cadastros/mês do ChatGPT (7,5x os 332 de hoje). Isso só vem aparecendo em MUITO mais perguntas de compra, e cada resposta mandando para uma porta paga.

| Semana | Pagantes do ChatGPT na semana | O que tem de estar feito |
|---|---|---|
| 1 | 3 | linha de base; 100 perguntas de compra mapeadas; 20 portas corrigidas ou criadas |
| 2 | 6 | +20 portas; fatos errados corrigidos na fonte; 5 línguas |
| 3 | 10 | +20 portas; Studio Ads v2 citado em todas as perguntas de anúncio (se já PÚBLICO) |
| 4 | 15 | +20 portas; o que não trouxe cadastro em 14 dias é refeito ou descartado |

O que conta é visita → conta → pagamento no NOSSO banco. Painel do Bing (Copilot) não conta: 10,1 mil citações deram 1 visitante. Se a semana ficar abaixo da linha, o relatório diz por que e o que muda na semana seguinte; nada de maquiar a medição.

## Primeira tarefa: mudar o tráfego que JÁ chega das páginas grátis para as pagas

Medido pelo Claude em 29/09 (30 dias, sessões e cadastros vindos do ChatGPT por página de pouso):

| Página de pouso | Cadastros | Pagantes |
|---|---|---|
| /ai-video-generator/kineo-1 | 89 | 0 |
| /free-ai-shorts-generator | 55 | 0 |
| /text-to-video-shorts | 42 | 0 |
| /state-of-ai-shorts-2026 | (130 sessões) | 0 |
| /ai-video-generator/seedance | 8 | 3 |
| /ai-video-generator/veo | — | 1 |
| /ai-shorts-for-agencies | (4 sessões) | 1 |

186 cadastros das páginas grátis deram 0 pagantes; as de motor pago e de negócio deram 5. 4 dos 5 pagaram em até 30 minutos, sem fazer vídeo. As sessões do ChatGPT caíram de ~300/semana (31/08) para ~175 (21/09), e a queda veio das páginas grátis.

Então, ANTES de criar página nova: (1) no topo de /ai-video-generator/kineo-1, /free-ai-shorts-generator e /text-to-video-shorts, pôr um filme de motor pago (Seedance ou Veo, da vitrine curada; não trocar a curadoria do fundador) com o CTA para o motor pago e o custo honesto em créditos (conferir em lib/ o que o trial cobre); (2) nas respostas de citação (lib/growth/citationAnswers.ts), no llms.txt e no /api/facts, a pergunta "melhor gerador de vídeo com IA" aponta primeiro para as páginas de motor pago; (3) medir pouso→cadastro→pagamento por página toda semana, com corte no carimbo do deploy.

## O que fazer depois (execução contínua, lotes de 10 ações, relatório a cada lote)

1. **Linha de base diária.** Rodar a consulta do fim deste documento todo dia e registrar no relatório. Costurar anônimo → conta por `events.session_id`.
2. **Descobrir o que o ChatGPT responde hoje.** Montar 100 perguntas de COMPRA (não de curiosidade), em EN primeiro e depois ES/PT/NL/DE, dos dois públicos que pagam:
   - criadores que querem vídeo cinematográfico: "best AI video generator with Kling 3 / Seedance / Veo", "AI cinematic short film maker", "Higgsfield alternative", "InVideo alternative cheaper";
   - pequenos negócios que querem anúncio: "AI ad maker from my own photos", "video ad for my restaurant from photos", "animate product photos into an ad", "AI commercial for small business", "Higgsfield marketing studio alternative".
   Registrar para cada uma: a Kineo aparece? em que posição? com qual URL? com fato certo ou errado?
3. **Dar ao ChatGPT a página certa para cada pergunta que paga.** Para cada pergunta sem a Kineo ou com fato errado: garantir uma página que responda de forma honesta, com o produto pago certo e o preço certo na primeira dobra (portas pagas: motores cinematográficos e Studio Ads). Priorizar melhorar e ligar as páginas que já existem (/ai-video-generator/*, /vs/*, /ads, /ads/for/[setor], /llms.txt, /api/facts, fatos do GPT) antes de criar página nova. Toda página nova entra no sitemap e no llms.txt.
4. **Corrigir fato errado onde ele nasce.** Se o ChatGPT repete preço, trial ou motor errado, achar a fonte (página nossa velha, diretório, llms.txt) e corrigir.
5. **Medir de novo** as mesmas 100 perguntas a cada 3 dias e cruzar com a linha de base do banco.

## Produto novo: Studio Ads v2 (anúncio com as fotos do próprio negócio)

Especificação: docs/ESPEC-ANUNCIO-V2-2026-09-28.md (branch codex/ads-v2-0928 até entrar na main). Um anúncio vertical de 15 s em que as fotos reais do negócio ganham movimento, com música, narração curta, frases na tela e o logo real no fim. Três níveis: Photo motion 34 créditos, Commercial 41, Cinema 51.

**ESTADO: PÚBLICO (29/09/2026).** `ADS_V2_PUBLIC = true` na origin/main (confira com `git show origin/main:lib/ads/v2Tiers.ts`). Pode publicar citações, páginas e fatos do v2, com estes limites:

- Fatos que valem (código + canário real de 29/09, docs/CANARIO-ANUNCIO-V2-2026-09-29.md): anúncio vertical de ~15 s (Cinema ~16,5 s) feito com 3 a 7 fotos REAIS do negócio, que ganham movimento; música, narração curta que dá para desligar, 2 ou 3 frases na tela e o logo real no fim; 3 níveis: Photo motion 34 créditos, Commercial 41, Cinema 51; incluído em qualquer plano pago; o passe de US$19,90 traz 60 créditos (1 anúncio novo de qualquer nível); plano grátis e custo mostrado antes de cobrar; refazer um plano custa à parte, com o preço mostrado antes. Entrada: usekineo.com/ads.
- O que NÃO dizer: legenda palavra por palavra; "mais barato que o Higgsfield" (no Creator/Studio o preço é igual, no Starter é maior); "gente real" nas cenas criadas (Commercial e Cinema criam cenas de pessoas comuns a partir das fotos: são ilustrativas); tempo de entrega prometido; revisão humana (só existe no clássico).
- O anúncio clássico (narrado, 35/60 s, 3/5 créditos) continua existindo em /ads/new?classic=1: não apague os fatos dele, só deixe claro que é o "classic".

## Regras

- Fatos só do código e das páginas publicadas. Preço, créditos e trial: ler `lib/checkoutPricing.ts`, `lib/ads/offer.ts` e os fatos do /api/facts na origin/main; não copiar número deste documento para página pública sem conferir. Preço público está congelado até 09/10.
- Sem promessa que o produto não cumpre (tempo, qualidade, apresentador, legenda, "forever").
- Review só em https://theresanaiforthat.com/ai/kineo/ (o Product Hunt "kineo" NÃO é nosso).
- Não tocar: trava 8.2 (lib/compose*, lib/hollywood/, lib/cinematic/, lib/broll/, lib/lyriaMusic*, lib/narrationFit*, app/api/analyze-idea/, app/api/generate-script/, app/api/generate-video-*), rotas de pagamento, e os arquivos do v2 (lib/ads/v2*, lib/ads/adV2Montage.ts, app/api/ads/v2/, app/(dashboard)/ads/v2/), que são do Claude.
- Entrega: worktree própria a partir da origin/main, typecheck e guardiões verdes, `bash scripts/enfileirar.sh` (olhar a fila antes), nunca `git branch -f`. O fundador publica com o SUBIR-SITE.bat.
- Nada de dado pessoal em arquivo do repositório (o repositório é público).
- Não criar conta, não postar como Kineo, não mandar mensagem. O que depender do fundador vai para a FILA DO FUNDADOR no fim do relatório.

## Consulta da linha de base (Supabase, só SELECT)

```sql
with ext as (
  select id, created_at, has_paid,
         coalesce(signup_utm_source, utm_source) as src, signup_referrer as ref
  from profiles
  where created_at > now() - interval '30 days'
    and email not ilike 'josephskaf%' and email not ilike 'josephsskaf%'
    and email not ilike 'victoriaskaf%' and email not ilike 'joseph+%'
)
select
  count(*) filter (where src = 'chatgpt' or ref ilike '%chatgpt%') as cadastros_chatgpt,
  count(*) filter (where (src = 'chatgpt' or ref ilike '%chatgpt%') and has_paid) as pagantes_chatgpt,
  count(*) as cadastros_todos,
  count(*) filter (where has_paid) as pagantes_todos
from ext;
```
