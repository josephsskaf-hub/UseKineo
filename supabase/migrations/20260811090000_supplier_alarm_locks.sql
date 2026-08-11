-- KINEO-SUPPLIER-ALARM-2026-08-11 — travas de idempotência do alarme de fornecedor.
--
-- ADITIVA E SOMENTE ADITIVA: cria dois índices únicos PARCIAIS sobre `events`.
-- Não cria tabela, não altera coluna, não escreve linha, não toca em crédito,
-- preço ou entitlement. Rodar duas vezes é seguro (IF NOT EXISTS).
--
-- POR QUE ÍNDICE E NÃO "checar antes de inserir": o playbook desta casa já
-- aprendeu a diferença da forma cara. Ver o bloco "A TRAVA REAL NÃO PERGUNTA,
-- ELA RESERVA" em app/api/cron/send-cap-hit/route.ts — uma consulta de "eu já
-- avisei?" depende de a leitura refletir a escrita anterior, que é justamente a
-- propriedade que falhou em 05/08 e produziu 3 e-mails idênticos em 90 minutos.
-- O banco recusando o segundo INSERT não depende de nada disso.
--
--   1. events_supplier_alarm_once_per_incident
--      Um `supplier_alarm_fired` por `incident_key`. É o que transforma as 33
--      horas do apagão de 09/08 em UM e-mail em vez de 33.
--
--   2. events_supplier_projection_once_per_cycle
--      Um aviso de "vai estourar antes do fim do ciclo" por fornecedor por
--      ciclo (`cycle_key` = fornecedor:data-de-início-do-ciclo).

create unique index if not exists events_supplier_alarm_once_per_incident
  on public.events ((metadata->>'incident_key'))
  where name = 'supplier_alarm_fired';

create unique index if not exists events_supplier_projection_once_per_cycle
  on public.events ((metadata->>'cycle_key'))
  where name = 'supplier_burn_projection';
