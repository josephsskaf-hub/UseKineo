# KINEO-MCP-STUDIO-2010 — conector "Kineo Studio": o Claude faz o filme na conta da pessoa

**Pedido do fundador (20/10, "vai pra tudo"):** o que a OpenArt vende hoje — a pessoa adiciona a Kineo como *custom
connector* por URL no Claude (Customize → Connectors → Add custom connector), entra na conta Kineo e o Claude dirige o
vídeo de verdade. Depois, o mesmo servidor serve o ChatGPT (apps/plugins com MCP).

**Marca:** `KINEO-MCP-STUDIO-2010`. **Guardião:** `scripts/test-mcp-studio-2010.mjs` (+ `scripts/test-support/desfaz-mcp-studio-2010.mjs`).

## O que é (e o que NÃO é)

| | `/api/mcp` (diretório, 29/09) | `/api/mcp/studio` (este, 20/10) |
|---|---|---|
| Como a pessoa chega | listagem no Connectors Directory (em revisão) | cola a URL como conector personalizado |
| Autenticação | nenhuma | OAuth 2.1 (login Kineo + consentimento) |
| Gera vídeo? | **não** (salva roteiro, devolve link /go) | **sim** — cobra os créditos da conta da pessoa |
| Estado | intocado byte a byte (o guardião prova) | novo, desligado por padrão |

O diretório do Claude recusa conector que gera mídia por IA; por isso são dois servidores. O do diretório segue em
revisão exatamente como foi submetido.

## Como funciona

1. **Descoberta (spec MCP de autorização, lida em 20/10):** o Claude chama `POST /api/mcp/studio` sem token → **401**
   com `WWW-Authenticate: Bearer resource_metadata="https://www.usekineo.com/.well-known/oauth-protected-resource/api/mcp/studio", scope="kineo:studio"`.
   Ele lê esse documento (RFC 9728: `resource` = a URL exata colada, `authorization_servers` = `https://www.usekineo.com`),
   depois `https://www.usekineo.com/.well-known/oauth-authorization-server` (RFC 8414: authorize/token/register/revoke,
   `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported` com `none`).
2. **Registro (DCR, RFC 7591):** `POST /api/mcp/studio/oauth/register` — o Claude registra um cliente público por conexão
   (redirect `https://claude.ai/api/mcp/auth_callback`); o Claude Code registra o dele com loopback
   (`http://localhost:<porta>/callback`, porta ignorada na comparação, como a doc da Anthropic pede).
3. **Autorização:** `GET /api/mcp/studio/oauth/authorize?...` valida tudo (PKCE S256 obrigatório, `resource` = este
   servidor). Sem sessão Kineo → `/login?redirect=<a mesma URL>` (a tela de login de sempre; volta sozinha). Com sessão →
   tela de consentimento (quem pede, o host do redirect, "cria vídeos e gasta créditos DESTA conta") → Allow → código de
   10 min, uso único → redirect com `code`+`state`.
4. **Token:** `POST /api/mcp/studio/oauth/token` (form-urlencoded): `authorization_code` + `code_verifier` → access (1 h)
   + refresh (30 d, **rotacionado** a cada uso; reuso = `invalid_grant`). No banco só o sha256 de cada token.
5. **Tools** (`lib/mcp/studioMcp.ts`), todas no escopo do usuário do token:
   - `kineo_account` — plano, saldo, motores com o preço em créditos por duração (`creditCostForDuration`, a função que cobra no site).
   - `kineo_create_video {idea|script, format, engine, duration, language, aspect, script_mode, title, idempotency_key}` —
     valida; confere saldo (sem saldo → link dos planos, **sem cobrar**); confere tetos; **cunha uma sessão real da pessoa**
     (`admin.generateLink magiclink` → `verifyOtp`, sem senha, sem e-mail) e chama **`POST /api/generate-video-cinematic`**
     com o cookie dela — o MESMO caminho do botão Generate (plano, moderação, régua de voz, contrato de cena, claim
     assinado, débito). Devolve `job_id` + minutos estimados. Mesma `idempotency_key` → mesmo job, sem cobrar de novo.
   - `kineo_video_status {job_id}` — lê onde o site lê: claim cinematic (events) → claim do compose (events) → linha em
     `videos` pelo `render_id`. O filme termina SEM navegador porque o cron `finish-stranded-renders` (1 min) monta o que
     a fal entregou quando não há aba viva. Pronto → `video_url` (MP4) + `library_url`; `watch_url` (/v/) só se publicado.
   - `kineo_list_videos {limit}` — últimos filmes.
6. **Segurança:** tetos POR USUÁRIO (120 chamadas/h, 8 filmes/h, 2 simultâneos) — nunca por IP, porque todo o Claude sai
   de `160.79.104.0/21`; `DELETE /api/mcp/studio` com o Bearer revoga (= desconectar no Claude); `revocation_endpoint`;
   tabelas só da chave de serviço (RLS ligado, sem policy); nenhum token em claro; o token do Claude nunca é repassado
   a ninguém (a sessão interna é outra, descartada após a chamada).
7. **Medição:** eventos `mcp_studio_initialized`, `mcp_studio_tool_called` (tool, ok, refused, credits, charged),
   `mcp_studio_authorized` (allowed/denied), `mcp_studio_token_issued` — todos com `user_id`.

### Formatos
`film` renderiza hoje. `product_ad`, `ugc_ad` e `kids_cartoon` são aceitos pela tool mas devolvem um link do Studio
sem cobrar (o Studio Ads precisa de fotos/marca que o MCP ainda não transporta; "kids_cartoon" não existe como produto).
Próxima etapa quando o fundador quiser: `kineo_create_ad` em cima de `/api/ads/*`.

