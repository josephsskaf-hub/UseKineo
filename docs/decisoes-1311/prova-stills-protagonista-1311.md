# Prova de stills — regra do protagonista (KINEO-PROTAGONISTA-1311) · 13/11/2026

**O que prova:** que um pedido com protagonista, que antes saía sem rosto (documentary_faceless, sem ficha e sem folha), passa a gerar as 3 imagens-chave com o MESMO personagem, no lugar do pedido. Só imagens; nenhum vídeo.

**Como:** o banco de pedidos-prova (`dry_run: "stills"`, KINEO-BANCO-PROVA-2710) segue o caminho real do cliente até as imagens-chave (planner, still FLUX, crítico, folha do 15 s) e para antes do 1º clipe pago, com estorno.
- **Quem pode:** só uma conta da casa na lista `DRY_RUN_EMAILS` (lib/cinematic/classicDryRun.ts).
- **Custo por rodada:** ~US$ 0,6 a 0,9 (folha + still + regerações do crítico).
- **Quando:** depois de PUBLICAR o commit da regra.
- **Teto aprovado:** 2 rodadas, até US$ 2.

## Rodada 1 — o gato ninja (7f92fe17)
`POST https://usekineo.com/api/generate-video-cinematic`, logado na conta da casa, corpo JSON:
```json
{
 "generationId": "<um UUID novo>",
 "engine": "seedance",
 "duration": 15,
 "language": "ru",
 "script_mode": "ai",
 "prompt": "HOOK (0-2s): [Pexels: cat rooftop silhouette] Рыжий кот — ниндзя на крыше.\n\nMICRO REWARD 1: [Pexels: cat jumping rooftop] Он прыгает через крыши, как профи.\n\nMICRO REWARD 2: [Pexels: cat stealthy movement] Двигается так тихо и ловко.\n\nPAYOFF: [Pexels: cat epic leap] В стиле Пиксар, этот кот — супер ниндзя.",
 "original_idea": "рыжий кот ниндзя бежит по крышам как профисиналный супер ниндзя стиль пиксар",
 "dry_run": "stills",
 "banco_prova": { "caso": "protagonista-gato-ninja-1311", "espera": ["o mesmo gato ruivo nas 3 imagens", "o mesmo figurino nas 3", "telhado nas 3"], "seed": 1311 }
}
```
- **Imagens de HOJE (o filme do cliente, para o lado a lado):**
  - https://v3b.fal.media/files/b/0ab255d9/rldW-JOfy-ETgj0ivHoSb.jpg
  - https://v3b.fal.media/files/b/0ab255d9/UMU9QPxKYGap-nEos5N_R.jpg (beco)
  - https://v3b.fal.media/files/b/0ab255d9/n8EEjQIQ880cQcmL3oQpP.jpg (casaco vermelho, rua de terra)
- **Filme original:** https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/643fbc0f-fad0-4b40-8422-801f58bf983e/061a5c5d-584b-4060-a7a6-bbfc5d8757f7.mp4
- **O que deve acontecer:**
  - evento `cinematic_protagonist_mode` com `mudou: true` e `motivo: "sujeito:creature"`; o elenco semântico do gato em russo deu json_invalido no ensaio, então o sinal vem da leitura do sujeito;
  - `visual_mode` `character_story`;
  - `cinematic_character_sheet` com o elenco `the cat` (a ficha do sujeito vivo). Como o pedido é ideia de uma linha, a ficha leva o lugar ("a ninja cat jumping across rooftops"); o look é 3D, por "стиль пиксар".

## Rodada 2 — Gabriel (32c93ee3)
O mesmo endpoint e a mesma conta, corpo:
```json
{
 "generationId": "<um UUID novo>",
 "engine": "seedance",
 "duration": 15,
 "language": "pt",
 "script_mode": "ai",
 "prompt": "HOOK (0-2s): [Pexels: man walking in street] Esse é Gabriel.\n\nMICRO REWARD 1: [Pexels: man waking up] Gabriel acorda cedo e trabalha no supermercado até as dez da noite.\n\nMICRO REWARD 2: [Pexels: family dinner table] Ele mora com a família e quer dar uma vida melhor a eles.\n\nPAYOFF: [Pexels: man looking out window] Uma noite comum... está prestes a mudar a vida de Gabriel para sempre.",
 "dry_run": "stills",
 "banco_prova": { "caso": "protagonista-gabriel-1311", "espera": ["o mesmo Gabriel nas 3 imagens"], "seed": 1311 }
}
```
- **Imagens de HOJE:**
  - https://v3b.fal.media/files/b/0ab21a6f/Qi9lawQAA_hlJU7WMNXfD.jpg
  - https://v3b.fal.media/files/b/0ab21a6f/VtWSVbemMsC1U-fPuDZGH.jpg
  - https://v3b.fal.media/files/b/0ab21a6f/a_2NF0qm1p5at_cTBeHUN.jpg
- **O que deve acontecer:** `mudou: true`, `motivo: "elenco:human"` (o elenco semântico leu "Gabriel" no ensaio), `visual_mode` `character_story` e folha do Gabriel.

## A régua (escrita ANTES)
- **Aprovado se,** nas 3 imagens de cada rodada:
  - aparece o mesmo personagem (o mesmo gato ruivo com o mesmo figurino; o mesmo Gabriel);
  - o gato está em telhado.
- **Reprovado se:**
  - o personagem muda de uma imagem para outra;
  - o evento diz `mudou: false`;
  - nasce folha de outro personagem.

## Antes de disparar
- As 6 imagens de hoje responderam 200 em 13/11 noite.
- A semente fixa (`seed`) é para repetir a prova com a mesma sorte, se precisar.
