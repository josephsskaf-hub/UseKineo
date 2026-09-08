# Curadoria da vitrine — seleção por imagem do fundador

## Autorização e limites

**DECISÃO DO FUNDADOR — conversa 07/09/2026:** usar a seleção da imagem, preservar o robô; preferência anterior preserva Kling 3. Melhorar enquadramento e nitidez dos trechos, sem alterar masters, dados, pipeline ou preços. Worktree isolada `codex/founder-curation-sep07`, base `671ad249`. Trabalho de idiomas permanece separado e não está concluído por esta seleção.

**FATO CONFIRMADO:** `lib/engineWall.ts:77` monta a vitrine a partir de `PUBLIC_ENGINE_EXAMPLES`; `components/EngineCycleCard.tsx:50` alterna arquivos locais. Não é seleção automática dos últimos vídeos. `app/KineoLanding.tsx:255` usa card 16:10; previews antigos já foram recortados horizontalmente. Um recorte do preview não recupera o que foi removido do master.

## Correspondência da imagem

**EVIDÊNCIA DE PRODUÇÃO — SELECT em 07/09/2026:** registros completed da conta confirmada do fundador, cruzando títulos visíveis e quality_mode. Nenhuma linha de cliente, escrita no banco ou geração. URLs dos masters não reproduzidas neste documento.

| Posição na imagem | Assunto | ID | Motor registrado |
|---|---|---|---|
| 1.1 | Esferas / antena | ca6c04df-6c08-48cb-b1ce-a43b1b171869 | cinematic_ai / Seedance |
| 1.2 | Esferas / espaço | 9aacaf46-49d9-46fb-8b7e-ef7d01d77592 | fast / Kineo 1 |
| 1.3 | Passo Dyatlov | f3de57b0-3486-4400-ba72-c9390774d426 | cinematic_kling / Kling 2.5 |
| 1.4 | Mary Celeste | cbd676d0-340a-4728-8a5f-439fd9dd64c5 | cinematic_ai / Seedance |
| 1.5 | Ilha de Páscoa / pedra | a09706da-a79f-4029-b213-69f43d6a2775 | cinematic_ai / Seedance |
| 1.6 | Ilha de Páscoa / céu | 49d10f33-3877-42c1-82b8-c0b2cb881fc7 | fast / Kineo 1 |
| 2.1 | Noruega | 0ab3e871-2c99-4f6e-9f3c-59773208b12e | fast / Kineo 1 |
| 2.2 | Manuscrito Voynich | 7ffd064e-cb37-4a97-a207-70a202bc72b6 | cinematic_ai / Seedance |
| 2.3 | Avião chinês / apresentador | a66e975a-3f6c-4bf4-9510-cd15b895b58b | cinematic_omni / Omni Flash |
| 2.4 | Música misteriosa / apresentador | cc17475a-0707-4309-aa11-ac4b85918c78 | cinematic_omni / Omni Flash |
| 2.5–2.6 | Tunguska / dois apresentadores | 1b8e12f9-83e5-411c-8fda-0b277d289934 e 38158db0-f02e-4c6c-a4c8-3c65461413a9 | cinematic_omni / Omni Flash |

**QUESTÃO PENDENTE:** dois Tunguska com mesmo roteiro: associação exata de cada frame precisa de inspeção do master; ambos pertencem à seleção. Não inferir motor pela miniatura, nota ou selo HD.

**FATO CONFIRMADO:** robô atual `36a04f7b-65f7-42d9-a2ab-198b5a7f115e` está em `PUBLIC_ENGINE_EXAMPLES` como cinematic_omni. Preservar arquivo original do preview/poster.

## Aprovação da seleção e limite de escopo

**DECISÃO DO FUNDADOR — 07/09/2026:** após assistir à galeria, respondeu “gostei dos videos, aprovado”. Usar os 12 selecionados na home e preservar robô e Kling 3. Veo 3.1 e MiniMax H3 não têm substituto aprovado: permanecem intactos, sem atribuir vídeos de outros motores a eles. Galeria /examples e /arena não são redefinidas por esta entrega.

## Gate de enquadramento

