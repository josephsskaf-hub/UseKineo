# WATCH — mídia e medição da primeira tela (13/11/2026)

## Fonte e limite do inventário

**FATO CONFIRMADO:** o commit `36f9f2309f4f314b515f75383b657e249d0f4123`, de 11/11/2026 01:04:30 −03:00, contém 24 versões leves. A branch `claude/div-plataforma-062ca9`, HEAD observado `39042754fbebeb3d81d2e5a8339b06e67b10b2c5`, mantém os mesmos blobs nesse diretório.

**FATO CONFIRMADO:** na `origin/main` observada `7b71edb2d9e966758d7d062ed7ab01310389b326`, de referência desta etapa, todos os 24 arquivos originais existem; nenhum dos 24 arquivos em `public/previews/leve-1111/` existe, e não há referência a `leve-1111` em app/components/lib/configs. O commit 36f9 não é ancestral dessa main. Verificado com `git ls-tree -r -l`, `git diff`, `git grep` e `git merge-base --is-ancestor`, sem rede ou produção.

**FATO CONFIRMADO:** pesos do conjunto de arquivos: **88.652.570 bytes originais → 18.836.755 bytes leves**. São tamanhos dos blobs, não bytes transferidos ao abrir a home. Não há medição de tráfego nesta subtarefa.

## Mapa completo dos 24 arquivos

Originais medidos na main de referência; novos medidos no commit aprovado e conferidos depois da cópia por tamanho e hash Git.

| Original | Versão leve aprovada | Bytes original | Bytes leve |
|---|---|---:|---:|
| `/previews/home-clean-sep24/castle.mp4` | `/previews/leve-1111/castle.mp4` | 17.842.051 | 1.504.766 |
| `/previews/home-clean-sep24/lituya-h3.mp4` | `/previews/leve-1111/lituya-h3.mp4` | 14.258.609 | 1.960.760 |
| `/previews/home-clean-sep24/volcano-scene.mp4` | `/previews/leve-1111/volcano-scene.mp4` | 11.644.775 | 1.278.424 |
| `/previews/home-clean-sep24/robot-action.mp4` | `/previews/leve-1111/robot-action.mp4` | 8.056.452 | 1.483.664 |
| `/previews/home-clean-sep24/lighthouse-scene.mp4` | `/previews/leve-1111/lighthouse-scene.mp4` | 7.132.011 | 883.819 |
| `/previews/home-clean-sep24/tunguska-globe.mp4` | `/previews/leve-1111/tunguska-globe.mp4` | 4.732.635 | 870.955 |
| `/previews/efeito-pet_xmas_angel.mp4` | `/previews/leve-1111/efeito-pet_xmas_angel.mp4` | 2.106.700 | 705.097 |
| `/previews/efeito-pet_bee.mp4` | `/previews/leve-1111/efeito-pet_bee.mp4` | 1.753.179 | 536.690 |
| `/previews/studio-kling4-werewolf-kid.mp4` | `/previews/leve-1111/studio-kling4-werewolf-kid.mp4` | 1.680.019 | 888.998 |
| `/previews/motion-surf-0611.mp4` | `/previews/leve-1111/motion-surf-0611.mp4` | 1.652.956 | 1.425.458 |
| `/previews/efeito-pet_lion.mp4` | `/previews/leve-1111/efeito-pet_lion.mp4` | 1.648.054 | 407.809 |
| `/previews/efeito-snow_globe.mp4` | `/previews/leve-1111/efeito-snow_globe.mp4` | 1.555.343 | 517.206 |
| `/previews/efeito-kiss.mp4` | `/previews/leve-1111/efeito-kiss.mp4` | 1.457.341 | 427.269 |
| `/previews/motion-rua-0611.mp4` | `/previews/leve-1111/motion-rua-0611.mp4` | 1.388.876 | 461.752 |
| `/previews/motion-manta-0611.mp4` | `/previews/leve-1111/motion-manta-0611.mp4` | 1.352.099 | 587.483 |
| `/previews/motion-horse-0611.mp4` | `/previews/leve-1111/motion-horse-0611.mp4` | 1.348.903 | 750.866 |
| `/previews/motion-neve-0611.mp4` | `/previews/leve-1111/motion-neve-0611.mp4` | 1.313.571 | 747.864 |
| `/previews/efeito-pet_xmas_tree.mp4` | `/previews/leve-1111/efeito-pet_xmas_tree.mp4` | 1.233.330 | 395.153 |
| `/previews/motion-eagle-0611.mp4` | `/previews/leve-1111/motion-eagle-0611.mp4` | 1.180.813 | 513.829 |
| `/previews/efeito-santa_cartoon.mp4` | `/previews/leve-1111/efeito-santa_cartoon.mp4` | 1.167.366 | 383.463 |
| `/previews/efeito-giant_product.mp4` | `/previews/leve-1111/efeito-giant_product.mp4` | 1.057.359 | 298.279 |
| `/previews/galeria/pebble-castle.mp4` | `/previews/leve-1111/pebble-castle.mp4` | 1.048.004 | 757.622 |
| `/previews/galeria/wizard-cat.mp4` | `/previews/leve-1111/wizard-cat.mp4` | 1.025.862 | 749.302 |
| `/previews/efeito-hug.mp4` | `/previews/leve-1111/efeito-hug.mp4` | 1.016.262 | 300.227 |

