-- Funil de /pricing. Corte fixo e somente SELECT. Nenhum identificador bruto sai da consulta.
with
bounds as (select timestamptz '2026-11-23 16:05:00-03' as end_at),
house as materialized (select id from public.kineo_internal_ids()),
pricing_sessions as materialized (
  select distinct e.session_id
  from public.events e cross join bounds b
  where e.created_at >= b.end_at - interval '30 days' and e.created_at < b.end_at
    and e.path = '/pricing' and e.name = 'pricing_view' and e.session_id is not null
    and coalesce(e.metadata->>'is_bot','false') <> 'true'
),
session_users as materialized (
  select e.session_id,
    case when count(distinct e.user_id) = 1 then min(e.user_id::text)::uuid end as attached_user,
    bool_or(h.id is not null) as internal
  from pricing_sessions s join public.events e using (session_id)
  cross join bounds b left join house h on h.id=e.user_id
  where e.created_at >= b.end_at - interval '30 days' and e.created_at < b.end_at and e.user_id is not null
    and coalesce(e.metadata->>'is_bot','false') <> 'true'
  group by e.session_id
),
screen_events as materialized (
  select e.name,e.created_at,e.session_id,e.user_id,e.metadata as m,
    coalesce(e.user_id,s.attached_user) as known_id,
    coalesce('person:'||coalesce(e.user_id,s.attached_user)::text,'session:'||e.session_id::text) as actor
  from public.events e cross join bounds b
  left join session_users s on s.session_id=e.session_id
  left join house h on h.id=e.user_id
  where e.created_at >= b.end_at - interval '30 days' and e.created_at < b.end_at and e.path='/pricing'
    and e.name in ('pricing_view','pricing_plan_selected','checkout_cta_clicked','starter_checkout_clicked','basic_checkout_clicked',
      'pro_checkout_clicked','business_checkout_clicked','pricing_mobile_sticky_billing_viewed','pricing_mobile_sticky_checkout_clicked')
    and coalesce(e.metadata->>'is_bot','false') <> 'true'
    and h.id is null and not coalesce(s.internal,false)
),
first_view as (
  select distinct on (actor) actor, known_id, user_id is not null as logged, session_id, created_at as seen_at,
   case when m->>'billing_default' in ('monthly','annual') then m->>'billing_default' else 'unknown' end as initial_billing
  from screen_events where name='pricing_view' and actor is not null order by actor,created_at,session_id
),
cohort as materialized (
  select v.*,
    case when v.known_id is not null then 'pessoa' else 'sessao_sem_conta' end as identity_kind,
    case when p.signup_country ~ '^[A-Za-z]{2}$' and upper(p.signup_country)<>'XX' then
      case when upper(p.signup_country)=any(string_to_array(
        'US,CA,GB,IE,AU,NZ,AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE,NO,IS,LI,CH,JP,KR,SG,HK,TW,AE,SA,QA,KW,BH,OM,IL',','))
        then 'rico' else 'resto' end
      else 'desconhecido' end as country_group,
    case when exists (select 1 from screen_events d where d.session_id=v.session_id
      and d.name in ('pricing_mobile_sticky_billing_viewed','pricing_mobile_sticky_checkout_clicked'))
      then 'celular_confirmado' else 'desconhecido' end as device
  from first_view v left join public.profiles p on p.id=v.known_id
),
selections as materialized (
  select c.actor,e.session_id,e.created_at as clicked_at,e.m->>'tier' as tier,e.m->>'billing' as billing,
    e.name<>'pricing_plan_selected' as is_purchase_cta
  from cohort c join screen_events e using (actor)
  where e.name in ('pricing_plan_selected','checkout_cta_clicked','starter_checkout_clicked','basic_checkout_clicked',
    'pro_checkout_clicked','business_checkout_clicked','pricing_mobile_sticky_checkout_clicked')
    and e.created_at >= c.seen_at and e.m->>'tier' in ('starter','basic','pro','business')
    and e.m->>'billing' in ('monthly','annual')
),
opened_all as materialized (
  select e.created_at as opened_at, e.session_id, e.user_id, e.metadata->>'stripe_session_id' as stripe_session,
    e.metadata->>'tier' as tier,e.metadata->>'billing' as billing
  from public.events e cross join bounds b left join house h on h.id=e.user_id
  where e.created_at >= b.end_at - interval '30 days' and e.created_at < b.end_at and e.name='checkout_started'
    and e.metadata->>'tier' in ('starter','basic','pro','business') and e.metadata->>'billing' in ('monthly','annual')
    and e.metadata->>'stripe_session_id' like 'cs_live_%'
    and coalesce(e.metadata->>'ua_class','unknown') <> 'bot' and coalesce(e.metadata->>'prefetch','false') <> 'true'
    and h.id is null
),
opened as materialized (
  select distinct on (o.stripe_session) s.actor,o.stripe_session,o.billing,o.opened_at
  from opened_all o join selections s on s.is_purchase_cta and s.tier=o.tier and s.billing=o.billing
    and o.opened_at between s.clicked_at - interval '2 seconds' and s.clicked_at + interval '30 minutes'
  join cohort c on c.actor=s.actor
    and ((o.session_id is not null and o.session_id=s.session_id and (o.user_id is null or o.user_id=c.known_id))
      or (o.session_id is null and o.user_id=c.known_id))
  order by o.stripe_session, s.clicked_at desc
),
paid as materialized (
  select distinct o.actor,o.billing
  from opened o join public.events e on e.name='payment_success' and e.metadata->>'stripe_session_id'=o.stripe_session
  cross join bounds b left join house h on h.id=e.user_id
  where e.created_at >= o.opened_at and e.created_at < b.end_at
    and e.metadata->>'checkout_mode'='subscription' and coalesce(e.metadata->>'stripe_livemode','true')='true'
    and coalesce(e.metadata->>'stripe_payment_status','paid')='paid'
    and coalesce(e.metadata->>'card_trial','false')<>'true'
    and coalesce(e.metadata->>'amount_total','') ~ '^[1-9][0-9]*$'
    and h.id is null
),
wide as (
  select c.*,
    exists(select 1 from selections s where s.actor=c.actor) as clicked,
    exists(select 1 from selections s where s.actor=c.actor and s.is_purchase_cta) as purchase_cta,
    exists(select 1 from opened o where o.actor=c.actor) as checkout,
    exists(select 1 from paid p where p.actor=c.actor) as pay
  from cohort c
),
breakdowns as (
  select dim,val,identity_kind,count(*) as viu,count(*) filter(where clicked) as clicou_plano,
    count(*) filter(where purchase_cta) as clicou_compra,count(*) filter(where checkout) as checkout_criado,
    count(*) filter(where pay) as pagou
  from wide cross join lateral (values
    ('total','total'), ('pais',country_group), ('sessao_inicial',case when logged then 'logado' else 'convidado' end),
    ('dispositivo',device), ('periodo_exibido_na_entrada',initial_billing)
  ) as groups(dim,val)
  group by dim,val,identity_kind
),
chosen_periods as (
  select s.billing,count(distinct s.actor) as clicou_plano,
    count(distinct s.actor) filter(where s.is_purchase_cta) as clicou_compra,
    count(distinct o.actor) as checkout_criado,count(distinct p.actor) as pagou
  from selections s left join opened o on o.actor=s.actor and o.billing=s.billing
  left join paid p on p.actor=s.actor and p.billing=s.billing group by s.billing
)
select (select jsonb_agg(d order by dim,val,identity_kind) from breakdowns d) as funil,
  (select jsonb_agg(d order by billing) from chosen_periods d) as periodo_escolhido,
  (select count(distinct stripe_session) from opened_all) as sessoes_checkout_canonicas_todos_canais,
  (select count(distinct stripe_session) from opened_all where session_id is null and user_id is null) as checkouts_sem_sinal_de_vinculo,
  (select count(distinct stripe_session) from opened) as sessoes_ligadas_ao_clique;
