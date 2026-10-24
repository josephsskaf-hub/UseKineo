# KINEO-APRESENTADORES-2410 — preparação e aprovação local

Data: 24/10/2026. **IMPLEMENTADO / FATO CONFIRMADO:** a ferramenta abaixo prepara o lote e registra uma decisão por pessoa no arquivo local `lib/ads/presenterCandidates2410.json`; não escreve em banco nem altera o catálogo publicado (`scripts/lib/apresentadores-admin2410.mjs:34`, `scripts/lib/apresentadores-admin2410.mjs:115`).

**FATO CONFIRMADO:** o modo padrão é somente leitura. `--plan` grava os pedidos; `--serve` serve a aprovação; nenhuma dessas opções faz geração paga (`scripts/apresentadores-2410.mjs:41`).

```powershell
node scripts/apresentadores-2410.mjs
node scripts/apresentadores-2410.mjs --plan
node scripts/apresentadores-2410.mjs --serve
```

**FATO CONFIRMADO:** `--serve` imprime uma URL `http://127.0.0.1:<porta aleatória>`. A página exige nome exato `Joseph Skaf`, confirmação pessoal, cinco verificações e arquivos reais de corpo, rosto e voz antes de aprovar. Recusar e desfazer também exigem o fundador (`scripts/lib/apresentadores-admin2410.mjs:115`, `scripts/lib/apresentadores-admin2410.mjs:291`).

**FATO CONFIRMADO:** esta é uma ferramenta operacional local. A declaração do nome é uma confirmação pessoal na máquina, não autenticação online. O servidor não deve ser exposto por túnel, proxy ou rede; ele confere IP loopback, Host, Origin e token CSRF. Encerre com `Ctrl+C` (`scripts/lib/apresentadores-admin2410.mjs:291`).

## Geração futura — exige nova autorização de gasto

**FATO CONFIRMADO:** a opção de geração só funciona com `--generate --allow-paid` e escolha explícita de um ID ou do lote. Usa o endpoint existente `/api/images/generate`, com `{ model: 'nanobanana', size: 'portrait_16_9', prompt }`; não chama fal diretamente (`scripts/lib/apresentadores-admin2410.mjs:134`, `scripts/lib/apresentadores-admin2410.mjs:227`).

**FATO CONFIRMADO:** `KINEO_BASE_URL` e `KINEO_FOUNDER_COOKIE` devem ser passadas no ambiente da sessão por um operador autorizado. O script não carrega `.env`. O cookie só é enviado à origem canônica `https://www.usekineo.com` ou a um servidor HTTP local; não segue redirects nem acompanha o download da imagem (`scripts/lib/apresentadores-admin2410.mjs:227`). Não coloque o valor do cookie em documentação, commit ou relatório.

```powershell
# Executar apenas em rodada futura com autorização de gasto e ambiente já configurado.
node scripts/apresentadores-2410.mjs --generate --allow-paid --id liana
# Ou o lote de pessoas ainda pendentes, preservando fontes já existentes:
node scripts/apresentadores-2410.mjs --generate --allow-paid --all
```

**FATO CONFIRMADO:** cada pessoa produz um único pedido de corpo inteiro. A fonte fica em `docs/assets/apresentadores-2410/<id>-source.bin`; a extensão não determina o formato, que será lido pelo conversor. Fontes existentes são preservadas. Em erro, a reserva local fica como recibo; confira a galeria antes de repetir, pois uma falha de download pode ocorrer depois da cobrança. Não há repetição paga automática (`scripts/lib/apresentadores-admin2410.mjs:227`).

**HIPÓTESE / custo ainda não verificado no provedor nesta tarefa:** US$ 0,15 por pessoa é a estimativa informada pelo fundador em 24/10/2026, coerente com o comentário do motor em `app/api/images/generate/route.ts:49`. A rota cobra créditos da conta autenticada (`app/api/images/generate/route.ts:120`). A estimativa não inclui voz nem nova tentativa. **QUESTÃO PENDENTE / DESCONHECIDO:** custo faturado e qualidade real do lote; não houve geração nesta entrega.

