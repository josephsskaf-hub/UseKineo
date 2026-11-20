# LIGADO 20/11: o que cada interruptor liga, o custo e como desligar

O dono escreveu às 07:2x de 20/11: "liga tudo que já está certo, e me passa ainda o que precisa ajuste". A CEO liga só o que o revisor certificou para cliente.

Branch `codex/div2-ligar-2011`, de origin/main 3e88eefe3. São 3 commits separados; cada um publica sem os outros. Cada commit só troca o valor do interruptor e reancora os guardiões que afirmavam o valor antigo; nenhum traz lógica nova.

| # | Interruptor (arquivo) | Valor novo | O que liga, para quem | Custo por filme | Desligar (o valor de volta) |
|---|---|---|---|---|---|
| 1 | `KLING4_PLANO_DA_FALA_1911` e `KLING4_DESCRITOR_FORTE_1911` (`lib/kling4PlanoDaFala1911.ts`) | `'sem_ficha'` | O conserto de cena (A1/A2) no Kling 4 grátis literal: cada seção ganha a sua descrição, e o juiz reescreve o plano reprovado. O cliente só segue o caminho novo quando **nenhuma** cena tem ficha; se uma cena tem ficha, o filme fica no caminho de hoje com o motivo `com_ficha`. A casa (`isDryRunAccount`) segue como em `'internal'`. | A2 ≈ US$ 0,0095 (gpt-4o, com o juiz e a reescrita em cerca de 1 filme em 4). A1 em gpt-4o-mini, menos de US$ 0,001. | Os dois de volta a `'internal'` |
| 2 | `RESERVA_COM_IMAGEM_2011` (`lib/cinematic/reservaComImagem2011.ts`) | `'all'` | Quando o Kling 4 grátis falha ou estoura o prazo e falta imagem aprovada numa cena, a cena ganha a imagem desenhada (flux/dev, no nosso bucket). A reserva vai pelo H3 com imagem, não pelo H3 só de texto, que às vezes sai deitado. Vale para todos, mas só desenha quando o ambiente grava no nosso projeto Supabase. | US$ 0,03 por cena desenhada, até US$ 0,09 por filme, só nos filmes que caem na reserva (foram 5 reservas por prazo em 35 dias). Mais 1 ou 2 linhas de relógio em `events`, de graça. | De volta a `'off'`: o caminho de hoje, byte a byte |
| 3 | `LEITOR_SEGURO_1411` (`lib/cinematic/elencoSemantico.ts`) | `'all'` | O leitor do elenco com o pedido de segurança: aos 3,5 s sai uma 2ª chamada igual, e fica a primeira válida. São 7 s por chamada, 9 s no total e no máximo 4 chamadas. Pega **todo** filme da rota, pago também. **Publicar só com o revisor dizendo que está pronto para todo filme.** | Filme rápido: 1 chamada, o mesmo de hoje (US$ 0,0005). Filme lento: 1 a 3 chamadas a mais, no máximo cerca de US$ 0,002. | De volta a `'internal'` (só a conta do ensaio) ou `'off'` |

**Continua sem ligar:**
- o portão do sujeito (`PORTAO_DO_SUJEITO_1911`) em `'internal'`;
- a ficha reprovada (`FICHA_REPROVADA_1911` e `FICHA_REPROVADA_NO_HOJE_2011`) em `'internal'`;
- a segunda leitura (`SEGUNDA_LEITURA_DA_GENTE_1911`) e a idade escrita (`FICHA_IDADE_ESCRITA_1911`) em `'off'`;
- o gente-no-final, que fica fora.

**Reverter em um commit:** volte o valor da tabela no arquivo e reancore o guardião do mesmo commit. São M0b e os mutantes "A1 público" e "A2 de volta a internal" em `scripts/test-cena-publica-1911.mjs`, mais os mutantes de `scripts/test-descritor-forte-1911.mjs` e `scripts/test-plano-da-fala-1911.mjs`; o A0 de `scripts/test-reserva-com-imagem-2011.mjs`; e o M0 de `scripts/test-leitor-seguro-1411.mjs`. Para o leitor seguro, há também as 2 contagens de chamadas em `scripts/test-protagonista-seedance-0111.mts`, que seguem o valor sozinhas. Uma alternativa é `git revert <SHA do commit>`.

## (1) no modo sem rosto [revisor 20/11: "NÃO PODE ainda"; conserto KINEO-SEM-ROSTO-2011]

**O defeito:** no filme sem rosto (`documentary_faceless`), a descrição por seção do A1/A2 ia ao motor como o descritor escreveu, e o rosto voltava. A cena de hoje troca a pessoa por silhueta de costas.
- **98063aa2:** hoje "A young woman seen in silhouette from behind"; no caminho novo, "smiles enthusiastically at the camera".
- **32c93ee3:** hoje "family seen from behind as distant silhouettes"; no caminho novo, "warmly greeting exactly five family members".

**O conserto (opção A com guarda):**
- No modo sem rosto, cada descrição passa pela **mesma** troca da cena (`sujeitoSemRosto`, extraída de `buildClassicVisualPrompt` byte a byte) antes da conta do espaço.
- Se sobrar rosto, olhar ou sorriso na descrição, o filme fica no caminho de hoje, com o motivo `sem_rosto_com_rosto`.
- Uma reescrita do A2 que ainda tenha rosto não entra; fica a descrição de antes.
- Fora do modo sem rosto, nada muda.

