-- HOTFIX-EVENTS-LOCKDOWN: public.events deixa de aceitar escrita direta do browser.
--
-- Evidência de produção observada em 2026-08-26:
--   * RLS habilitado, sem FORCE
--   * policy service_insert: INSERT para PUBLIC com WITH CHECK (true)
--   * anon/authenticated com privilégios amplos, inclusive INSERT
--
-- A aplicação legítima escreve por /api/events ou por rotas servidoras, todas
-- com service_role. O browser não precisa de acesso direto à tabela.

REVOKE ALL PRIVILEGES ON TABLE public.events FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM authenticated;

-- Privilégio mínimo usado pelos escritores e leitores servidores atuais.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO service_role;

-- service_role faz BYPASSRLS; a policy pública era a brecha.
DROP POLICY IF EXISTS service_insert ON public.events;

-- A policy no_public_read é preservada. Esta migration não toca em linhas,
-- índices, sequências, funções, default privileges ou outras tabelas.
