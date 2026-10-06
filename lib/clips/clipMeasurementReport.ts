// Read-only aggregate query for the 24-hour report. No credentials, PII rows or database writes.
import { externalAccountsSqlCondition } from '@/lib/internalAccounts'
import { CLIP_MEASUREMENT_VERSION } from './clipMeasurement'

export function clipMeasurementReportQuery(from: string, until: string): string {
  const start = new Date(from), end = new Date(until)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error('Valid increasing report bounds required')
  const external = externalAccountsSqlCondition('p.email')
  return `
WITH window_events AS (
  SELECT e.*
  FROM public.events e
  WHERE e.created_at >= '${start.toISOString()}'::timestamptz
    AND e.created_at < '${end.toISOString()}'::timestamptz
    AND e.metadata->>'clip_measurement_version' = '${CLIP_MEASUREMENT_VERSION}'
    AND e.name IN ('clip_surface_impression', 'clip_surface_first_gesture', 'clip_effect_chosen', 'clip_effect_ready')
), internal_browsers AS (
  SELECT DISTINCT e.metadata->>'clip_browser' AS browser
  FROM window_events e JOIN public.profiles p ON p.id = e.user_id
  WHERE NOT (${external}) AND e.metadata->>'clip_browser' IS NOT NULL
), external_events AS (
  SELECT e.*
  FROM window_events e LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE (e.user_id IS NULL OR (${external}))
    AND e.metadata->>'is_bot' = 'false'
    AND NOT EXISTS (SELECT 1 FROM internal_browsers b WHERE b.browser = e.metadata->>'clip_browser')
), chosen AS (
  SELECT DISTINCT ON (e.user_id, e.metadata->>'clip_id')
    e.user_id, e.metadata->>'clip_id' AS clip_id, e.metadata->>'effect' AS effect,
    CASE WHEN e.metadata->>'clip_origin' IN ('home', 'effect_page', 'clips')
      THEN e.metadata->>'clip_origin' ELSE 'unknown' END AS origin,
    e.metadata->>'clip_origin_evidence' AS origin_evidence
  FROM external_events e JOIN public.clips c ON c.id::text = e.metadata->>'clip_id' AND c.user_id = e.user_id
  WHERE e.name = 'clip_effect_chosen' AND e.user_id IS NOT NULL
  ORDER BY e.user_id, e.metadata->>'clip_id', e.created_at, e.id
), ready AS (
  -- Origin is carried by the accepted request. Same clip, person and effect, including completion by the sweep.
  SELECT DISTINCT c.user_id, c.clip_id, c.effect, c.origin
  FROM chosen c JOIN public.events r
    ON r.name = 'clip_effect_ready' AND r.user_id = c.user_id
    AND r.metadata->>'clip_id' = c.clip_id AND r.metadata->>'effect' = c.effect
  JOIN public.clips job ON job.id::text = c.clip_id AND job.user_id = c.user_id AND job.status = 'done'
  WHERE r.created_at < '${end.toISOString()}'::timestamptz
), effect_funnel AS (
  SELECT c.effect, c.origin, count(DISTINCT c.user_id)::int AS chosen_people,
    count(DISTINCT c.clip_id)::int AS chosen_clips,
    count(DISTINCT r.user_id)::int AS ready_people, count(DISTINCT r.clip_id)::int AS ready_clips
  FROM chosen c LEFT JOIN ready r ON r.user_id = c.user_id AND r.clip_id = c.clip_id AND r.effect = c.effect
  GROUP BY c.effect, c.origin
), surfaces AS (
  SELECT e.metadata->>'surface' AS surface, e.metadata->>'effect' AS effect, e.name,
    count(DISTINCT e.user_id)::int AS identified_people,
    count(DISTINCT e.metadata->>'clip_browser') FILTER (
      WHERE e.user_id IS NULL AND e.metadata->>'clip_browser_persistent' = 'true'
    )::int AS anonymous_browsers,
    count(*) FILTER (WHERE e.user_id IS NULL AND e.metadata->>'clip_browser_persistent' IS DISTINCT FROM 'true')::int AS anonymous_events_without_durable_id,
    count(*)::int AS events
  FROM external_events e WHERE e.name IN ('clip_surface_impression', 'clip_surface_first_gesture')
  GROUP BY 1,2,3
)
SELECT jsonb_build_object(
  'cohort', '${CLIP_MEASUREMENT_VERSION}', 'from', '${start.toISOString()}', 'until', '${end.toISOString()}',
  'recorded_cohort_events', (SELECT count(*) FROM window_events),
  'identified_chosen_people', (SELECT count(DISTINCT user_id) FROM chosen),
  'identified_ready_people', (SELECT count(DISTINCT user_id) FROM ready),
  'chosen_without_origin', (SELECT count(*) FROM chosen WHERE origin = 'unknown'),
  'known_bot_events', (SELECT count(*) FROM window_events WHERE metadata->>'is_bot' = 'true'),
  'surface_or_chosen_events_without_bot_classification', (SELECT count(*) FROM window_events
    WHERE name <> 'clip_effect_ready' AND metadata->>'is_bot' IS NULL),
  'external_ready_events_without_matching_cohort_request', (SELECT count(*) FROM window_events r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.name = 'clip_effect_ready' AND (${external})
    AND NOT EXISTS (SELECT 1 FROM chosen c WHERE c.user_id = r.user_id AND c.clip_id = r.metadata->>'clip_id' AND c.effect = r.metadata->>'effect')),
  'effects', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY effect, origin) FROM effect_funnel f), '[]'::jsonb),
  'surfaces', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY surface, effect, name) FROM surfaces s), '[]'::jsonb)
) AS report;
`
}
