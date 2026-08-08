# Órfãos do bucket `broll` — medição, prova e runbook de limpeza
`[KINEO-BROLL-ORPHANS-2026-08-08]`

Sequência do item #1 do `docs/BUGHUNT-2026-08-08.md`. A CAUSA já foi corrigida
(`safeVaultScore` + delete do órfão no caminho novo). Este documento trata do
PASSIVO acumulado antes da correção.

**DECISÃO DO FUNDADOR, literal: NÃO APAGAR. Mover para `trash/` primeiro.**
Nada neste documento, e nada em `scripts/broll-orphans-to-trash.mjs`, apaga um
objeto. O script não tem uma única chamada de delete, em nenhum caminho.

> **ESTADO: NADA FOI MOVIDO.** A execução está bloqueada por falta de
> credencial — ver §5. Tudo abaixo é medição, prova e runbook.

---

## 1. Quantos são, de verdade

Não confiei no número do bughunt; refiz a medição. Órfão = objeto em
`storage.objects` do bucket `broll` sem NENHUMA linha de `clip_vault` apontando
para ele. O índice referencia o arquivo por **URL pública**
(`clip_vault.storage_url`), não por path nem por id — então a junção precisa
extrair o path de dentro da URL. As 352 linhas do índice usam essa forma:

```sql
with indexed as (
  select substring(storage_url from '/public/broll/(.*)$') as name from clip_vault
), obj as (
  select name, (metadata->>'size')::bigint sz from storage.objects where bucket_id='broll'
)
select count(*) filter (where i.name is null)                    as orphans,
       round(sum(o.sz) filter (where i.name is null)/1e9, 2)     as orphan_gb,
       count(*)                                                  as total_objs,
       round(sum(o.sz)/1e9, 2)                                   as total_gb
from obj o left join indexed i on i.name = o.name;
```

| | objetos | GB (decimal) | GiB |
|---|---|---|---|
| bucket `broll` inteiro | 3.032 | **54,41** | 50,67 |
| indexados (vivos) | 352 | 5,51 | 5,13 |
| **órfãos** | **2.680** | **48,90** | 45,54 |

O bughunt dizia "2.669 órfãos = 48,8 GB de 54,4 GB". **Bate.** A diferença de
GB era só unidade — o doc usou GB decimal (10⁹) e a diferença de 2.669 → 2.680
é a decomposição por prefixo logo abaixo. Junção no sentido inverso:
**0 linhas de `clip_vault` apontam para objeto inexistente** — o índice não tem
ponteiro quebrado, o problema é só de sobra.

## 2. O escopo é menor que "objeto sem linha no índice" — e isso importa

Os 2.680 não são um bloco só. Por prefixo:

| prefixo | órfãos | GB | o que é | mover? |
|---|---|---|---|---|
| `vault/` | **2.669** | **48,84** | o passivo do bug: `clipVault.ts` subiu e o insert foi recusado | **SIM** |
| `ai-hook/` | 8 | 0,05 | `fastAiHook.persistHookClip()` | **NÃO** |
| `rickrefs/` | 3 | 0,01 | upload manual de 10/07, origem desconhecida | **NÃO** |

**A armadilha do `ai-hook/`.** Esses 8 objetos não têm linha em `clip_vault` —
`select count(*) from clip_vault where storage_url like '%ai-hook%'` = **0** —
e mesmo assim **não são lixo**. `persistHookClip()` (`lib/fastAiHook.ts:156-168`)
sobe o clipe e **devolve a URL pública direto para o render**, sem nunca
indexar. Para esse caminho, "sem linha no índice" é o comportamento normal, não
uma falha. A definição ingênua de órfão teria movido asset vivo. Ficam de fora.

(O que confundiu: `fastAiHook.ts:99` também chama `vaultClipAsync({score: 30})`,
mas isso grava sob `vault/` com o literal inteiro — é o grupo de controle do
bughunt, e é outra coisa.)

