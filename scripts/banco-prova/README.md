# Banco de pedidos-prova — KINEO-BANCO-PROVA-2710

[TRAVA 8.2 — vai do fundador 27/10 "aprovo banco"]

Antes de cada publicação, ~30 pedidos REAIS e difíceis de clientes (`casos.json`) percorrem o pipeline do filme grátis
**até o still** — planner → prompt por cena → still FLUX por cena → crítico do still (`lib/cinematic/criticoStill.ts`) e,
no filme de 15 s, a folha de personagem — **sem vídeo, voz, música ou compose**. Cada caso recebe uma nota (0-100):
metade a nota do crítico (média da foto que seguiu em cada cena; cena sem still = 0), metade a taxa de expectativas do
caso (`espera`) cumpridas, conferidas numa única chamada de visão que vê todos os stills. A rodada é comparada com
`docs/banco-prova/baseline.json`; **a publicação bloqueia (exit 1) se o total caiu mais que a tolerância ou se algum caso
regrediu abaixo do seu limiar** (`comparar.mjs`).

## Como rodar

```
# 1. acesso (uma das duas formas; nenhum segredo vai para o repo)
set BANCO_PROVA_COOKIE=sb-cqqukkvjjrguayiyjvhh-auth-token=base64-...        # cookie da sessão logada de conta interna
#    — ou —
set BANCO_PROVA_EMAIL=joseph-test@shortsforgeai.com
set BANCO_PROVA_SENHA=...                                                    # login por senha no Supabase (anon key pública do .env.local)

# 2. rodar
node scripts/banco-prova/rodar.mjs                       # 30 casos, 4 em paralelo, compara com a baseline, exit 1 se regrediu
node scripts/banco-prova/rodar.mjs --salvar-baseline     # fixa a baseline nova (só com ≥ 80 % dos casos com nota)
node scripts/banco-prova/rodar.mjs --casos krishna-vishwaroop,ploc-alienigena --paralelo 2
node scripts/banco-prova/rodar.mjs --url http://localhost:3000
```

Como pegar o cookie: Chrome logado em usekineo.com com conta do ensaio (`josephsskaf@gmail.com`, `josephskaf@gmail.com` ou
`joseph-test@shortsforgeai.com`) → F12 → Application → Cookies → `sb-cqqukkvjjrguayiyjvhh-auth-token` (ou os pedaços
`.0`, `.1`) → `nome=valor; nome2=valor2`.

Envs opcionais: `BANCO_PROVA_URL` (padrão https://www.usekineo.com) · `BANCO_PROVA_PARALELO` (4) · `BANCO_PROVA_TOLERANCIA`
(1 ponto) · `BANCO_PROVA_LIMIAR` (60) · `BANCO_PROVA_TIMEOUT_MS` (290000).

## O que a rota faz com `dry_run: 'stills'`

`app/api/generate-video-cinematic/route.ts` (marca `KINEO-BANCO-PROVA-2710`): só conta do ensaio de $0 (`isDryRunAccount`);
conta de fora leva o mesmo 403 do dry_run, antes de qualquer reserva. O pedido segue o caminho real do cliente e para no
último ponto antes do 1º POST de clipe (`submitAllScenes`): estorna o claim de nascimento (`banco_prova_stills_no_charge`),
grava um evento `banco_prova_caso` (session_id = generation_id) e responde `{ dry_run: 'stills', banco_prova: {...} }`.
Nenhuma linha em `videos` nasce (ela só nasce no compose). A semente do FLUX é fixa por caso (FNV-1a do id): mesmo caso =
mesmos stills entre rodadas; só muda o que o pipeline mudou.

## Custo por rodada

Só stills + visão: 3 stills FLUX (US$ 0,015 cada) + crítico (US$ 0,0005/foto) + folha de personagem no 15 s (1-2 folhas +
1-3 stills com folha ≈ US$ 0,15 cada) + 1 chamada de expectativas (≈ US$ 0,003) + escritor. ≈ US$ 0,05-0,45 por caso;
30 casos ≈ US$ 2-6. Crédito do cliente: zero.

## Arquivos

- `casos.json` — o banco (30 casos; os 8 primeiros são pedidos reais verbatim). `espera` = o que a visão confere;
  `limiar` opcional por caso; `script_mode` padrão `ai` (o mesmo do cliente no filme grátis).
- `rodar.mjs` — o executor (grava `docs/banco-prova/rodada-<timestamp>.json` + `.md`).
- `comparar.mjs` — a comparação pura (usada pelo executor e pelo guardião).
- `scripts/test-banco-prova-2710.mjs` — o guardião (rota, lib, comparação, banco, executor, mutantes).
- `lib/cinematic/bancoProva.ts` — leitura do pedido, expectativas, nota do caso.
