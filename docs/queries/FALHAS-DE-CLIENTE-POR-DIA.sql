-- KINEO-LIVRO-DAS-FALHAS-1311 [dono 13/11 ~20:10, no /admin vendo "1 FAILED": "quero saber porque todo cliente que falha, quero saber porque
-- e já ter uma solução"] — TODA falha de cliente, por dia (horário de Brasília), agrupada pela mensagem, com quantas pessoas e quantas
-- conseguiram um filme DEPOIS (vídeo completed ou clipe done criado depois da falha). A explicação de cada mensagem (o que é, causa, o que o
-- cliente vê, solução e estado) mora em docs/FALHAS-DE-CLIENTE-CAUSAS.md — mensagem nova que aparecer aqui sem linha lá = falha sem dono.
--
-- Eventos: generate_failed (a tela de falha, 1 por pedido), video_generation_failed (o mesmo momento, gravado pela tela) e
-- generation_stage_error (cada etapa: scripting, analyzing, generating…; a tela E o servidor gravam, por isso aparece em dobro).
-- Conte PEDIDOS por generate_failed; use generation_stage_error para saber EM QUE ETAPA morreu (as recusas do escritor, 422 em scripting,
-- só existem aqui: o servidor grava antes de a tela mostrar o erro).
-- Fora: contas da casa (a régua de lib/internalAccounts.ts; regenerar se ela mudar) e robôs (metadata.is_bot / bot = true).
-- Janela: troque o '7 days' abaixo. Só leitura.
with casa as (
  select id from auth.users
  where lower(email) = any (array['josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com'])
     or lower(email) like any (array['josephsskaf+%@gmail.com','joseph+%@gmail.com','joseph+%','victoriaskaf%','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%'])
),
falhas as (
  select e.created_at,
         (e.created_at at time zone 'America/Sao_Paulo')::date as dia,
         e.user_id,
         e.name as evento,
         coalesce(e.metadata->>'stage', '') as etapa,
         coalesce(e.metadata->>'reason', '') as motivo,
         left(regexp_replace(coalesce(nullif(e.metadata->>'error', ''), e.metadata->>'message', ''), '[0-9]+', 'N', 'g'), 110) as mensagem
  from events e
  where e.name in ('generate_failed', 'video_generation_failed', 'generation_stage_error')
    and e.created_at > now() - interval '7 days'
    and e.user_id is not null
    and e.user_id not in (select id from casa)
    and coalesce(e.metadata->>'is_bot', '') <> 'true'
    and coalesce(e.metadata->>'bot', '') <> 'true'
),
com_desfecho as (
  select f.*,
         exists (select 1 from videos v where v.user_id = f.user_id and v.status = 'completed' and v.created_at > f.created_at)
      or exists (select 1 from clips c where c.user_id = f.user_id and c.status = 'done' and c.created_at > f.created_at) as filme_depois
  from falhas f
)
select dia,
       evento,
       etapa,
       motivo,
       mensagem,
       count(*) as vezes,
       count(distinct user_id) as pessoas,
       count(distinct user_id) filter (where filme_depois) as pessoas_com_filme_depois,
       count(distinct user_id) filter (where not filme_depois) as pessoas_sem_filme_depois
from com_desfecho
group by dia, evento, etapa, motivo, mensagem
order by dia desc, evento, pessoas desc, vezes desc;