## Os seis clipes atuais do topo

**FATO CONFIRMADO:** `CLIPES_NO_TOPO` em `lib/clipesNos2Lugares.ts:152` contém, nesta ordem, os itens abaixo. `clipeNovoVideo` e `clipeNovoPoster` derivam os caminhos de `galeria/` em `:159` e `:160`. Nenhum desses seis tem substituto no lote leve-1111.

| ID (vídeo em /previews/galeria/; pôster em /posters/galeria/) | Bytes MP4 | Bytes WebP |
|---|---:|---:|
| carta-do-front | 209.159 | 19.386 |
| raposa-lanterna | 486.649 | 33.894 |
| selfie-confete | 578.837 | 28.060 |
| anuncio-burger-camera-lenta | 375.485 | 32.770 |
| anuncio-creme-selfie | 347.854 | 21.588 |
| sueter-aconchegante | 445.477 | 41.462 |

**FATO CONFIRMADO:** os seis arquivos completos somam 2.443.461 bytes de vídeo e 177.160 bytes de pôster. **QUESTÃO PENDENTE:** quanto deles o navegador transfere antes de rolar. Não inferir esse valor pela soma do disco. WATCH usa CLIPES_NOVOS/galeria; o mapping dos 24 arquivos antigos não reduz automaticamente essas novas fontes.

## Implementação isolada

Árvore criada sem checkout em `m6-media`, branch `codex/m6-media`, base main 7b71. Nenhuma escrita na working tree principal.

- `components/home/WatchMedia.tsx`: componente client, props `src`, `poster?`, `focus?`, `showPlayButton=false`.
- `lib/home/watchMedia.ts`: `watchPreviewSrc(src)`, `watchPosterSrc(src, poster?)` e `createWatchMediaController(box, video, src, onState?)`.
- `scripts/test-watch-media-1311.cjs`: teste offline com DOM fake, SSR e os blobs aprovados.
- `public/previews/leve-1111/*.mp4`: os 24 blobs do commit aprovado, sem transcodificação.

**IMPLEMENTADO:** janela 5:6, img/video em contain, vídeo inicialmente sem src e preload none; fonte só com intersectionRatio >= 0.6, documento visível e políticas compatíveis. Ao sair, ocultar a aba, ativar reduced-motion, Save-Data ou conexão 2g: pause, removeAttribute('src') e load(). Cleanup remove listeners/observer. Um owner por elemento impede que a promise de um play antigo descarregue o vídeo da próxima instância.

**IMPLEMENTADO:** fonte não mapeada permanece idêntica; query/hash são preservados. O resolver de pôster usa `clipeNovoPoster` existente para galeria; fontes legadas devem continuar fornecendo seu pôster atual. `showPlayButton=true` só deve ser usado fora de Link. Play manual continua mudo e não ultrapassa os gates de visibilidade/política.

**LIMITE:** o pôster usa a política nativa `img loading=lazy`; ela não é uma garantia de carregar apenas dentro do viewport. A retirada do src cancela a intenção de reprodução/carregamento do elemento, mas a quantidade de bytes já recebidos ou cancelados depende do navegador e será medida. Não declarar tráfego zero por uma asserção de DOM.

**TESTADO LOCALMENTE:** `node scripts/test-watch-media-1311.cjs` passou **9 cenários de lifecycle, 24 arquivos aprovados e 132 contratos**, incluindo src ausente antes de 60%, saída/reentrada, aba, reduced-motion, Save-Data, slow-2g, autoplay rejeitado, limpeza, troca de owner, SSR e consistência de bytes/hashes. Não executa browser, API, render, banco ou scripts de produção. Não substitui typecheck e QA integrado do responsável.

## Código e guardas existentes relevantes

- `components/WallMedia.tsx:27–38`: observer e políticas atuais. Apesar de threshold 0.25, o callback usa apenas `entry.isIntersecting`; não exige explicitamente ratio >= 0.25. Depois de montar, apenas pausa ao sair, conservando src.
- `components/home/HomeMosaic.tsx:126–128`: topo derivado de CLIPES_NO_TOPO. `:378–379`: pôster lazy e WallMedia para clipes novos.
- `scripts/test-clipes-nos-2-lugares-0411.mjs:273–278`: protege lazy/preload e uso de WallMedia; `:430–431`: mutantes de pôster eager/vídeo direto.
- `scripts/test-galeria-home-2710.mjs:148–151`: protege WallMedia, preload e observer; `:256–257`: mutantes de vídeo solto/pôster eager.
- `scripts/test-galeria-cheia-2810.mjs:92`: composição lazy da galeria.
- `scripts/test-enquadramento-vitrine-0911.mjs`: assinatura de mídia/pôster e registro de enquadramento. Não foi executado nem reancorado nesta etapa.