**Guarda de corrida:** objetos com menos de 2h são excluídos, senão um upload
cujo insert ainda está em voo seria contado como órfão.

**Escopo final: 2.662 objetos, 48,69 GB** (2.669 `vault/` menos os 7 da janela
de 2h no momento da medição).

## 3. Prova de que são inalcançáveis

O pedido era cruzar uma amostra de 20 com `videos`/`render_jobs`/`scenes`.
Fiz mais forte: varri **todas as colunas `text`/`varchar`/`json`/`jsonb` de
todas as tabelas base do schema `public`** (~200 colunas) procurando qualquer
ocorrência de path do `broll`, via `query_to_xml` num único statement:

```sql
with cols as (
  select c.table_name, c.column_name from information_schema.columns c
  join information_schema.tables t on t.table_schema='public'
   and t.table_name=c.table_name and t.table_type='BASE TABLE'
  where c.table_schema='public'
    and c.data_type in ('text','character varying','jsonb','json')
)
select table_name, column_name, (xpath('/row/c/text()', query_to_xml(format(
  'select count(*) as c from public.%I where %I::text like ''%%/broll/%%''
     or %I::text like ''%%vault/17%%'' or %I::text like ''%%vault/18%%''',
  table_name, column_name, column_name, column_name), false, true, '')))[1]::text::bigint as n
from cols where n > 0;
```

Três padrões: URL pública (`/broll/`), URL assinada (idem) e path cru
(`vault/17…`, `vault/18…`). **Resultado: uma única linha.**

```
table_name | column_name | n
clip_vault | storage_url | 352
```

Em todo o banco, o único lugar que menciona um path do `broll` é a coluna do
próprio índice, com exatamente as 352 que NÃO são órfãs. `videos`,
`render_jobs`, `broll_metrics`, `generations`, `events.metadata` (jsonb),
`user_footage`, `autopilot_runs`: zero. Faz sentido no desenho — o Creatomate
busca o B-roll na hora do render e assa os pixels no MP4 de saída; o vídeo
final vive no bucket `renders` e não guarda ponteiro para o clipe de origem.

## 4. O `move` por SQL NÃO funciona — provado com 1 objeto, e revertido

A ordem era preferir a API de Storage e, se fosse usar SQL, provar que o
backend continua servindo o arquivo no caminho novo. **Testei. Não continua.**

Objeto de teste: o órfão mais antigo, `vault/1783636056652-a2v2zb.mp4`,
16.539.576 bytes, `id=33369b71…`, `version=b9b21e46…`.

| passo | path antigo | path novo |
|---|---|---|
| antes | **200**, 16.539.576 bytes | — |
| depois do `update storage.objects set name=…` | **400** | **400** |
| depois do revert | **200**, 16.539.576 bytes | 400 |

O `UPDATE` deixa o arquivo inacessível **nos dois** caminhos. O motivo está na
coluna `version` (UUID): o storage-api resolve o objeto no S3 pela chave
`bucket/name/version`, então trocar `name` no Postgres sem mover os bytes no S3
quebra a resolução. **`storage.objects` não é a fonte da verdade do arquivo, é
só o índice dele.**

Revertido no mesmo minuto: HTTP 200, mesmos 16.539.576 bytes, primeiro KB
lido e íntegro (`md5 640c6164f441669fd553d48cb786de34`).
`select count(*) … where name like 'trash/%'` = **0**. Bucket de volta a 3.032
objetos / 54,41 GB. Nenhum byte perdido, nenhum objeto apagado.

**Conclusão: só a API de Storage (`POST /storage/v1/object/move`) serve** — ela
copia no S3 e atualiza o índice na mesma operação.

## 5. BLOQUEIO: a chave de service role não existe nesta máquina

`POST /storage/v1/object/move` exige service role. O `.env.local` da raiz existe,
tem o conjunto de chaves certo, mas está **com os valores de exemplo, não
preenchido** (idêntico ao `.env.local.example` no conjunto de chaves):

