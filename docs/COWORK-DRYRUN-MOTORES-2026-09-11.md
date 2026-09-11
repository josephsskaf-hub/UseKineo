# Cowork — Teste de $0 dos motores (dry-run) · 11/09/2026

O fundador: "não adianta ficar testando, cada vídeo sai cinco dólares". Existe um
validador de $0 (`dry_run: true`, só contas do fundador) que devolve o plano
cena a cena — tipo, segundos, texto falado — e, desde hoje, **quem fala** (modo
visual), a ficha do personagem e a voz que sairia da boca dele. Custa os centavos
do GPT do planejador; zero fal, zero créditos (estorno automático).

Descrição da ação (≤300): "No Studio da Kineo, logado como fundador, rodar o
validador de $0 (dry_run) para um roteiro em três motores pelo console do
navegador e copiar o JSON de resposta. Não clicar em Generate. Não gastar crédito."

---

```
COWORK · DRY-RUN DE $0 · 11/09

Chrome do fundador, logado em https://www.usekineo.com/studio . NÃO clique em Generate. NÃO mude plano. Nada aqui gasta crédito.

1. Abra o DevTools (F12) → aba Console.
2. Cole e execute o bloco abaixo UMA vez por motor, trocando só o valor de ENGINE: "hollywood" (Kling 3), "h3" (MiniMax H3), "omni" (Omni Flash).

const ENGINE = "hollywood";
const SCRIPT = "My name is Tomás, and I was the last lighthouse keeper on Ilha das Cabras. In 1987 the government shut the light off and told me to leave. I didn't. Every night for thirty years I climbed the ninety-two steps and lit the lamp by hand, because one fishing boat still came home this way. People in the village said I was stubborn. Maybe. But a light is a promise, and I don't break promises. Storms came. The stairs cracked. My knees got old. Still, every night, the lamp burned. Last winter that boat brought my grandson. He was afraid of the dark, so I gave him the matches. He climbed the ninety-two steps with me, and this year, for the first time, he lit the lamp himself. Now the island has two keepers. The light stays on.";
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ generationId: crypto.randomUUID(), prompt: SCRIPT, duration: 60, engine: ENGINE, language: 'en', script_mode: 'verbatim', dry_run: true }) });
const j = await r.json(); console.log(JSON.stringify({ status: r.status, verdict: j.verdict, visual_mode: j.visual_mode, reason: j.visual_mode_reason, dialogue_scenes: j.dialogue_scenes, character_sheet: j.character_sheet, character_voice: j.character_voice, target_seconds: j.target_seconds, total_seconds: j.total_seconds, mute_seconds: j.mute_seconds, preflight_problems: j.preflight_problems, scenes: j.scenes }, null, 2));

3. Copie a saída inteira do console de cada motor (três blocos) para o relatório. Se vier erro 4xx/5xx, copie o texto do erro.

RELATÓRIO: três blocos JSON (hollywood, h3, omni), sem editar.
```

O que eu leio nos três JSONs: `visual_mode` deve ser `presenter` (o roteiro é na
primeira pessoa), `dialogue_scenes` ≥ 2 (abertura e fecho falados pelo Tomás),
`character_voice.gender = male` e `voice = onyx`, e `verdict` PASS sem mudo. Só
depois disso vale um render pago, e um só.
