WITH bounds AS (SELECT timestamptz '2026-09-01 06:00:00+00' AS lo,timestamptz '2026-10-01 06:00:00+00' AS hi),
patterns(pat) AS (VALUES ('josephsskaf@gmail.com'),('josephskaf@hotmail.com'),('victoriaskaf96@gmail.com'),('joseph+teste01@gmail.com'),('teste01@shortsforgeai.com'),('josephsskaf+%@gmail.com'),('joseph+%@gmail.com'),('joseph+%'),('victoriaskaf%'),('%@theresanaiforthat.com'),('josephsskaf%'),('josephskaf%'),('%@shortsforgeai.com'),('test%'),('%mailinator%'),('smoketest%')),
people AS (SELECT p.id,p.created_at,coalesce(nullif(trim(p.signup_utm_source),''),nullif(trim(p.utm_source),''),'unknown') source,p.signup_utm_campaign campaign FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM patterns i WHERE lower(trim(coalesce(p.email,''))) LIKE i.pat)),
cohort AS(SELECT p.* FROM people p,bounds b WHERE p.created_at>=b.lo AND p.created_at<b.hi),
first_sub AS(SELECT e.user_id,min(e.created_at) first_paid FROM events e JOIN people p ON p.id=e.user_id WHERE e.name='payment_success' AND e.metadata->>'checkout_mode'='subscription' AND (e.metadata->>'amount_total')::numeric>0 GROUP BY e.user_id),
flags AS(SELECT p.id,
 EXISTS(SELECT 1 FROM events e,bounds b WHERE e.user_id=p.id AND e.created_at>=p.created_at AND e.created_at<b.hi AND e.name='generate_started' AND nullif(trim(e.session_id),'') IS NOT NULL) generated,
 EXISTS(SELECT 1 FROM events e,bounds b WHERE e.user_id=p.id AND e.created_at>=p.created_at AND e.created_at<b.hi AND e.name='checkout_started' AND nullif(trim(e.session_id),'') IS NOT NULL AND e.metadata->>'tier' IS NOT NULL) subscription_checkout,
 EXISTS(SELECT 1 FROM first_sub s,bounds b WHERE s.user_id=p.id AND s.first_paid>=b.lo AND s.first_paid<b.hi) new_sub,
 EXISTS(SELECT 1 FROM videos v,bounds b WHERE v.user_id=p.id AND v.created_at>=p.created_at AND v.created_at<b.hi AND v.status='completed' AND coalesce(nullif(v.final_video_url,''),nullif(v.video_url,'')) IS NOT NULL) first_video
 FROM cohort p)
SELECT count(*) signup,count(*) FILTER(WHERE generated) generate_people,count(*) FILTER(WHERE new_sub) new_sub_people,count(*) FILTER(WHERE generated AND new_sub) generated_and_new_sub_people,count(*) FILTER(WHERE subscription_checkout) subscription_checkout_people,count(*) FILTER(WHERE subscription_checkout AND new_sub) subscription_checkout_and_new_sub_people,count(*) FILTER(WHERE first_video AND NOT new_sub) film_without_new_sub_people FROM flags;