## Importar corpo, recortar rosto e importar voz

**FATO CONFIRMADO:** o rosto é um recorte manual da mesma foto, preservando identidade e evitando um segundo pedido de imagem. `--crop` recebe `x,y,largura,altura` como frações de 0 a 1. O exemplo abaixo é apenas sintaxe; a posição correta deve ser escolhida olhando a fonte. A conversão usa um `sharp` já instalado, resolvido pelo projeto ou passado em `--sharp-module`; nada é instalado automaticamente (`scripts/lib/apresentadores-admin2410.mjs:146`, `scripts/lib/apresentadores-admin2410.mjs:183`).

```powershell
node scripts/apresentadores-2410.mjs --import --id liana --source docs/assets/apresentadores-2410/liana-source.bin --crop 0.25,0.02,0.5,0.45 --sharp-module C:/caminho/ja-instalado/sharp/lib/index.js
```

**FATO CONFIRMADO:** sem conversor disponível, a importação também aceita dois WebP previamente preparados. Corpo e rosto devem ser verticais 9:16, estáticos, ter pelo menos 360 px de largura e até 120 KiB cada. A inspeção técnica valida estrutura/dimensões; olhos, mãos, identidade e enquadramento exigem revisão visual do fundador. A voz exige MP3 até 120 KiB e revisão auditiva (`scripts/lib/apresentadores-admin2410.mjs:57`, `scripts/lib/apresentadores-admin2410.mjs:97`).

```powershell
node scripts/apresentadores-2410.mjs --import --id liana --source C:/retratos/liana.webp --face-source C:/retratos/liana-face.webp --voice-source C:/retratos/liana-voice.mp3
# Também é possível importar apenas a voz depois:
node scripts/apresentadores-2410.mjs --import --id liana --voice-source C:/retratos/liana-voice.mp3
```

**FATO CONFIRMADO:** a importação remove a aprovação anterior antes de substituir arquivos; recusados continuam recusados. Cada aprovação registra SHA-256 dos arquivos e data ISO, e grava o JSON atomicamente, com lock e hash contra decisões concorrentes. Uma tela desatualizada precisa ser recarregada (`scripts/lib/apresentadores-admin2410.mjs:34`, `scripts/lib/apresentadores-admin2410.mjs:183`).

**QUESTÃO PENDENTE / DESCONHECIDO:** a adequação auditiva da nova voz e sua estabilidade nos idiomas só será conhecida após testes reais. **FATO CONFIRMADO:** esta ferramenta importa a amostra e exige o item `voiceMatch`; não fabrica voz nem usa o default genérico de `/api/audio/generate`, que não aceita a seleção MiniMax por idade nesta base (`app/api/audio/generate/route.ts:53`, `scripts/lib/apresentadores-admin2410.mjs:183`).

## Verificar e desfazer

**TESTADO LOCALMENTE em 24/10/2026:** os testes usam arquivos temporários, mocks e HTTP loopback. Cobrem aprovação bloqueada, identidade, checks, hashes, substituição de arquivos, recusa, desfazer, concorrência, Host/Origin/CSRF e bloqueio da geração paga por padrão (`scripts/test-apresentadores-admin-2410.mjs:1`). Não validam o provedor nem a qualidade de pessoas ainda não geradas.

```powershell
node --test scripts/test-apresentadores-admin-2410.mjs
```

**FATO CONFIRMADO:** para reverter uma decisão individual, use **Desfazer** no admin e revise o diff do catálogo. Isso retorna a pessoa a `pending`, limpa autor/data/hashes/checks e mantém os arquivos para revisão. Exposição pública posterior depende do catálogo aprovado, guardião, commit e processo de publicação do fundador (`scripts/lib/apresentadores-admin2410.mjs:115`).

**SUGESTÃO / próximo passo:** em uma rodada com gasto autorizado, gerar as pessoas pendentes, preparar os recortes e amostras das vozes pinadas, abrir o admin e colher a aprovação de seis. A prévia autocontida em `docs/previews/apresentadores-2410.html` mostra desktop/mobile, todos os novos nomes e o estado pendente real.
