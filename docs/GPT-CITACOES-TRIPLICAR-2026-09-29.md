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

## Meta

Em 30 dias: de 331 cadastros e 5 pagantes/mês vindos do ChatGPT para ~1.000 cadastros e 15 pagantes/mês. O que conta é visita → conta → pagamento no NOSSO banco. Painel do Bing (Copilot) não conta: 10,1 mil citações deram 1 visitante.

## O que fazer (execução contínua, lotes de 10 ações, relatório a cada lote)

1. **Linha de base diária.** Rodar a consulta do fim deste documento todo dia e registrar no relatório. Costurar anônimo → conta por `events.session_id`.
2. **Descobrir o que o ChatGPT responde hoje.** Montar 30 perguntas de COMPRA (não de curiosidade), em EN primeiro e depois ES/PT/NL/DE, dos dois públicos que pagam:
   - criadores que querem vídeo cinematográfico: "best AI video generator with Kling 3 / Seedance / Veo", "AI cinematic short film maker", "Higgsfield alternative", "InVideo alternative cheaper";
   - pequenos negócios que querem anúncio: "AI ad maker from my own photos", "video ad for my restaurant from photos", "animate product photos into an ad", "AI commercial for small business", "Higgsfield marketing studio alternative".
   Registrar para cada uma: a Kineo aparece? em que posição? com qual URL? com fato certo ou errado?
3. **Dar ao ChatGPT a página certa para cada pergunta que paga.** Para cada pergunta sem a Kineo ou com fato errado: garantir uma página que responda de forma honesta, com o produto pago certo e o preço certo na primeira dobra (portas pagas: motores cinematográficos e Studio Ads). Priorizar melhorar e ligar as páginas que já existem (/ai-video-generator/*, /vs/*, /ads, /ads/for/[setor], /llms.txt, /api/facts, fatos do GPT) antes de criar página nova. Toda página nova entra no sitemap e no llms.txt.
4. **Corrigir fato errado onde ele nasce.** Se o ChatGPT repete preço, trial ou motor errado, achar a fonte (página nossa velha, diretório, llms.txt) e corrigir.
5. **Medir de novo** as mesmas 30 perguntas a cada 3 dias e cruzar com a linha de base do banco.

## Produto novo: Studio Ads v2 (anúncio com as fotos do próprio negócio)

Especificação: docs/ESPEC-ANUNCIO-V2-2026-09-28.md (branch codex/ads-v2-0928 até entrar na main). Um anúncio vertical de 15 s em que as fotos reais do negócio ganham movimento, com música, narração curta, frases na tela e o logo real no fim. Três níveis: Photo motion 34 créditos, Commercial 41, Cinema 51.

**ESTADO: INTERNO.** Não publique nenhuma citação, página ou fato sobre o v2 enquanto `ADS_V2_PUBLIC` não estiver `true` em `lib/ads/v2Tiers.ts` na origin/main. Confira com `git show origin/main:lib/ads/v2Tiers.ts`. Até lá, prepare os textos em rascunho no seu relatório. Quando virar `true`, o Claude atualiza este documento para "PÚBLICO" e você publica.

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