Esses guardas estáticos não comprovam, sozinhos, quais requests o browser iniciou. O novo teste exercita a política real com DOM fake, mas também não mede tráfego.

## Medição no navegador, antes de qualquer rolagem

**SUGESTÃO — protocolo para o responsável, ainda não executado nesta subtarefa:**

1. Usar build/preview local sem credenciais de produção e autenticação por fixture, em contexto novo, com service workers bloqueados. Permitir apenas GET da origem localhost e bloquear APIs, outras origens e métodos de escrita. Não reutilizar perfil/caches de uma visita anterior.
2. Fixar viewport e configurações do navegador iguais antes/depois. Repetir desktop e celular. Não clicar, rolar, usar scrollIntoView nem tirar screenshot fullPage antes de registrar a primeira amostra: essas ações podem ativar vídeos de baixo.
3. Registrar ResourceTiming desde antes da navegação, com buffer ampliado. Aguardar DOM, fontes, dois frames de layout e idle de rede. Se idle não for atingido, registrar isso como limite; não chamar a amostra de “após idle”.
4. Exportar **todos** os recursos concluídos, sem filtrar só mídia, mais a entrada navigation do HTML. Conservar URL, initiatorType, startTime, responseEnd, transferSize, encodedBodySize e decodedBodySize; separar também pedidos ainda pendentes via eventos de request/response.
5. Na mesma amostra, guardar scrollX/scrollY, viewport, geometria dos cartões e os src efetivamente instalados nos vídeos. Confirmar que a primeira amostra tem scroll zero e que não há vídeo com src fora da política de 60%.
6. Só depois rolar uma tela e registrar uma segunda amostra. Comparar bytes de entrada por entrada, requests e URLs; não confundir tamanho de arquivo, payload recebido e tamanho de transferência com headers.
7. Usar a mesma build para a comparação de antes/depois. Medida em next dev pode ajudar diagnóstico, mas HMR/JS de desenvolvimento não é orçamento de produção. O responsável mede a build de produção em seguida.

ResourceTiming expõe tamanho recebido, que pode ser diferente do arquivo completo ou ser zero por cache/restrições/falha. Same-origin local e contexto frio reduzem essas ambiguidades; zeros não devem ser tratados como prova de arquivo pequeno. Fonte: [encodedBodySize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/encodedBodySize), [transferSize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize). [PerformanceObserver com type/resource e buffered](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe) captura entradas já disponíveis. [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) distingue isIntersecting e intersectionRatio. Consulta: 13/11/2026.

Exemplo de coleta para um harness Playwright **já local e isolado**; não cria servidor e não chama serviço de produção:

```js
const localUrl = 'http://127.0.0.1:3016/';
const localOrigin = new URL(localUrl).origin;
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  serviceWorkers: 'block',
});
const blocked = [];
await context.route('**/*', route => {
  const request = route.request(), url = new URL(request.url());
  if (request.method() !== 'GET' || url.origin !== localOrigin || url.pathname.startsWith('/api/')) {
    blocked.push({ method: request.method(), url: url.href });
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
const pending = new Set();
page.on('request', request => pending.add(request));
page.on('requestfinished', request => pending.delete(request));
page.on('requestfailed', request => pending.delete(request));
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});
let reachedIdle = true;
try { await page.waitForLoadState('networkidle', { timeout: 15000 }); }
catch { reachedIdle = false; }
await page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});
const beforeScroll = await page.evaluate(reachedIdle => ({
  reachedIdle,
  scroll: { x: scrollX, y: scrollY },
  viewport: { width: innerWidth, height: innerHeight },
  navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()),
  resources: performance.getEntriesByType('resource').map(entry => entry.toJSON()),
  videos: [...document.querySelectorAll('[data-watch-media] video')].map(video => {
    const rect = video.getBoundingClientRect();
    return { src: video.getAttribute('src'), paused: video.paused,
      top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  }),
}), reachedIdle);
beforeScroll.pending = [...pending].map(request => ({ url: request.url(), type: request.resourceType() }));
beforeScroll.blocked = blocked;
// Salvar o JSON agora. Só depois fazer scroll ou screenshot fullPage.
```

**Estado:** IMPLEMENTADO e TESTADO LOCALMENTE no escopo acima. Medição browser, typecheck integrado, publicação, validação externa e pagamento vivo não foram executados por esta subtarefa.
