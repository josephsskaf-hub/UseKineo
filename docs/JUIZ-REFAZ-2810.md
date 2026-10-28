# KINEO-JUIZ-REFAZ-2810 — o juiz refaz até ficar bom; o mascote morreu (28/10/2026)

Pedido do fundador (28/10): o defeito nº 1 do filme grátis é o personagem pedido virando um
bichinho fofo genérico (ninguém comprou em 6 dias; "o primeiro filme é o produto"). O juiz do
still tem de insistir até a cena ficar certa, e a fonte do mascote tem de sumir.

## Causa raiz do mascote (provada com os textos reais)

Duas fábricas do MESMO texto fixo — `a <porte> <cor sorteada> <espécie> with big round friendly
eyes and a short tail, no clothes`:

1. `lib/cinematic/elencoEpoca.ts` `descrever()` (linha ~312 antes do conserto) — estrada clássica,
   TODO cliente. Gênesis 28/10 (`dc4ac291`, mypopson): a fala "Among the stars, Lucifer, the
   brightest angel, fell from grace" deu `Lucifer, a medium-sized bright green angel with big round
   friendly eyes and a short tail` E `Among, a medium-sized teal star…` — o "Among" virou gente
   porque o aposto "Mishu the dragon" casava "Among the star**s**" (plural), e "star" é
   "ser-objeto" de conto infantil. A cláusula "Named characters in this shot: Among…; Lucifer…"
   foi prefixada à cena 1 (o cosmos) e o still saiu a estrelinha verde.
2. `lib/cinematic/folhaDePersonagem.ts` `canonicaDeterministica()` (linha ~197 antes) — a folha:
   `a small and chubby <cor> creature with a cream belly, big round friendly eyes…` — o Krishna
   roxo e o Ghost Rider roxo de 27/10.

E o juiz entregava: `escolherFotoCritico` escolhia "a melhor das duas" quando as duas
reprovavam — no Gênesis, original 20 FAIL → foto nova 30 FAIL → **a 30 foi entregue**. A
refeita FOI julgada (nota_regerada=30), só não havia terceiro caminho.

## O que mudou

- **`lib/cinematic/seresFieis.ts` (novo, puro, sem import)** — `ANATOMIA_DO_SER` (asas de pena no
  anjo, chifres no demônio, espectro translúcido no fantasma…), `descricaoFielDoSer()` (fofo SÓ
  no conto infantil e por cima da anatomia; ser sagrado/sombrio nunca fofo nem com cor sorteada),
  `FIGURAS_FIEIS` + `figuraFiel()` (Lucifer = anjo caído em fogo e luz; Ghost Rider = motoqueiro
  de crânio em chamas sem logotipo; Krishna/Shiva/Rama/Durga/Buddha/Vishwaroop; Jesus, Santa,
  Grim Reaper, Dracula, Frankenstein).
- `elencoEpoca.ts`: preposições de abertura em `NAO_NOME` (among, beyond…); aposto "the X" só no
  singular; figura conhecida antes da dedução de espécie; fora do conto infantil, estrela/nuvem/
  pedra é cenário; `descrever()` não-humano → `descricaoFielDoSer`.
- `folhaDePersonagem.ts`: ficha não-humana → `descricaoFielDoSer`. `personagemAjuste.ts`:
  `figuraConhecida` consulta a tabela única e lê nome composto no texto ("Ghost Rider" chega como
  "Ghost"). `juizFicha.ts`: a lista local de 5 figuras virou a tabela única.
- **`criticoStill.ts` — o laço**: FAIL → foto nova → julga de novo → ainda FAIL → 2ª foto nova
  (instrução mais forte: a exigência positiva derivada do MOTIVO do crítico — "Main subject is not
  a cosmic galaxy" → "Required, large and unmistakable in frame: a cosmic galaxy." — mais a cena
  inteira ditada) → julga de novo. Até **2 fotos novas por cena (3 vereditos)**, **6 por filme**
  (era 3), **1 com folha** (edit de US$ 0,15). Segue: aprovada > foto nova sem veredito > maior
  nota (empate = original). Teto da cena 20 → 30 s; prazo dos stills (60 s) continua mandando.
  Rubrica: FAIL explícito (3a) personagem nomeado AUSENTE e (3b) mascote/pelúcia/chibi no lugar
  da figura pedida; "mascot"/"missing" lidos como sujeito; o elenco do prompt ("Named character(s)
  in this shot") chega ao crítico como "who MUST appear". Evento `cinematic_still_critic` ganha
  `tentativas[]`, `notas[]`, `regeracoes`, `escolhida_tentativa`, `custo_regeracoes_usd`.
- Rota: nada mudou (o laço vive na lib; o evento espalha o relato).

## Custo e latência

Por cena reprovada: antes 1 FLUX (US$ 0,015) + 2 vereditos (≈US$ 0,001); agora até 2 FLUX
(US$ 0,03) + 3 vereditos (≈US$ 0,0015). Pior caso do filme grátis (3 cenas, tudo reprovado 3×):
≈ US$ 0,095 extra; filme de 9 cenas trava em 6 fotos novas (US$ 0,09). Latência: a 2ª foto só
sai se couber no prazo dos stills (checa folga antes de cada passo).

## Guardiões

`scripts/test-juiz-refaz-2810.mjs` (textos reais de Gênesis, Krishna, Ghost Rider, Mishu; crítico
real com fetch falso; 15 mutantes). Atualizados: `test-juiz-still-1410` (as 2 asserções de "UMA
foto nova" viraram o contrato novo), `test-juiz-ficha-2710` (A2: o mascote já não existe "antes").
Loaders de 4 guardiões mapeiam o módulo novo. Guardiões que só reprovam por "mudou fora da
camada"/desfaz (camadas aposentadas): `test-filme15-fiel-2610`, `test-juiz-still-1410`,
`test-meta95-personagem-2010`, `test-meta95-personagem-ajuste-2010` — crasham no SHA do desfaz
de criticoStill.ts; com o throw neutralizado localmente, as verificações de comportamento passam
(ver relatório da sessão).
