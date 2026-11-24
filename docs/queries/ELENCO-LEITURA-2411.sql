-- KINEO-LEITURA-2411 — quanto a leitura semântica acerta a contagem de pessoas, e o que a regra da pista faria em 'public'.
-- Fonte: cinematic_dispatch_result.metadata.leitura_2411 (gravado para TODAS as contas desde o deploy desta medida; só números,
-- booleanos e códigos de língua). Só SELECT. A condição de conta interna é a de lib/internalAccounts.ts (externalAccountsSqlCondition);
-- se a lista mudar lá, mude aqui.
-- Uso: rodar inteiro. 1ª parte = por dia; 2ª parte = os filmes em que a regra agiria (8 caracteres da geração), para o revisor de vídeos
-- conferir se a 2ª pessoa retirada era real.

with base as (
  select e.created_at,
         left(e.metadata->>'generation_id', 8)          as geracao,
         e.metadata->'leitura_2411'                       as l,
         not (lower(u.email) in ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
              or lower(u.email) like 'josephsskaf+%@gmail.com' or lower(u.email) like 'joseph+%@gmail.com' or lower(u.email) like 'joseph+%'
              or lower(u.email) like 'victoriaskaf%' or lower(u.email) like '%@theresanaiforthat.com' or lower(u.email) like 'josephsskaf%'
              or lower(u.email) like 'josephskaf%' or lower(u.email) like '%@shortsforgeai.com' or lower(u.email) like 'test%'
              or lower(u.email) like '%mailinator%' or lower(u.email) like 'smoketest%') as cliente
  from events e
  left join auth.users u on u.id = e.user_id
  where e.name = 'cinematic_dispatch_result'
    and jsonb_typeof(e.metadata->'leitura_2411') = 'object'
    and e.created_at > now() - interval '30 days'
)
-- 1) por dia
select created_at::date                                                         as dia,
       count(*) filter (where cliente)                                           as filmes_cliente,
       count(*) filter (where not cliente)                                       as filmes_casa,
       count(*) filter (where cliente and (l->>'respondeu')::boolean)            as cliente_com_leitura,
       count(*) filter (where cliente and (l->>'pessoas_lidas')::int = 0)        as cliente_lidas_0,
       count(*) filter (where cliente and (l->>'pessoas_lidas')::int = 1)        as cliente_lidas_1,
       count(*) filter (where cliente and (l->>'pessoas_lidas')::int = 2)        as cliente_lidas_2,
       count(*) filter (where cliente and (l->>'pessoas_lidas')::int >= 3)       as cliente_lidas_3_ou_mais,
       count(*) filter (where cliente and (l->>'coadjuvantes_so_citados')::int > 0) as cliente_com_so_citado,
       count(*) filter (where cliente and l ? 'a_regra_agiria')                  as cliente_passou_no_15s,
       count(*) filter (where cliente and (l->>'a_regra_agiria')::boolean)       as cliente_regra_agiria,
       count(*) filter (where (l->>'a_regra_agiria')::boolean)                   as todos_regra_agiria,
       count(*) filter (where cliente and (l->>'papeis_so_da_pista')::int > 0)   as cliente_com_papel_so_da_pista,
       count(*) filter (where cliente and l->>'lingua_do_detector' is not null
                         and l->>'lingua_resolvida' <> l->>'lingua_do_detector')  as cliente_lingua_difere_do_detector,
       count(*) filter (where cliente and l->>'lingua_do_detector' is null)      as cliente_detector_sem_resposta,
       count(*) filter (where cliente and l->>'lingua_resolvida' = 'en' and l->>'lingua_pedida' is null
                         and l->>'lingua_do_detector' is distinct from 'en')      as cliente_en_sem_pedido_nem_detector,
       count(*) filter (where (l->>'erro')::boolean)                             as medidas_com_erro
from base
group by 1
order by 1;

-- 2) os filmes em que a regra da pista agiria (para o revisor de vídeos olhar a 2ª pessoa)
with base as (
  select e.created_at, left(e.metadata->>'generation_id', 8) as geracao, e.metadata->'leitura_2411' as l,
         not (lower(u.email) in ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
              or lower(u.email) like 'josephsskaf+%@gmail.com' or lower(u.email) like 'joseph+%@gmail.com' or lower(u.email) like 'joseph+%'
              or lower(u.email) like 'victoriaskaf%' or lower(u.email) like '%@theresanaiforthat.com' or lower(u.email) like 'josephsskaf%'
              or lower(u.email) like 'josephskaf%' or lower(u.email) like '%@shortsforgeai.com' or lower(u.email) like 'test%'
              or lower(u.email) like '%mailinator%' or lower(u.email) like 'smoketest%') as cliente
  from events e left join auth.users u on u.id = e.user_id
  where e.name = 'cinematic_dispatch_result' and jsonb_typeof(e.metadata->'leitura_2411') = 'object'
    and (e.metadata->'leitura_2411'->>'a_regra_agiria')::boolean
    and e.created_at > now() - interval '30 days'
)
select created_at::date as dia, geracao, cliente,
       (l->>'pessoas_lidas')::int as pessoas_lidas, (l->>'coadjuvantes_so_citados')::int as so_citados,
       (l->>'papeis_so_da_pista')::int as papeis_so_da_pista, (l->>'elenco_antes')::int as elenco_antes,
       (l->>'elenco_se_public')::int as elenco_se_public, l->>'lingua_resolvida' as lingua, l->>'lingua_do_detector' as detector
from base
order by created_at desc;