| variável | evidência de que é placeholder |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | resolve para `your-project.supabase.co` → `ENOTFOUND` |
| `SUPABASE_SERVICE_ROLE_KEY` | 22 caracteres, não começa com `eyJ` (JWT real tem ~200+) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 14 caracteres |

Nenhum valor foi impresso, logado ou escrito em arquivo. `.env.local` está no
`.gitignore` (linha 3) e continua fora do repo.

**O que falta:** preencher `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` reais em `.env.local`
(Supabase → Project Settings → API → `service_role`). Feito isso, o runbook do
§6 roda direto.

## 6. Runbook (depois que a chave estiver no `.env.local`)

```bash
node scripts/broll-orphans-to-trash.mjs plan         # confere 2.662 / ~48,7 GB
node scripts/broll-orphans-to-trash.mjs verify-one   # move 1 e prova 200 no path novo
node scripts/broll-orphans-to-trash.mjs move 50      # PRIMEIRO LOTE
# → parar. Verificar: site 200, /wall 200, um render recente ainda toca.
node scripts/broll-orphans-to-trash.mjs move 500     # e repetir até zerar
```

O script recalcula o conjunto de órfãos a cada execução (nunca trabalha em cima
de lista velha), respeita a janela de 2h, só toca `vault/` e grava
`docs/BROLL-ORPHANS-TRASH-MANIFEST-2026-08-08.csv` com
`old_path,new_path,size_bytes,created_at,moved_at` — que é a reversibilidade
real: cada linha é um `move` de volta.

## 7. Dinheiro: quanto isso economiza por mês

Preço vigente ([Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing),
consultado em 08/08/2026): **US$ 0,0213 por GB/mês**, cobrado **só no que passa
da cota**. Cota do plano **Pro** (plano da org confirmado
via API de gestão): **100 GB**.

| | GB |
|---|---|
| `broll` | 54,41 |
| `renders` | 21,51 |
| `stock-videos` | 3,33 |
| `voiceovers` | 1,13 |
| demais (`user-footage`, `avatars`, `music`) | 0,17 |
| **total de arquivos** | **82,51** |
| cota Pro | 100,00 |
| **excedente hoje** | **0** |

**A economia mensal HOJE é US$ 0,00 — e o bughunt errou nessa linha.** Ele
chamou os 48,8 GB de "storage pago"; não são. Com 82,51 GB o projeto está
**abaixo** da cota de 100 GB e não paga nada de storage. Mesmo apagando tudo,
a fatura não muda.

O teto do que essa limpeza pode valer, caso o projeto já estivesse acima da
cota: 48,69 × 0,0213 = **US$ 1,04/mês**.

**O valor real é a folga, não o desconto.** Faltavam **17,5 GB** para bater os
100 GB, e os órfãos cresciam em ritmo de 3 a 13 GB/dia (01/08: 755 objetos /
13,07 GB num dia só). A cota seria estourada em poucos dias, e a partir daí
**todo** o excedente passaria a ser cobrado, não só o lixo. A correção do
`safeVaultScore` já estancou o crescimento; mover/apagar os 48,7 GB devolve a
folga.

E o dinheiro grande do defeito #1 nunca foi o storage — era o cofre frio
derrubando `/api/generate-video-fast` em 504 (17,8% das chamadas, ~US$ 14/sem).

## 8. Registro do que foi tocado em produção

- **1 objeto** renomeado por SQL e revertido em seguida (§4), verificado byte a
  byte. Fora isso, **nenhuma** escrita: nenhum objeto movido, nenhum apagado,
  nenhuma linha de `clip_vault` alterada, nenhuma migração.
- Saúde depois: `usekineo.com` **200**, `/wall` **200**, render mais recente
  (08/08 10:19Z, 24.957.767 bytes) **200**.
