# Ficha e planos antes e depois da correção de época

**TESTADO LOCALMENTE · 24/11/2026.** A coluna Antes usa `c4fd957e65c2c9ec309d3acb562e35febb218c36` e a coluna Depois usa `da221631e5571db63c77b159fe14f1a605220df4` com a chave interna ativa. Os textos em inglês são os bytes de texto capturados na chamada simulada ao produtor de vídeo com referência única (`kling/v4/reference-to-video`). A ficha é o prompt que a rota passa ao produtor de imagem do personagem. Todos os corpos foram confrontados com os hashes dos recibos anteriores.

Os roteiros históricos são os da casa. O casting e a referência são entradas de ensaio. A foto é representada por [REFERÊNCIA 1]. Os pedidos foram observados antes de responder localmente ao transporte. Esta prova não avalia imagens renderizadas.

## Três histórias com época

### Dan Cooper

| Material | Antes | Depois |
| --- | --- | --- |
| Ficha | Character reference sheet, exactly one character, nobody else: a man in a dark suit and black tie. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage | Period setting: 1971, period lapel width, wool tailoring and shirt collar. Character reference sheet, exactly one character, nobody else: a man in a dark suit and black tie. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage |
| Plano 1 · 5 s | Identity: Dan Cooper, a man in a dark suit and black tie. Wide shot. man in dark suit and black tie boarding a passenger jet in 1971 Keep the same character from @Image1. | Wide shot. Period setting: 1971, period lapel width, wool tailoring and shirt collar, period airframe and cabin fittings. Identity: Dan Cooper, a man in a dark suit and black tie. man in dark suit and black tie boarding a passenger jet in 1971 Keep the same character from @Image1. |
| Plano 2 · 4 s | Medium shot. man in dark suit and black tie sitting in an airplane seat with a briefcase Keep the same character from @Image1. | Medium shot. Period setting: 1971, period lapel width, wool tailoring and shirt collar. man in dark suit and black tie sitting in an airplane seat with a briefcase Keep the same character from @Image1. |
| Plano 3 · 3 s | Wide shot. man in dark suit wearing a parachute at the open rear door of a jet at night Keep the same character from @Image1. | Wide shot. Period setting: 1971, period lapel width, wool tailoring and shirt collar. man in dark suit wearing a parachute at the open rear door of a jet at night Keep the same character from @Image1. |
| Plano 4 · 3 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. old dollar bills half buried in wet river sand | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. Period setting: 1971, period materials and finishes on the objects shown. old dollar bills half buried in wet river sand |

<details><summary>Corpos completos e sanitizados do vídeo</summary>

**Antes**