**Replay dos 37 claims sem ficha (32 no modo sem rosto), `scripts/test-sem-rosto-2011.mjs`:**

| Caminho | Planos de costas nos 32 | Descrição com rosto no caminho novo | Sem rosto no caminho novo |
|---|---|---|---|
| Hoje | 9 | — | 0 |
| Novo, sem conserto | 5 | 5 descrições (98063aa2, 32c93ee3, 804e9f0b…) | 24 |
| B: sem rosto com pessoa = hoje | 9 | 1 descrição (nome próprio com olhar) | 18 |
| A com guarda, 1ª versão (7586ebd23, no ar 09:15) | 12 | 0 | 20 (4 voltam por rosto) |
| **A com guarda larga (rv20, este commit)** | **10** | **0** | **17** (7 voltam: rosto, ou papel e pronome sem silhueta) |

**Por que a A com guarda e não a B:**
- A B só vê o substantivo de pessoa e deixa passar nome próprio com olhar ("Gabriel … gazing").
- A B mantém menos planos de costas que a A com guarda (9 contra 12).
- A A com guarda põe a silhueta, que é a promessa do produto, e só desiste quando o rosto continua no texto.

**Guarda larga [revisor 20/11, rv20]:** a guarda também barra "staring", "glances", "winks", "frowns", "beams with", "lips", "selfie", "profile", "weathered features", câmera e sorriso em português, espanhol, francês e alemão, pronome como sujeito ("She glances") e papel fora da lista de pessoa da cena sem silhueta logo depois ("a builder", "officers", "a chef", "a teenager"). Ela poupa "clock face", "face of the cliff", "eye of the storm", "lighthouse beam", "camera crane" e "low-profile". As 33 frases do revisor estão no guardião: 25 barradas e 8 poupadas, com 0 erro. **Fica de fora:** o nome próprio sozinho ("Gabriel walks to work") segue sem silhueta, como na cena de hoje; se houver olhar ou rosto, a guarda barra.

**Descritor gpt-4o nos filmes com ficha:** não cortado. A ficha nasce nas cenas, depois que o descritor já começou; o único sinal antes é o personagem fixo (34 dos 35 com ficha). Cortar pede mexer na porta do A1/A2, por cerca de US$ 0,007 por filme com personagem. Fica proposto, sem obra.

**Onde fica o caminho no claim (conferido no banco em 20/11):** `response->'plano_da_fala'`. Estava nos 4 claims que têm o campo (13393ef8, 71452f37, 76c4c5c4 e 043eafc9); em nenhum fica dentro de `kling4_trial`. A consulta abaixo usa esse caminho.

## Medir os primeiros filmes de cliente no caminho novo

Rodar no SQL do Supabase com `:publicado` = a hora do deploy. `:casa` é a lista `DRY_RUN_EMAILS` de `lib/cinematic/classicDryRun.ts` e tira a conta do ensaio. Testada em 20/11 contra o banco: ela roda.

```sql
with c as (
  select e.created_at, e.user_id, e.session_id gen, e.metadata m
  from events e
  where e.name = 'cinematic_submission_claim' and e.created_at >= :publicado
    and not exists (select 1 from auth.users u where u.id = e.user_id and lower(u.email) = any(:casa))
)
select c.created_at, left(c.gen::text, 8) gen, c.m->>'engine' motor, c.m->>'status' status,
  (c.m->'response') ? 'kling4_trial' k4_gratis,
  c.m->'response'->'plano_da_fala'->>'caminho' caminho,          -- a1 | a2 | hoje (1)
  c.m->'response'->'plano_da_fala'->>'motivo' motivo,            -- com_ficha, descricao_nao_cabe…, prazo_*… (1)
  (select string_agg(p.metadata->>'motivo', ',') from events p where p.name = 'kling4_plano_da_fala_hoje' and p.session_id = c.gen) evento_hoje,  -- (1)
  c.m->'response'->'kling4_trial'->>'fallback_reason' reserva_por,                         -- (2)
  c.m->'response'->'kling4_trial'->'reserva_com_imagem'->>'estado' reserva,                -- pronta | sem_imagem | desenhando (2)
  c.m->'response'->'kling4_trial'->'reserva_com_imagem'->>'usd' reserva_usd,               -- (2)
  (select count(*) from events r where r.name = 'kling4_reserva_com_imagem' and r.session_id = c.gen) ev_reserva,  -- (2)
  (select string_agg(coalesce(k.metadata->>'quem_venceu', '-') || '/' || coalesce(k.metadata->>'version', ''), ',')
     from events k where k.name = 'cinematic_cast_checked' and k.session_id = c.gen) leitor  -- principal | seguranca | repeticao | B (3)
from c order by c.created_at desc;
```

**Como ler o resultado:**
- (1) No grátis Kling 4 sem ficha, `caminho` vem `a1` ou `a2`; com ficha, vem `hoje` com o motivo `com_ficha`; no filme sem rosto com rosto na descrição, `hoje` com `sem_rosto_com_rosto` (esperado: cerca de 1 em 5 dos sem rosto, com a guarda larga). Um `hoje` com o motivo `prazo_*` ou `descricao_nao_cabe…` é queda e vai à CEO.
- (2) Só aparece em filme que caiu na reserva: `reserva = pronta` com `reserva_usd` de até 0,09. `sem_imagem` = o caminho de hoje.
- (3) Com o leitor seguro no ar, `quem_venceu` vem preenchido e `version` é a do leitor seguro. Um `-` depois do deploy do commit 3 = o leitor seguro não rodou.
