# CONTRATO HOLLYWOOD — a solução definitiva do motor flagship
> Origem: render ef2d09bf (Boiling River, 18/08 03:39Z). Fundador: "não podemos
> mais ter nosso motor flagship ruim dessa forma. Solução definitiva."
> Este doc é PRIORIDADE #1 da próxima sessão de trabalho, na frente de
> Lipsync/Characters/Channels.

## A AUTÓPSIA (evidência no runtime log do render, não dedução)

Pedido: 60s, script verbatim de ~160 palavras, Kling 3, $8.52 de custo fal.
Entregue: 44.8s, roteiro reescrito, 1 cena borrada, cenas escuras. O log confessa:

1. **`hollywood plan too short: 46s of 68s target — replanning once` →
   `51s ... replan por MAIS CENAS` → `plan duration: 51s of 68s (7 scenes)` e
   SUBMETEU MESMO ASSIM.** O replan desiste em 51/68 (75%) e o FAILFAST de 60%
   deixa passar. Clipes renderizados vieram ainda mais curtos → corte final
   44.8s. **Duração hoje é desejo, não contrato.**

2. **Voiceovers por cena: 16+12+13+11 ≈ 52 palavras faladas** — de um script de
   160. No Hollywood, "Use my script as is" NÃO é honrado: o planner CONDENSA o
   roteiro em falas curtas de personagem e INVENTA linhas ("the river's mystery
   endures" não existe no script do fundador; o hook repetiu no final).

3. **`scenes 2 and 3 are near-identical — replanning... still repetitive —
   keeping best effort`** — o guard de variedade AVISA e ENTREGA ASSIM MESMO.
   A cena borrada é a scene 3 (`fal-ai/veo3.1/fast`, cinematic de apoio).
   Gates que não bloqueiam são diário de bordo de naufrágio.

4. **Bônus grave:** o vídeo de 150cr saiu com watermark `usekineo.com/free`
   QUEIMADO. Cliente pago com marca de free. Investigar a condição do
   watermark no compose (todos os hollywood do fundador têm isso).

## O CONTRATO (4 cláusulas — hard gates, nunca warnings)

### Cláusula 1 — NARRAÇÃO VERBATIM É O TRILHO MESTRE
A mudança-chave que resolve duração E fidelidade DE UMA VEZ: no Hollywood com
script_mode=verbatim, o script do fundador vira a NARRAÇÃO CONTÍNUA (voz
documentary, como o fast-path já faz com per-scene mp3 — a infra existe), e o
relógio do filme é a narração: 160 palavras / 2.3wps ≈ 65s GARANTIDOS. As falas
de personagem (lipsync nativo do Kling) viram COMPLEMENTO em 1-2 cenas de
dialogue (host fala a frase do beat que já está no script — nunca texto
inventado). O planner passa a planejar CENAS PARA COBRIR A NARRAÇÃO, não a
reescrever.

### Cláusula 2 — DURAÇÃO É CONTRATO
- Plano submetido < 95% do alvo → PROIBIDO submeter. Cenas de apoio ($0.13-1.2)
  são adicionadas até fechar a conta — sempre possível matematicamente.
- Pós-render: soma real dos clipes < alvo → renderizar cena(s) extra ANTES do
  compose (nunca compor curto).
- Pedido 60s (regra TikTok Rewards) → entrega ≥ 61s, sem exceção.

### Cláusula 3 — QA DE CENA COM DENTES (o Quality Gate)
Todo clipe renderizado passa por inspeção ANTES do compose:
- duração real vs planejada (>85%);
- variedade: near-identical → re-render com prompt divergente (não "best effort");
- nitidez: variância do Laplaciano no frame central abaixo do piso → re-render;
- luma: cena com média muito escura → re-render com "bright, well-lit" no prompt.
1 re-render automático por cena; falhou de novo → troca de motor (Veo↔Kling
support). O compose SÓ monta com todas as cenas aprovadas.

### Cláusula 4 — WATERMARK SÓ NO FREE
Corrigir a condição de queima no compose: render pago NUNCA carrega
usekineo.com/free. Teste com o render do fundador.

## Ordem de implementação (1 dia)
1. Cláusula 4 (30min, bug isolado) → 2. Cláusula 2 no planner (gate 95% +
   apoio-até-fechar) → 3. Cláusula 1 (narração verbatim como trilho; reusar
   per-scene TTS do compose) → 4. Cláusula 3 (QA gate com ffprobe/sharpness no
   servidor — sharp/luma via extração de 1 frame por clipe).
Validação: re-render do MESMO script do Boiling River; aprovado só se sair
≥61s, narração fiel, zero cena borrada/repetida. Esse render de validação é a
vitrine nova de graça.