**PLANO:** inspecionar início/meio/fim dos trechos no master de maior resolução disponível; escolher intervalo contínuo com rosto e ombros visíveis, sem amputar testa/queixo e sem fabricar detalhe por upscale. Cortes independentes para card horizontal e grade vertical quando necessário. Preservar os quatro cards, vídeos Kling 3 e robô até definição dos motores sem candidatos. Comparação real antes/depois, tamanhos desktop/mobile, ffprobe para duração/resolução e teste de existência dos assets antes de qualquer publicação. Não declarar preview pronto ou enquadramento aprovado por leitura do código.

## IMPLEMENTADO / TESTADO LOCALMENTE — 07/09/2026

- `lib/homeVideoCuration.ts`: allowlist da seleção aprovada, sem alterar o acervo legado. `lib/engineWall.ts` usa essa seleção na home e mantém todos os 12 acessíveis na fileira horizontal.
- Robô abre o card Omni, seguido pelos quatro apresentadores. A home mantém quatro cards principais, com cinco vídeos no ciclo Omni. Kling 3, Veo e H3 preservados.
- `ffprobe` dos 12 originais: todos 1080×1920. Intervalo 0,4–6,4s. Previews verticais 540×960, horizontais 960×540, 24fps, sem áudio; nenhum original sobrescrito. Fundo lateral desfocado, sujeito em foco, enquadramento superior que preserva cabeça/ombros. Não é geração ou restauração artificial de detalhes.
- Inspeção visual de contact sheets dos 12, com início/meio/fim. Comparação antes/depois em `docs/previews/CURADORIA-ANTES-DEPOIS.html`, incluindo largura desktop e card mobile. O “antes” é o exemplo anterior de cada motor; não é uma réplica completa da home.
- Teste que executa os seletores reais: 250 verificações com inspeção de mídia. TypeScript limpo. Regressões: vitrine legada 19, segurança 68, cinco melhorias 621, idiomas 2034. Nenhuma asserção antiga alterada; o teste novo diferencia explicitamente acervo histórico da curadoria ativa.
- **PENDENTE neste checkpoint:** CI remoto, preview HTTPS e validação de produção. Abrir arquivo local no Chrome foi bloqueado pela política do navegador; não contornar esse bloqueio. Validar o site de preview HTTPS, sem acesso do browser ao filesystem.

## REENQUADRAMENTO — 08/09/2026 ~00:30 BRT (ordem do fundador, executado pelo Claude)

**ORDEM:** "O motor está com um vídeo só rodando. Pega os melhores vídeos, os que eu dei nota nove e meio, e coloca bem enquadrado, no quatro. No menu do meio está cortado alguns vídeos, com aquele nas laterais."

**O que era:** o card Omni só ciclava o robô (`orderHeroVideos` filtrava os apresentadores para fora do hero) e os previews largos `-h.mp4` dos 12 aprovados eram o vídeo vertical inteiro com fundo lateral desfocado (960×540) — o "aquele nas laterais".

**O que ficou:** os 12 `-h.mp4`/`-h.webp` recortados de novo do master 1080×1920 como janela real 1080×605 (500:280) → 1400×782, 6s a partir de 0,4s, 24fps, sem áudio, crf 25 (Noruega crf 27 para caber no teto de 1,5 MB do guardião). Faixa (`top` em px do master) escolhida olhando início/meio/fim:

| vídeo | assunto | top |
|---|---|---:|
| 0ab3e871 | Noruega | 500 |
| 1b8e12f9 | Tunguska, homem de chapéu | 250 |
| 38158db0 | Tunguska, testemunha de gorro | 280 |
| 49d10f33 | Ilha de Páscoa, céu/mar | 693 |
| 7ffd064e | Voynich, livro | 657 |
| 9aacaf46 | céu noturno | 657 |
| a09706da | moai, muro | 657 |
| a66e975a | apresentador, avião chinês | 340 |
| ca6c04df | esferas / antenas | 700 |
| cbd676d0 | Mary Celeste, navio | 562 |
| cc17475a | apresentador de óculos | 400 |
| f3de57b0 | Urais | 466 |

Código: `lib/ui/heroFrame.ts` (Omni deixa de ser caso especial), `lib/ui/heroOpening.ts` (sem filtro; robô abre), `lib/engineWall.ts` (HERO_CAPS h3 3→4), `app/KineoLanding.tsx` (todo card `.slice(0, 4)`). Masters, `-v.mp4`, posters verticais, /examples e /arena intactos.
