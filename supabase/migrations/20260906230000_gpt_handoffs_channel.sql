-- KINEO-ASSISTANT-LINK-2026-09-06
-- A mesma caixa postal do GPT da loja, agora com DOIS canais de entrada:
--   gpt_store      = a Action (POST /api/gpt/handoff) do GPT publicado;
--   assistant_link = o link GET /make?script=... que QUALQUER assistente
--                    (ChatGPT sem action, Claude, Perplexity, Gemini) sabe
--                    escrever. Mesma linha, mesma pagina /go, mesmos eventos.
--
-- `channel`      — por onde a linha nasceu; default 'gpt_store' cobre as
--                  linhas que ja existem (comportamento identico ao de antes).
-- `payload_hash` — sha256(canal + payload em ordem fixa). Chave de
--                  idempotencia: o mesmo link clicado 3x (ou o mesmo roteiro
--                  reenviado pela Action) e UMA linha, senao o funil
--                  created -> viewed -> clicked mente. Indice unico PARCIAL:
--                  linhas antigas (hash nulo) nao colidem entre si.
--
-- NADA aqui cria conta, debita credito ou chama fornecedor.
alter table public.gpt_handoffs add column if not exists channel text not null default 'gpt_store';
alter table public.gpt_handoffs add column if not exists payload_hash text;
create unique index if not exists gpt_handoffs_payload_hash_key
  on public.gpt_handoffs (payload_hash) where payload_hash is not null;