```json
{
  "image_urls": [
    "[REFERÊNCIA 1]"
  ],
  "multi_prompt": [
    {
      "prompt": "Identity: Dan Cooper, a man in a dark suit and black tie. Wide shot. man in dark suit and black tie boarding a passenger jet in 1971 Keep the same character from @Image1.",
      "duration": 5
    },
    {
      "prompt": "Medium shot. man in dark suit and black tie sitting in an airplane seat with a briefcase Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Wide shot. man in dark suit wearing a parachute at the open rear door of a jet at night Keep the same character from @Image1.",
      "duration": 3
    },
    {
      "prompt": "Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. old dollar bills half buried in wet river sand",
      "duration": 3
    }
  ],
  "duration": 15,
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

**Depois**

```json
{
  "image_urls": [
    "[REFERÊNCIA 1]"
  ],
  "multi_prompt": [
    {
      "prompt": "Wide shot. Period setting: 1971, period lapel width, wool tailoring and shirt collar, period airframe and cabin fittings. Identity: Dan Cooper, a man in a dark suit and black tie. man in dark suit and black tie boarding a passenger jet in 1971 Keep the same character from @Image1.",
      "duration": 5
    },
    {
      "prompt": "Medium shot. Period setting: 1971, period lapel width, wool tailoring and shirt collar. man in dark suit and black tie sitting in an airplane seat with a briefcase Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Wide shot. Period setting: 1971, period lapel width, wool tailoring and shirt collar. man in dark suit wearing a parachute at the open rear door of a jet at night Keep the same character from @Image1.",
      "duration": 3
    },
    {
      "prompt": "Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. Period setting: 1971, period materials and finishes on the objects shown. old dollar bills half buried in wet river sand",
      "duration": 3
    }
  ],
  "duration": 15,
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

</details>

### Louis Le Prince

| Material | Antes | Depois |
| --- | --- | --- |
| Ficha | Character reference sheet, exactly one character, nobody else: a bearded inventor wearing a dark coat. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage | Period setting: 1888, period cut, seams and fabric. Character reference sheet, exactly one character, nobody else: a bearded inventor wearing a dark coat. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage |
| Plano 1 · 4 s | Wide shot. Identity: Louis Le Prince, a bearded inventor wearing a dark coat. bearded man in 1880s suit operating a wooden box camera in a garden Keep the same character from @Image1. | Period setting: 1888, period cut, seams and fabric. Wide shot. Identity: Louis Le Prince, a bearded inventor wearing a dark coat. bearded man in 1880s suit operating a wooden box camera in a garden Keep the same character from @Image1. |
| Plano 2 · 4 s | Medium shot. bearded man in a long 1890 coat boarding a steam train Keep the same character from @Image1. | Medium shot. Period setting: 1890, period cut, seams and fabric, period railway fittings. bearded man in a long 1890 coat boarding a steam train Keep the same character from @Image1. |
| Plano 3 · 3 s | Wide shot. empty vintage train compartment | Wide shot. Period setting: 1890, authentic period materials for the described setting. empty vintage train compartment |
| Plano 4 · 4 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. bearded man in a long 1890 coat walking into steam on a station platform Keep the same character from @Image1. | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. Period setting: 1890, period cut, seams and fabric, period railway fittings. bearded man in a long 1890 coat walking into steam on a station platform Keep the same character from @Image1. |

<details><summary>Corpos completos e sanitizados do vídeo</summary>

**Antes**

```json
{
  "image_urls": [
    "[REFERÊNCIA 1]"
  ],
  "multi_prompt": [
    {
      "prompt": "Wide shot. Identity: Louis Le Prince, a bearded inventor wearing a dark coat. bearded man in 1880s suit operating a wooden box camera in a garden Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Medium shot. bearded man in a long 1890 coat boarding a steam train Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Wide shot. empty vintage train compartment",
      "duration": 3
    },
    {
      "prompt": "Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. bearded man in a long 1890 coat walking into steam on a station platform Keep the same character from @Image1.",
      "duration": 4
    }
  ],
  "duration": 15,
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

**Depois**

```json
{
  "image_urls": [
    "[REFERÊNCIA 1]"
  ],
  "multi_prompt": [
    {
      "prompt": "Period setting: 1888, period cut, seams and fabric. Wide shot. Identity: Louis Le Prince, a bearded inventor wearing a dark coat. bearded man in 1880s suit operating a wooden box camera in a garden Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Medium shot. Period setting: 1890, period cut, seams and fabric, period railway fittings. bearded man in a long 1890 coat boarding a steam train Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Wide shot. Period setting: 1890, authentic period materials for the described setting. empty vintage train compartment",
      "duration": 3
    },
    {
      "prompt": "Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. Period setting: 1890, period cut, seams and fabric, period railway fittings. bearded man in a long 1890 coat walking into steam on a station platform Keep the same character from @Image1.",
      "duration": 4
    }
  ],
  "duration": 15,
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

</details>

### Joshua Slocum

| Material | Antes | Depois |
| --- | --- | --- |
| Ficha | Character reference sheet, exactly one character, nobody else: an old bearded sailor at sea. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage | Period setting: before 1909, period cut, seams and fabric. Character reference sheet, exactly one character, nobody else: an old bearded sailor at sea. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage |
| Plano 1 · 5 s | Identity: Joshua Slocum, an old bearded sailor at sea. Wide shot. old bearded sailor at the helm of a small wooden sailboat Keep the same character from @Image1. | Period setting: before 1909, period maritime construction. Wide shot. Identity: Joshua Slocum, an old bearded sailor at sea. old bearded sailor at the helm of a small wooden sailboat Keep the same character from @Image1. |
| Plano 2 · 4 s | Medium shot. old bearded sailor on a small wooden sailboat in a storm Keep the same character from @Image1. | Period setting: before 1909, period maritime construction. Medium shot. old bearded sailor on a small wooden sailboat in a storm Keep the same character from @Image1. |
| Plano 3 · 3 s | Wide shot. old bearded sailor raising the sail and leaving a harbor in autumn Keep the same character from @Image1. | Period setting: 1909, period maritime construction. Wide shot. old bearded sailor raising the sail and leaving a harbor in autumn Keep the same character from @Image1. |
| Plano 4 · 3 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. empty gray ocean horizon at dusk | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. Period setting: 1909, authentic period materials for the described setting. empty gray ocean horizon at dusk |

<details><summary>Corpos completos e sanitizados do vídeo</summary>

**Antes**

```json
{
  "image_urls": [
    "[REFERÊNCIA 1]"
  ],
  "multi_prompt": [
    {
      "prompt": "Identity: Joshua Slocum, an old bearded sailor at sea. Wide shot. old bearded sailor at the helm of a small wooden sailboat Keep the same character from @Image1.",
      "duration": 5
    },
    {
      "prompt": "Medium shot. old bearded sailor on a small wooden sailboat in a storm Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Wide shot. old bearded sailor raising the sail and leaving a harbor in autumn Keep the same character from @Image1.",
      "duration": 3
    },
    {
      "prompt": "Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. empty gray ocean horizon at dusk",
      "duration": 3
    }
  ],
  "duration": 15,
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

**Depois**

```json
{
  "image_urls": [
    "[REFERÊNCIA 1]"
  ],
  "multi_prompt": [
    {
      "prompt": "Period setting: before 1909, period maritime construction. Wide shot. Identity: Joshua Slocum, an old bearded sailor at sea. old bearded sailor at the helm of a small wooden sailboat Keep the same character from @Image1.",
      "duration": 5
    },
    {
      "prompt": "Period setting: before 1909, period maritime construction. Medium shot. old bearded sailor on a small wooden sailboat in a storm Keep the same character from @Image1.",
      "duration": 4
    },
    {
      "prompt": "Period setting: 1909, period maritime construction. Wide shot. old bearded sailor raising the sail and leaving a harbor in autumn Keep the same character from @Image1.",
      "duration": 3
    },
    {
      "prompt": "Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. Period setting: 1909, authentic period materials for the described setting. empty gray ocean horizon at dusk",
      "duration": 3
    }
  ],
  "duration": 15,
  "resolution": "720p",
  "aspect_ratio": "9:16"
}
```

</details>

## Cinco controles sem época

Cada texto é exibido uma vez. Para cada um destes controles, a ficha e os três pedidos de vídeo da candidata coincidiram com os respectivos da base em casa/internal, casa/OFF e externo/internal. Cada tipo de vídeo mantém seu próprio envelope. Os planos apresentados são os do pedido de referência única.

### Ember

**Ficha**

Character reference sheet, exactly one character, nobody else: a small green dragon with orange wings. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage

| Plano | Texto antes e depois |
| --- | --- |
| 1 · 4 s | Identity: Ember, a small green dragon with orange wings. Wide shot. a small green dragon with orange wings sitting on a snowy mountain ledge Keep the same character from @Image1. |
| 2 · 4 s | Medium shot. a small green dragon with orange wings trying to blow fire, only a puff of smoke comes out Keep the same character from @Image1. |
| 3 · 3 s | Wide shot. a snowy mountain village at night with dark frozen houses, nobody in sight |
| 4 · 4 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. a small green dragon with orange wings breathing a warm stream of fire over a stone hearth, golden light on the snow Keep the same character from @Image1. |

Envelope comum a Antes e Depois para este controle: `{"image_urls":["[REFERÊNCIA 1]"],"duration":15,"resolution":"720p","aspect_ratio":"9:16"}`.

### Bolt

**Ficha**

Character reference sheet, exactly one character, nobody else: a small round orange robot with big blue eyes. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage

| Plano | Texto antes e depois |
| --- | --- |
| 1 · 4 s | Identity: Bolt, a small round orange robot with big blue eyes. 3D animated cartoon, a small round orange robot with big blue eyes rolling through a gray junkyard Keep the same character from @Image1. |
| 2 · 4 s | Medium shot. 3D animated cartoon, the small round orange robot holding a tiny glowing seed in its metal hands Keep the same character from @Image1. |
| 3 · 4 s | Wide shot. 3D animated cartoon, the small round orange robot watering a little green sprout between rusty cars Keep the same character from @Image1. |
| 4 · 3 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. 3D animated cartoon, a bright yellow flower blooming in the junkyard, the small round orange robot smiling beside it Keep the same character from @Image1. |

Envelope comum a Antes e Depois para este controle: `{"image_urls":["[REFERÊNCIA 1]"],"duration":15,"resolution":"720p","aspect_ratio":"9:16"}`.

### Juno

**Ficha**

Character reference sheet, exactly one character, nobody else: a golden retriever with a red bandana. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage

| Plano | Texto antes e depois |
| --- | --- |
| 1 · 4 s | Identity: Juno, a golden retriever with a red bandana. Wide shot. golden retriever with a red bandana walking alone on a seaside path toward a lighthouse at sunset Keep the same character from @Image1. |
| 2 · 4 s | Medium shot. golden retriever with a red bandana sitting on dark rocks watching the sea Keep the same character from @Image1. |
| 3 · 4 s | Wide shot. golden retriever with a red bandana barking at the dark sea in thick fog Keep the same character from @Image1. |
| 4 · 3 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. small fishing boats arriving at a harbor at sunrise, golden retriever with a red bandana wagging its tail on the dock Keep the same character from @Image1. |

Envelope comum a Antes e Depois para este controle: `{"image_urls":["[REFERÊNCIA 1]"],"duration":15,"resolution":"720p","aspect_ratio":"9:16"}`.

### Quantia em euros

**Ficha**

Character reference sheet, exactly one character, nobody else: a chef in a white apron. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage

| Plano | Texto antes e depois |
| --- | --- |
| 1 · 4 s | Identity: Mara, a chef in a white apron. Wide shot. a chef carrying a tin Keep the same character from @Image1. |
| 2 · 4 s | Medium shot. market table with a price tag |
| 3 · 4 s | Wide shot. chef counting coins |
| 4 · 3 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. the tin on an empty shelf |

Envelope comum a Antes e Depois para este controle: `{"image_urls":["[REFERÊNCIA 1]"],"duration":15,"resolution":"720p","aspect_ratio":"9:16"}`.

### Código de modelo

**Ficha**

Character reference sheet, exactly one character, nobody else: a mechanic in a red jacket. Full body visible from head to feet, standing, facing the camera, neutral relaxed pose, centered, plain light grey studio background, soft even lighting, photorealistic cinematic, sharp focus, no text, no letters, no watermark, no logo, one single frame, no split screen, no collage

| Plano | Texto antes e depois |
| --- | --- |
| 1 · 4 s | Identity: Ari, a mechanic in a red jacket. Wide shot. a mechanic carrying a lamp Keep the same character from @Image1. |
| 2 · 4 s | Medium shot. a box labelled model 1971 |
| 3 · 3 s | Wide shot. a mechanic testing a lamp |
| 4 · 4 s | Medium shot. Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen. the empty workbench |

Envelope comum a Antes e Depois para este controle: `{"image_urls":["[REFERÊNCIA 1]"],"duration":15,"resolution":"720p","aspect_ratio":"9:16"}`.

## Reproduzir

A partir da pasta deste kit, com os commits e TypeScript disponíveis localmente:

```powershell
node ./apresentar.mjs C:/kineo ./PLANOS-ANTES-DEPOIS.md
```

Sem o segundo argumento, o script imprime o texto e preserva os arquivos.
