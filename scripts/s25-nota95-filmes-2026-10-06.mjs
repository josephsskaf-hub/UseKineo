// FIXTURE do guardião scripts/test-s25-nota95-2026-10-06.mjs — os 3 filmes Seedance 2.5 de 06/10/2026 avaliados pelo
// fundador por folha de contato (Tambora 1816 = 80, Boston 1919 = 78, Londres 1952 = 72).
// Fonte: events.cinematic_submission_claim (metadata.response.scene_prompts / scene_narrations / prompt / scene_anchor_urls),
// gerações 713564f2 / 3a0082b2 / 387d3344. `promptEnviado` é o prompt EXATO que foi ao fal (md5 conferido com o banco em
// 06/10: select md5(p) from events, jsonb_array_elements_text(metadata->'response'->'scene_prompts') …). A environmentSheet de
// Londres é a frase que o planejador repetiu nas cenas 1, 5 e 6 (o claim não guarda a ficha). Dados, não código.
export const ESTILO = "shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain"
export const FILMES = [
  {
    "nome": "Tambora 1816",
    "generationId": "713564f2-8ccb-4699-9fec-954d114466a5",
    "notaDoFundador": 80,
    "roteiro": "In April 1815, Mount Tambora in Indonesia exploded with a roar heard two thousand kilometers away. Its ash rose so high that it spread a thin veil around the entire planet. The next year, snow fell in New England in June and frosts killed crops in July. In Europe, cold rain fell for weeks and wheat rotted in the flooded fields across the continent. Thousands of families packed their wagons and headed west in search of warmer land. People called 1816 the year without a summer, and historians traced it to a single mountain.",
    "characterSheet": "",
    "environmentSheet": "",
    "eraSuffix": ", period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic",
    "ancorasReais": [
      null,
      "J5FNFca1E2MZQV00aSVbg",
      "dS9lfqwsnIvzm0BfZL2MU",
      "r9dJouQgxl5EbmMLPoZ8W",
      "ru_RA5misGX-yQhj6fPY6",
      "zZi4sSALewi8Iulb8McO8",
      "VzeSCOKEpTGj0zGowRb8i"
    ],
    "cenas": [
      {
        "type": "cinematic",
        "voiceover": "In April 1815, Mount Tambora in Indonesia exploded with a",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. Shows exactly this moment, as the narration describes it: In April 1815, Mount Tambora in Indonesia exploded with a An aerial view of Mount Tambora in Indonesia, the sky turning dark as a massive eruption blasts ash into the atmosphere. The ground shakes violently with the force of the explosion. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "cb7a3e875d9cc76c5597d395a7c9e3c9"
      },
      {
        "type": "support",
        "voiceover": "roar heard two thousand kilometers away.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: roar heard two thousand kilometers away. A vast landscape showing the sound waves rippling through the air, with trees swaying and dust being disturbed, indicating the roar of the eruption. The horizon is stable, with natural imperfect lighting and light film grain, shot on 35mm, teal-orange grade, shallow depth of field., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "48fe88cba5e8aa37760a15e9928135a7"
      },
      {
        "type": "cinematic",
        "voiceover": "Its ash rose so high that it spread a thin veil around the entire planet.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. A sweeping aerial view of the Earth with a thin veil of ash covering the surface, casting a shadow over various landscapes. The shot captures the vastness of the planet and the ash cloud spreading, with natural imperfect lighting and light film grain, shot on 35mm, teal-orange grade, shallow depth of field., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "8cc956e589ee371204b0e0aff77bde2d"
      },
      {
        "type": "support",
        "voiceover": "The next year, snow fell in New England in June and frosts killed crops in July.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: The next year, snow fell in New England in June and frosts killed crops in July. A cold June morning in New England, snow covering fields that should be lush with summer growth. Farmers stare at their barren lands. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "811bd3c36d04ab646f8e36c1c1026806"
      },
      {
        "type": "support",
        "voiceover": "In Europe, cold rain fell for weeks and wheat rotted in the flooded fields across the continent.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Flooded wheat fields in Europe, rain pouring relentlessly as the crops rot in the muddy water. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "ef91f2253561e3488858e09435e0b16b"
      },
      {
        "type": "cinematic",
        "voiceover": "Thousands of families packed their wagons and headed west in search of warmer land.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. A long line of wagons heading westward, families seeking warmer lands under gray, overcast skies. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "1489ee318816b2a5ff243863d2061dc5"
      },
      {
        "type": "support",
        "voiceover": "People called 1816 the year without a summer, and historians traced it to a single mountain.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: People called 1816 the year without a summer, and historians traced it to a single mountain. A panoramic view of a desolate landscape with a signpost indicating the year 1816, surrounded by barren fields and a single mountain in the distance. The shot captures the essence of the year, with natural imperfect lighting and light film grain, shot on 35mm, teal-orange grade, shallow depth of field., period piece set strictly in the year 1815, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "d7f03627269a355ce85934c68006d67b"
      }
    ]
  },
  {
    "nome": "Boston 1919",
    "generationId": "3a0082b2-fb84-49f1-a720-8b26d7d91796",
    "notaDoFundador": 78,
    "roteiro": "In January 1919, a steel tank in Boston held two point three million gallons of molasses. At half past noon on a warm winter day, its rivets burst with a sound like gunfire. A brown wave twenty five feet high rolled through the North End at thirty five miles per hour. It crushed wagons, buildings and the girders of an elevated railway in a matter of seconds. Twenty one people died and rescuers waded waist deep in the sticky flood for days. For decades, people in the North End said the streets smelled sweet on hot summer days.",
    "characterSheet": "",
    "environmentSheet": "",
    "eraSuffix": ", period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic",
    "ancorasReais": [
      null,
      null,
      "yqbyyJ_UcZkCQCVIEmXfk",
      "lL_upSKeEBM7PXrnjnMrx",
      null,
      null
    ],
    "cenas": [
      {
        "type": "cinematic",
        "voiceover": "In January 1919, a steel tank in Boston held two point three million gallons of molasses.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. Shows exactly this moment, as the narration describes it: In January 1919, a steel tank in Boston held two point three million gallons of molasses. An aerial view of Boston's North End in January 1919, showing the massive steel tank filled with molasses. The cityscape is bathed in warm winter light, capturing the calm before the disaster. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "92c81e23e2bdae2847918f062e7c97f7"
      },
      {
        "type": "cinematic",
        "voiceover": "At half past noon on a warm winter day, its rivets burst with a sound like gunfire.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. Close-up shot of the steel tank's rivets, suddenly bursting with a loud sound, sending metal fragments flying. The camera captures the moment of explosion, with rivets snapping under immense pressure. Dust and particles are illuminated in a shaft of light. No other characters, no animals, no people, no added props., period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "6ca95b5f56849b07c75fe43f546be834"
      },
      {
        "type": "cinematic",
        "voiceover": "A brown wave twenty five feet high rolled through the North End at thirty",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Wide shot of a massive brown wave of molasses, twenty-five feet high, rolling through the streets of the North End at thirty-five miles per hour, sweeping everything in its path. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "8409eb1d5c37501b7dd4d790f7531b34"
      },
      {
        "type": "support",
        "voiceover": "five miles per hour. It crushed wagons, buildings and the girders of an elevated railway in a matter of seconds.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Ground-level view of the destruction: crushed wagons, collapsed buildings, and twisted girders of an elevated railway, all enveloped in molasses. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only., period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "c270d0857b0ff14e080305abebcf563f"
      },
      {
        "type": "support",
        "voiceover": "Twenty one people died and rescuers waded waist deep in the sticky flood for days.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. Shot of rescuers wading waist deep in thick molasses, struggling to move through the sticky flood. The scene captures their efforts amidst the chaos. No other characters, no animals, no people, no added props., period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "682dfeeb7bb31ad2a43a2436490621e4"
      },
      {
        "type": "support",
        "voiceover": "For decades, people in the North End said the streets smelled sweet on hot summer days.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. Wide shot of the North End streets during a hot summer day, with people enjoying the warmth. The air shimmers, hinting at the sweet smell lingering from the molasses disaster. No other characters, no animals, no people, no added props., period piece set strictly in the year 1919, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "0253025806d8d3ef2d976ea2bd23ce5c"
      }
    ]
  },
  {
    "nome": "Londres 1952",
    "generationId": "387d3344-99bf-4a2f-b975-c16b617ac7b6",
    "notaDoFundador": 72,
    "roteiro": "In December 1952, a cold fog settled over London and refused to leave for five days. Smoke from millions of coal fires mixed with it into a yellow black smog. Buses crawled behind men walking with flares, and cinemas closed because no one could see the screen. Prize cattle at a livestock show choked, and hospitals filled with people gasping for air. Officials later estimated that thousands of Londoners died in those few days. Four years later, Britain passed the Clean Air Act, and the city slowly learned to breathe again.",
    "characterSheet": "A middle-aged British man, around 50, Caucasian, with short grey hair, wearing a classic 1950s dark overcoat, a bowler hat, and a solemn expression",
    "environmentSheet": "A foggy London street in December 1952, with dim gas lamps casting a yellow glow and thick smog blanketing the city.",
    "eraSuffix": "",
    "ancorasReais": [
      "bgxeYjpCGkwbKI67lGD_E",
      "yrsjd8ken0UX_Y3Z0X8Ww",
      "mqKdDZsdbkWO5HQlhPQ7G",
      "tWhduPaIEbD-abOLn6dl9",
      "bgxeYjpCGkwbKI67lGD_E",
      "bgxeYjpCGkwbKI67lGD_E"
    ],
    "cenas": [
      {
        "type": "support",
        "voiceover": "In December 1952, a cold fog settled over London and refused to leave for five days.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: In December 1952, a cold fog settled over London and refused to leave for five days. A middle-aged British man, around 50, Caucasian, with short grey hair, wearing a classic 1950s dark overcoat, a bowler hat, and a solemn expression, stands on a foggy London street in December 1952, with dim gas lamps casting a yellow glow, and thick smog blanketing the city. He looks away from the camera, mouth closed, silent, mouth closed. subtle handheld camera movement, natural imperfect lighting, light film grain, candid framing, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only. If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "af72bb1f007ccf6d449c7e54e58d0f5c"
      },
      {
        "type": "support",
        "voiceover": "Smoke from millions of coal fires mixed with it into a yellow black smog.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: Smoke from millions of coal fires mixed with it into a yellow black smog. A 1950s London street scene with buses crawling slowly through dense yellow-black smog, headlights barely piercing the murk, while men with flares guide them. Subtle camera movement, with natural imperfect lighting and light film grain. 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only. If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "1cbe95eff931581a0bc701ed9d14b8c2"
      },
      {
        "type": "support",
        "voiceover": "Buses crawled behind men walking with flares, and cinemas closed because no one could see the screen.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. A foggy London street scene with buses crawling slowly behind men walking with flares, the dim light barely illuminating the thick smog. Cinemas are closed, their doors shut tight, and no one is seen inside. Subtle camera movement, natural imperfect lighting, light film grain, 9:16 vertical framing. If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "6093dbb0920a62ca1dfee633ef9a590d"
      },
      {
        "type": "support",
        "voiceover": "Prize cattle at a livestock show choked, and hospitals filled with people gasping for air.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Outside a livestock show, prize cattle struggle to breathe, their breath visible in the cold air as they choke on the smog. A high-angle shot captures the scene, with natural imperfect lighting. 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. Level horizon, stable well-composed shot (tripod or slow dolly), no tilted or dutch angles. Tack-sharp focus from the very first frame, crystal-clear and skin texture, high micro-contrast, pristine clarity throughout — never soft focus, never hazy or washed out. No readable text or lettering anywhere in the frame; period-accurate clothing and objects only. If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur., any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers",
        "md5Banco": "663b72c64a6d3fda42a8397c52e9bd0a"
      },
      {
        "type": "support",
        "voiceover": "Officials later estimated that thousands of Londoners died in those few days.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: Officials later estimated that thousands of Londoners died in those few days. A foggy London street in December 1952, with dim gas lamps casting a yellow glow and thick smog blanketing the city. The scene is somber, capturing the essence of loss. Subtle handheld camera movement, natural imperfect lighting, light film grain, 9:16 vertical framing. If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "afcdcb8bebbe8c71381a27da9569c0da"
      },
      {
        "type": "support",
        "voiceover": "Four years later, Britain passed the Clean Air Act, and the city slowly learned to breathe again.",
        "promptEnviado": "Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. Shows exactly this moment, as the narration describes it: Four years later, Britain passed the Clean Air Act, and the city slowly learned to breathe again. A foggy London street in December, with clearer air and bright gas lamps illuminating the scene. People walk freely, some smiling, as the city begins to breathe again. Subtle camera movement, natural imperfect lighting, light film grain, 9:16 vertical framing. If any person is visible: mouth closed, not speaking, no lip movement, no talking. Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.",
        "md5Banco": "4eae474742202569c24f5bf43e1c7c08"
      }
    ]
  }
]