## Env vars (o fundador cria na Vercel)

| Nome | Valor | Para quê |
|---|---|---|
| `MCP_STUDIO_LIVE` | `internal` (1ª fase) → `true` (abrir) | ausente/`false` = tudo responde 404 (ninguém descobre). `internal` = só contas da casa (`isInternalEmail`) passam no consentimento e nas tools. `true` = toda conta Kineo. |
| `MCP_STUDIO_INTERNAL_ORIGIN` | (opcional) `https://www.usekineo.com` | origem que o servidor usa para chamar `/api/generate-video-cinematic`. Sem ela, usa a origem do próprio pedido (em produção já é a canônica). |

Nada mais: Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) são as de
sempre. A página `/claude-connector` lê `MCP_STUDIO_LIVE` no build (é estática): trocar a env → redeploy para o chip mudar.

## Banco

Migration `20261020150000_mcp_studio_oauth.sql` — **aplicada em produção em 20/10 via `apply_migration`** (projeto
`cqqukkvjjrguayiyjvhh`, nome `mcp_studio_oauth`): `mcp_oauth_clients`, `mcp_oauth_codes`, `mcp_oauth_tokens`,
`mcp_studio_jobs`. RLS ligado, nenhuma policy, `revoke all` de anon/authenticated, grants só para `service_role`.
Tabelas vazias até o interruptor ligar. Se o PostgREST não enxergar as tabelas ("Could not find the table"):
`NOTIFY pgrst, 'reload schema';`.

Revogar tudo de uma conta à mão: `update public.mcp_oauth_tokens set revoked_at = now() where user_id = '<id>' and revoked_at is null;`

## Como testar no Claude (depois do deploy com `MCP_STUDIO_LIVE=internal`)

1. Conferir a descoberta: `curl -i -X POST https://www.usekineo.com/api/mcp/studio -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'`
   → `401` com `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource/api/mcp/studio"`.
   `curl https://www.usekineo.com/.well-known/oauth-authorization-server` → JSON com `registration_endpoint`.
2. No claude.ai (Pro/Max): **Customize → Connectors → + Add → Add custom connector** → nome `Kineo Studio`, URL
   `https://www.usekineo.com/api/mcp/studio` → Continue (o Claude detecta OAuth sozinho; deixar "Register automatically")
   → Add → **Connect** → abre o login da Kineo (conta da casa) → tela "Allow … to use your Kineo account?" → Allow.
3. Num chat novo, ligar o conector e pedir: *"Using Kineo Studio, show my plan and credits"* (→ `kineo_account`),
   depois *"Make a 15-second Seedance 1.5 film about a lake where lightning never stops, in English"* — o Claude deve
   confirmar motor/duração/créditos, chamar `kineo_create_video`, e em seguida `kineo_video_status` até `completed`,
   devolvendo o `video_url`. O débito aparece como qualquer render do Studio (claim assinado, `videos`, biblioteca).
4. Desconectar no Claude (ou `DELETE` com o token) e confirmar que a próxima chamada volta 401.
5. Abrir: trocar `MCP_STUDIO_LIVE` para `true`, redeploy, e a seção "Kineo Studio" de `/claude-connector` passa a dizer
   "Available to every Kineo account".

## O que foi provado antes de enfileirar (20/10)

- `tsc` limpo; guardião `test-mcp-studio-2010` + os 4 guardiões que leem os mesmos arquivos (`test-mcp-pagina`,
  `test-works-with-claude`, `test-mcp-claude`, `test-chatgpt-app-contrato`) verdes; suíte inteira sem vermelho novo.
- **Cliente MCP de verdade** (`@modelcontextprotocol/sdk` 1.22, `StreamableHTTPClientTransport`) contra o `next dev`
  da worktree com um PostgREST de mentira (o `.env.local` local é placeholder; nenhuma chave real): discovery RFC
  9728/8414, 401 + `WWW-Authenticate`, DCR (aceita claude.ai e loopback; recusa http fora do loopback), authorize →
  `/login?redirect=…` sem sessão / `invalid_target` com `resource` alheio / tela 400 com cliente desconhecido;
  com um token de teste semeado só por hash: `initialize`, `tools/list` (4 tools anotadas), `kineo_account`
  (plano, saldo, 5 motores com preço), `kineo_list_videos` (só os da conta), `kineo_video_status` de job alheio →
  erro, `kineo_create_video` com duração inválida e com `ugc_ad` → recusa sem cobrar, refresh rotacionado, reuso do
  refresh → `invalid_grant`, `DELETE` → 401 depois. **Nenhum render pago foi disparado.**
- O cookie de sessão cunhado é lido pelo `createServerClient` REAL do `@supabase/ssr` (guardião, D4/D5).

## Pendências honestas

- A troca código→token com login real e um `kineo_create_video` de verdade só podem ser provados em produção com
  `MCP_STUDIO_LIVE=internal` (passo "Como testar"). Primeiro filme pelo conector: Seedance 1.5 de 15 s (barato).
- Claude Code: `claude mcp add --transport http kineo-studio https://www.usekineo.com/api/mcp/studio` + `/mcp` para
  autenticar (loopback já aceito). Cursor/outros clientes com OAuth: devem funcionar pelo mesmo caminho; não provado.
- ChatGPT: quando o app for ligado a um servidor com OAuth, apontar para este mesmo endpoint (a página /chatgpt e o
  contrato `lib/mcp/chatgptContract.ts` não mudaram).
