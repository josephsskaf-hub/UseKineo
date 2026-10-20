# Folha de personagem — os 6 consertos (20/10/2026)

**Marca:** `KINEO-META95-PERSONAGEM-AJUSTE-2010` · **Trava:** `[TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]`
**Base:** origin/main `fbe47c46` (a folha `KINEO-META95-PERSONAGEM-2010` já mesclada) · **Branch:** `codex/meta95-personagem-ajuste-2010`

A folha de personagem foi testada em produção em 20/10 com 3 filmes reais (Dino, Ravan, menino da moto). Onde ela entrou, funcionou:
o Dino continuou dinossauro em todas as cenas e o menino do Ravan ficou o mesmo. Mas apareceram 6 defeitos, e eles precisam ser
consertados antes de ligar a folha para clientes.

**Como liga:** igual a antes. Só conta interna, com `formatFlags: ["personagem"]` no pedido. `PERSONAGEM_PUBLIC` continua `false`.
Com a folha desligada, a rota, o crítico e o vetor de prompts são byte a byte os de hoje (o guardião executa e prova).

## Os 6 defeitos — causa e conserto

| # | Defeito em 20/10 | Causa | Conserto |
|---|---|---|---|
| 1 | O still com folha saiu fora de 9:16 (faixa azul lisa embaixo do vídeo). Com 2 folhas, virou colagem de 2 painéis. | O `aspect_ratio` ia no corpo, mas o prompt não dizia o formato. Ninguém conferia o arquivo devolvido. Com 2 imagens de referência, o edit as põe lado a lado. | O prompt diz o formato do filme por extenso ("ONE vertical 9:16 portrait image, taller than wide… no bars, no borders, no flat-colour bands"). Com 2 folhas, ele diz "cada personagem uma vez, na mesma cena; nunca painéis, nada lado a lado, sem díptico, grade, split screen ou colagem". A largura × altura do still é lida do `width/height` da fal ou do cabeçalho do arquivo (PNG/JPEG/WebP/GIF, só os primeiros 64 KB). Fora do formato (tolerância de 2,5%) ou sem conferência, a cena fica com o still FLUX de hoje. |
| 2 | A moderação de saída barrou como "sexual/minors" uma cena inocente de desenho (dinossauro criança no quarto). | A categoria sexual/minors do omni-moderation é **só de texto** e barra a partir de 0,02. O termo de idade do prompt ("baby dinosaur child") basta para disparar. | Uma 2ª conferência, com o texto **sem os termos de idade** e a **mesma imagem**. Ela só acontece se tudo isto for verdade: todo personagem da cena é criatura ou animal; o bloqueio veio só de `sexual/minors` (sem `sexual`, sem `minor_term`); a nota sexual é < 0,01; o sinal de menor é < 0,5; o texto não tem termo sexual nem gente; todo termo de idade qualifica a criatura; e o texto neutro já não cita menor pela régua real (`mentionsMinor`). A 2ª conferência tem de passar inteira, imagem incluída. Gente nunca entra nesta exceção. O 1º bloqueio continua gravado (`content_moderation_blocked`). |
| 3 | O Ravan (o rei-demônio de 10 cabeças) virou "homem de 30 anos ruivo de moletom". | O elenco determinístico trata nome próprio sem espécie como humano e sorteia cabelo, rosto e roupa. | Tabela `FIGURAS_CONHECIDAS`: Ravana, Kumbhakarna, Hanuman, Ganesha, Zeus, Poseidon, Medusa, Anubis e Thor, cada um com a iconografia tradicional (origem `mitica`, que o casting não troca). Nome que a casa não conhece, em contexto mítico (demon/god/legend/effigy…), fica "como a lenda o mostra", com a espécie que o roteiro diz e sem cor, rosto ou roupa inventados. O casting recebe a regra da identidade cultural ("se não souber quem é, devolva o rascunho"), e a resposta com roupa moderna para figura mítica é recusada. |
| 4 | O menino da moto ficou sem folha. | O elenco era procurado só no visual escrito pelo GPT ("young man on motorcycle"), não na fala ("A boy… His bike…"). | `cenasDoElenco`: o **visual** diz se há alguém no quadro (pessoa, criatura, rosto, mãos, quem pilota); a **fala** diz **quem** (nome, papel "a boy/the girl", ou he/his/she/her continuando a fala anterior). Gênero do visual que contradiz não casa: a "young woman" não vira o rapaz. A cena que casou pela fala ganha a ficha no prompt (o mesmo texto do construtor de cena), no still e no clipe. |
| 5 | A refação do still reprovado por identidade foi tentada e não saiu (`regeracao_ok=false`). | O crítico nasceu medido no FLUX dev (3-6 s) e espera a foto nova por **9 s**, com teto de 20 s por cena e prazo de 35 s no filme. O edit com folha leva 15-40 s, então volta `provider_timeout`. A rota ainda jogava o motivo fora (devolvia só a URL). | O crítico aceita janelas por filme (`tetoCenaMs`, `janelaRegeracaoMs`, `minRegeracaoMs`). A folha usa 70 s de teto por cena, 45 s de janela, 20 s de folga mínima e 80 s de prazo no filme (o lote é paralelo). `gerarStill` pode devolver `{ url, motivo }`; com `relatarMotivo`, o evento `cinematic_still_critic` grava `regeracao_motivo` ('ok', 'provider_timeout', 'formato_errado', 'moderation_blocked', 'sem_url', 'lancou', 'sem_tempo:…'). O relato da folha lista cada refação com ok e motivo. Sem as opções, o crítico é byte a byte o de antes (provado em PASS, FAIL com foto nova, FAIL com falha e FAIL com exceção). |
| 6 | No `character_story`, a cena 1 do Dino (floresta, ninguém citado) ganhou um homem adulto. | O construtor de cena cola ", characters act naturally within the scene without addressing the viewer" em **toda** cena da história, inclusive na que não tem personagem, e nada proíbe gente nela. | A cena sem personagem e sem ninguém no visual perde essa cláusula e ganha "No people, no human figures and no faces anywhere in this shot." Isso vale antes do still FLUX e do clipe, no mesmo vetor `classicScenePrompts`. A cena sem o personagem mas com gente própria no visual (uma multidão) fica intocada. |

