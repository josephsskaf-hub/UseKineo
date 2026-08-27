-- HOTFIX-EVENTS-LOCKDOWN: finish least-privilege cleanup for the server role.
--
-- The preceding migration removed every browser-facing grant, but service_role
-- already held the table's full legacy grant. GRANTing four privileges does not
-- implicitly revoke TRUNCATE, REFERENCES, TRIGGER or MAINTAIN.
--
-- Repository call-graph audit on 2026-08-27 found only SELECT, INSERT, UPDATE
-- and DELETE against public.events. Existing row triggers continue to fire;
-- the TRIGGER privilege is only required to create or alter a trigger.

REVOKE ALL PRIVILEGES ON TABLE public.events FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO service_role;
