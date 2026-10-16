# Trilha do clipe: antes × depois nos 5 roteiros reais (16/10/2026)

Gerado por `node scripts/test-trilha-15s-1610.mjs --doc=…` (KINEO-TRILHA-15S, [TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"]). Offline, sem rede e sem custo: os roteiros são os do claim (`cinematic_submission_claim`, só leitura), o filme é montado pelas libs reais da rota (`parseUserScript` + `seedanceShortMarkedScenes`, que reproduzem os `clip_word_starts` do claim) e o plano de b-roll pelo divisor real do Studio (`splitScriptToScenes`). O bloco L2B + #441 é executado duas vezes: o da rota ANTIGA (conserto desfeito em memória) e o da NOVA.

**Como ler.** *Prompt antigo* = o que a produção mandou ao motor (núcleo de `scene_prompts[i]` do claim) e de qual bloco do plano ele veio. *Prompt novo* = o plano é ignorado (4 blocos no plano, 3 clipes no filme) e o descritor #441 escreve a imagem a partir da **fala do próprio clipe** + a pista `[Pexels]` dele; a coluna mostra essa entrada e o **piso determinístico** (o que sai mesmo se o GPT falhar: `completeSceneDescriptions`, já passado pelo `buildClassicVisualPrompt` novo, sem a cauda fixa). Em produção o GPT escreve a prosa a partir da mesma fala; o piso prova que o assunto já é o certo antes dele.

## 657b6ea3 — "What if Earth suddenly stopped spinning?"

| Clipe | Fala que toca | Prompt antigo (bloco do plano) | Prompt novo (fala real → descritor; piso) |
|---|---|---|---|
| 1 | What if Earth suddenly stopped spinning? At the equator, Earth's surface moves at 1,670 kilometers per hour. | A close-up shot of the Earth from space, showing the equator and rotating rapidly, then suddenly stopping, emphasizing the equator line clearly. — **bloco 1 do plano** (fala do bloco: "What if Earth suddenly stopped spinning?") | descritor recebe a fala do clipe + pista "planet Earth rotating space, equator aerial view"; piso: planet Earth rotating space, equator aerial view |
| 2 | If Earth stopped instantly, the atmosphere and oceans would keep moving. | A drone shot capturing the curvature of the Earth at the equator, zooming in to highlight the dynamic movement of clouds and land, emphasizing the high speed of 1,670 kilometers per hour. — **bloco 2 do plano** (fala do bloco: "At the equator, Earth's surface moves at 1,670 kilometers per hour.") | descritor recebe a fala do clipe + pista "ocean waves crashing"; piso: ocean waves crashing |
| 3 | The consequences would be catastrophic... as Earth pulls away into deep space. | A tracking shot along a rugged coastline where powerful ocean waves crash violently against rocks, symbolizing the relentless movement of the atmosphere and oceans if the Earth were to stop spinning. — **bloco 3 do plano** (fala do bloco: "If Earth stopped instantly, the atmosphere and oceans would keep moving.") | descritor recebe a fala do clipe + pista "deep space Earth zoom out"; piso: deep space Earth zoom out |

PAYOFF (bloco 4: "The consequences would be catastrophic... as Earth pulls away into deep space."): antes, o prompt dele **nunca** chegou ao motor; agora o clipe 3 é escrito por essa fala.

## 91a25fbb — "Você conhece Exu Marabô?"

| Clipe | Fala que toca | Prompt antigo (bloco do plano) | Prompt novo (fala real → descritor; piso) |
|---|---|---|---|
| 1 | Você conhece Exu Marabô? Imagine uma noite escura, uma estrada vazia e um homem perdido. | A dark, empty road at night with a silhouette of a lost standing alone, surrounded by shadows, evoking a sense of isolation. — **bloco 1 do plano** (fala do bloco: "Você conhece Exu Marabô?") | descritor recebe a fala do clipe + pista "dark night road, empty road at night"; piso: dark night road, empty road at night |
| 2 | Diante de uma encruzilhada, ele percebeu: mudar de vida exige coragem. | A drone shot capturing a desolate road under the night sky, illuminated only by the moonlight, with shadows stretching across the asphalt, evoking a sense of isolation and contemplation. — **bloco 2 do plano** (fala do bloco: "Imagine uma noite escura, uma estrada vazia e um homem perdido.") | descritor recebe a fala do clipe + pista "man thinking crossroads"; piso: man seen in silhouette from behind thinking crossroads |
| 3 | Na Umbanda, Exu Marabô é reverenciado... mas antes de pedir mudanças, olhe suas atitudes. | A tracking shot of a lone standing at a crossroads, with signs pointing in different directions, as he contemplates his next move, highlighting the weight of his decision. — **bloco 3 do plano** (fala do bloco: "Diante de uma encruzilhada, ele percebeu: mudar de vida exige coragem.") | descritor recebe a fala do clipe + pista "umbanda altar candles"; piso: umbanda altar candles |

PAYOFF (bloco 4: "Na Umbanda, Exu Marabô é reverenciado... mas antes de pedir mudanças, olhe suas atitudes."): antes, o prompt dele **nunca** chegou ao motor; agora o clipe 3 é escrito por essa fala.

## 60518b82 — "What if humans were ten times bigger?"

| Clipe | Fala que toca | Prompt antigo (bloco do plano) | Prompt novo (fala real → descritor; piso) |
|---|---|---|---|
| 1 | What if humans were ten times bigger? | A close-up shot of an enormous human hand gripping a regular-sized pen, highlighting the immense scale difference between the giant hand and the small object. The background is blurred to focus on the sheer size and power of the hand, creating an energetic visual punch. — **bloco 1 do plano** (fala do bloco: "What if humans were ten times bigger?") | descritor recebe a fala do clipe + pista "giant human silhouette"; piso: giant human silhouette |
| 2 | You'd weigh about a thousand times more! Your bones would struggle to support your enormous body. | Aerial drone footage of an oversized weight scale in a laboratory, with exaggerated weights on one side tipping the scale dramatically. This visual reinforces the idea of increased weight and its implications as the camera moves around the scale. — **bloco 2 do plano** (fala do bloco: "You'd weigh about a thousand times more!") | descritor recebe a fala do clipe + pista "giant footprints in mud, x-ray of human bones"; piso: giant footprints in mud, x-ray of human bones |
| 3 | But here's the problem... your heart couldn't pump blood efficiently. Becoming giants... needs major changes to how our bodies work! | A tracking shot of a model skeleton with exaggeratedly large bones, focusing on the joints and structure as if they are under stress. The camera moves along the skeleton, emphasizing the tension in the bones and the implications of size. — **bloco 3 do plano** (fala do bloco: "Your bones would struggle to support your enormous body.") | descritor recebe a fala do clipe + pista "heart monitor screen closeup"; piso: heart monitor screen closeup |

PAYOFF (bloco 4: "But here's the problem... your heart couldn't pump blood efficiently. Becoming giants... needs major changes to how our bodies work!"): antes, o prompt dele **nunca** chegou ao motor; agora o clipe 3 é escrito por essa fala.

## 01ca7fce — "What if a star's death is just the universe's beginning?"

| Clipe | Fala que toca | Prompt antigo (bloco do plano) | Prompt novo (fala real → descritor; piso) |
|---|---|---|---|
| 1 | What if a star's death is just... the universe's beginning? | A close-up shot of a brilliant supernova explosion, with vivid colors and intense light radiating outward, symbolizing the end of a star's life and the potential for new beginnings in the universe. — **bloco 1 do plano** (fala do bloco: "What if a star's death is just... the universe's beginning?") | descritor recebe a fala do clipe + pista "exploding star in space"; piso: exploding star in space |
| 2 | A supernova can birth neutron stars or black holes. These explosions outshine entire galaxies for weeks. | A close-up of a supernova explosion, with bright colors and intense light, illustrating the birth of neutron stars or black holes amidst cosmic dust and debris. No other characters, no animals, no , no added props. — **bloco 2 do plano** (fala do bloco: "A supernova can birth neutron stars or black holes.") | descritor recebe a fala do clipe + pista "supernova explosion, galaxy night sky"; piso: supernova explosion, galaxy night sky |
| 3 | Elements in your body... were forged in stellar deaths. Every star's end contributes to creation! | A dynamic tracking shot that captures the brilliance of a supernova outshining nearby galaxies, with a focus on the explosive energy and light radiating into the cosmos. — **bloco 3 do plano** (fala do bloco: "These explosions outshine entire galaxies for weeks.") | descritor recebe a fala do clipe + pista "human silhouette stargazing"; piso: human silhouette stargazing |

PAYOFF (bloco 4: "Elements in your body... were forged in stellar deaths. Every star's end contributes to creation!"): antes, o prompt dele **nunca** chegou ao motor; agora o clipe 3 é escrito por essa fala.

## 748e13a2 — "Midnight in a forgotten mansion"

| Clipe | Fala que toca | Prompt antigo (bloco do plano) | Prompt novo (fala real → descritor; piso) |
|---|---|---|---|
| 1 | Midnight in a forgotten mansion... deep within a dark forest. | A close-up view of a dusty chandelier hanging in a dimly lit room of a forgotten mansion. The light flickers occasionally, casting eerie shadows on the peeling wallpaper and cobwebs in the corners, enhancing the atmosphere of abandonment and mystery. — **bloco 1 do plano** (fala do bloco: "Midnight in a forgotten mansion... deep within a dark forest.") | descritor recebe a fala do clipe + pista "abandoned mansion forest night"; piso: abandoned mansion forest night |
| 2 | Thick fog snakes through ancient trees, wrapping them in mystery. Lightning flickers, revealing shattered windows—glimpses of past secrets. | Aerial drone footage showcasing a thick fog slowly weaving through a dense forest filled with towering ancient trees. The view reveals the treetops disappearing into the mist, creating an atmosphere of enigma and suspense as the fog wraps around the trunks. — **bloco 2 do plano** (fala do bloco: "Thick fog snakes through ancient trees, wrapping them in mystery.") | descritor recebe a fala do clipe + pista "thick fog among trees, lightning broken windows"; piso: thick fog among trees, lightning broken windows |
| 3 | Dead leaves swirl, guiding us to the entrance... where true horror awaits. | A tracking shot that follows the path of a lightning bolt as it strikes, illuminating the dark facade of the mansion. The camera reveals shattered windows that reflect the fleeting light, hinting at the secrets and tragedies that once unfolded within. — **bloco 3 do plano** (fala do bloco: "Lightning flickers, revealing shattered windows—glimpses of past secrets.") | descritor recebe a fala do clipe + pista "cinematic camera front entrance"; piso: cinematic camera front entrance |

PAYOFF (bloco 4: "Dead leaves swirl, guiding us to the entrance... where true horror awaits."): antes, o prompt dele **nunca** chegou ao motor; agora o clipe 3 é escrito por essa fala.

## Protagonista no modo sem rosto (91a25fbb, cena 1)

| | Prompt (sem a cauda fixa) |
|---|---|
| Supervisor escreveu | A dark, empty road at night with a silhouette of a lost man standing alone, surrounded by shadows, evoking a sense of isolation. |
| Antigo (apagava) | A dark, empty road at night with a silhouette of a lost standing alone, surrounded by shadows, evoking a sense of isolation. |
| Novo (sem rosto, frase inteira) | A dark, empty road at night with a silhouette of a lost man seen from behind standing alone, surrounded by shadows, evoking a sense of isolation. |

## Resultado

- 122 verificações do guardião verdes, 0 vermelhas (sem contar byte a byte e mutantes).
- Nos 5 roteiros, o antigo reproduz a troca (clipe i = bloco i do plano; o prompt do PAYOFF nunca é usado; descritor desligado). O novo ignora o plano, liga o descritor e o clipe 3 fala e mostra o PAYOFF.

<!-- KINEO-TRILHA-15S: fora do gerador (o --doc preserva daqui para baixo) -->
## Placar de coerência antes do conserto (régua do fundador 16/10: 95+ = "praticamente perfeito")

SQL só leitura, 16/10/2026: `events.name = 'fast_coherence'`, última nota de cada filme (`distinct on (session_id)`, 1 sessão = 1 filme: 501 sessões, 501 vídeos), últimos 30 dias, todas as contas. Duração cruzada com o `cinematic_submission_claim` do mesmo `generation_id`.

| Motor (`metadata.engine`) | Filmes | Nota 95+ | % 95+ | Média | Mediana |
|---|---|---|---|---|---|
| **Seedance 1.5** (`cinematic_ai`) | **220** | **34** | **15,5%** | 78,8 | 80 |
| — Seedance 1.5 de 15 s | 115 | 24 | 20,9% | | |
| — Seedance 1.5 de 35/60/90 s | 105 | 10 | 9,5% | | |
| Kineo 1 (`fast`) | 251 | 47 | 18,7% | 71,6 | 75 |
| Veo 3.1 (`cinematic_veo`) | 9 | 2 | 22,2% | 84,2 | 90 |
| Kling 2.5 (`cinematic_kling`) | 7 | 0 | 0% | 70,0 | 75 |
| Kling 3 (`cinematic_hollywood`) | 5 | 0 | 0% | 75,0 | 75 |
| Seedance 2.5 (`cinematic_s25`) | 4 | 2 | 50% | 90,0 | 92,5 |
| MiniMax H3 (`cinematic_h3`) | 4 | 1 | 25% | 82,5 | 80 |
| Omni (`cinematic_omni`) | 1 | 0 | 0% | 73,0 | 73 |

**A nota dos filmes do diagnóstico (aviso honesto).** Os 8 filmes de 15 s com a troca de cena tiveram 95, 80, 90, 95, 90, 95, 80, 80 (657b6ea3 = 95, 384fc3f3 = 95, 01ca7fce = 95; 3 de 8 com 95+, média 88). Os 4 em que o plano não chegou e o descritor escreveu pela fala (2eac4d22, 97dcd3c4, 0e9899a6, a278acc5) tiveram 80, 100, 80, 80 (1 de 4, média 85). Ou seja: **o juiz `fast_coherence` quase não enxerga a troca** (deu 95 à Terra, cujo clipe 3 mostra ondas enquanto a voz fala de espaço profundo). O conserto devolve a imagem do PAYOFF, mas não se deve esperar que a fatia 95+ do Seedance suba na mesma proporção; a prova do conserto é o ensaio acima (prompt × fala), não essa nota.

| Render de comparação (roteiro 657b6ea3, Seedance 15 s, ~US$ 0,80) | Nota `fast_coherence` | Chega a 95? |
|---|---|---|
| Filme do cliente (antes) | 95 | sim (mesmo com o clipe 3 trocado) |
| Render depois do conserto | pendente: não rodado (sem render pago nesta sessão; depende do "vai" e da publicação) | — |