## Onde mora

- `lib/cinematic/personagemAjuste.ts` (novo, puro): elenco com figuras conhecidas, casting do ajuste, `cenasDoElenco`,
  `ajustarPromptsDoElenco`, prompt do still com formato, leitor de dimensões, régua da reconferência, `stillComFolha` (com a rede
  injetada), as janelas da refação, o relato e o ensaio.
- `lib/cinematic/personagemAjusteServer.ts` (novo): a rede. Faz um POST por still ao `fal-ai/nano-banana-pro/edit`, só leitura
  depois, lê os 64 KB do cabeçalho e chama a moderação de saída (`estrela`/`output`). A Estrela (`lib/estrelaServer`) não muda.
- `lib/cinematic/criticoStill.ts`: as opções por filme e o motivo da refação. Sem elas, nada muda.
- `app/api/generate-video-cinematic/route.ts`: o casting do ajuste e o ajuste do vetor de prompts (depois do monumento, antes do
  dry-run, do FLUX e do clipe). No bloco da folha: as cenas pela fala, o still com formato e moderação, as janelas da refação e o
  relato. O ensaio de $0 mostra as cenas pela fala, as cenas sem gente e as figuras míticas.

## Como provar (offline, $0)

```
node scripts/test-meta95-personagem-ajuste-2010.mjs   # os 6 consertos executados, o bloco real, desfaz, commits, mutantes
node scripts/test-meta95-personagem-2010.mjs          # a folha de 20/10 como nasceu (reancorado: lê rota/crítico sem o ajuste)
```

Os casos estão reproduzidos à mão no guardião:
- **Dino:** um dinossauro ouve um barulho na floresta à noite e acha vagalumes.
- **Ravan:** um menino conversa com o rei-demônio Ravan.
- **Menino da moto:** "A boy… His bike…".

O edit falso tem a latência real (~15 s). No bloco de 20/10 (desfeito), a refação sai `regeracao_ok=false` com janela de 9 s. No
bloco de hoje, ela sai `ok`.

## Para o 1º filme de validação (conta interna)

- O ensaio (`dry_run`) com `formatFlags: ["personagem"]` mostra `personagem.cenas[].pela_fala`, `cenas_sem_gente` e `miticas`.
- Depois do render, o evento `cinematic_character_sheet` traz:
  - `motivos_still` (quantos ok, formato_errado, moderation_blocked…);
  - `moderacao_reconferida`;
  - `regeracoes[{cena, ok, motivo}]`.
- Custo: igual ao da folha. A reconferência é a moderação gratuita. A refação agora sai de verdade, então o pior caso de 15 s fica
  perto de US$ 0,90 (como já estimado).
