// KINEO-ENQUADRAMENTO-0911 — fundador 09/11: "tem muitos que estão fora de quadro… eu quero que você coloque um código que sempre que a
// gente for colocar alguma coisa nova, a gente coloque ele com os quadros certos. A gente não pode errar isso."
//
// O REGISTRO DO ENQUADRAMENTO DA VITRINE (home + /made-with-kineo, components/home/HomeMosaic.tsx). Módulo puro, sem import.
// Uma entrada por mídia que a vitrine pode mostrar (chave = o caminho em public/ do vídeo, ou da imagem quando o cartão é foto):
//   · focus  — o object-position conferido (o MESMO que o código usa; o guardião compara);
//   · shapes — as formas de janela em que a mídia foi conferida (JANELAS abaixo); toda forma em que ela pode aparecer tem de estar aqui;
//   · frames — quantos quadros foram olhados (mínimo 8, com o 1º e o último);
//   · date   — o dia da conferência;
//   · media / poster — "bytes:sha1(12)" dos arquivos olhados: trocou o arquivo, o guardião fica vermelho até conferir de novo.
//
// COMO ENTRA MÍDIA NOVA NA VITRINE (e só assim):
//   1. node scripts/enquadra.mjs <id ou caminho> [--focus "50% 30%"]  → monta a folha de contato com TODAS as janelas desenhadas;
//   2. olhar a folha: cabeça inteira (com um respiro em cima), rosto, produto, o corpo que pula — dentro da caixa VERDE em todo quadro;
//   3. acertar o focus no código até a folha ficar certa e colar aqui a linha que a ferramenta imprime;
//   4. node scripts/test-enquadramento-vitrine-0911.mjs fica verde. Sem a linha, ele fica vermelho.
//
// POR QUE UMA CAIXA SÓ BASTA: com o mesmo object-position, a faixa visível numa janela mais larga (mais "deitada") está SEMPRE dentro da
// faixa visível numa janela mais estreita. Então quem cabe na janela mais larga de uma forma cabe em todas as menores — um focus por forma
// é o mesmo focus. A caixa amarela (a janela mais estreita) só mostra o corte dos lados, que aparece quando a janela fica mais fina que o vídeo.

export const ENQUADRAMENTO_MARK = 'KINEO-ENQUADRAMENTO-0911'

/** Formas de janela da vitrine, em largura÷altura (min = a mais estreita, max = a mais larga), medidas no CSS de HomeMosaic.tsx e
 *  app/appearance.css (#samples). Desktop da home: fileira = (max(300, (alto−244)/2) − 24)/3; numa tela 1920×1080 com o Chrome
 *  maximizado (janela útil ~1905×945) o cartão pequeno fica 297×230 = 1,29 — a tela do fundador. */
export const JANELAS = {
  /** Efeito, estilo de anúncio, clipe novo pequeno, foto retrato: 1 coluna × 2 fileiras. Tablet 768 px = 167×242 (0,69); home desktop 1,29. */
  small: { min: 0.69, max: 1.3 },
  /** Clipe, filme, clipe novo grande, foto grande: 2×4 (desktop/tablet) e 1×3 no celular — 375 px = 164×320 (0,51); home desktop 1,27. */
  big: { min: 0.51, max: 1.3 },
  /** Fileira multicâmera da home: 1×3 no desktop (até ~0,90 em tela larga e baixa); vira "big" no tablet e no celular (0,51). */
  motion: { min: 0.51, max: 0.9 },
  /** Foto paisagem: 2×2. Tablet 768 px = 346×242 (1,43); home desktop 606×230 (2,64). */
  wide: { min: 1.43, max: 2.7 },
} as const

export type JanelaForma = keyof typeof JANELAS

export interface Enquadrado {
  focus: string
  shapes: readonly JanelaForma[]
  frames: number
  date: string
  /** "bytes:sha1(12)" do arquivo de mídia (vídeo; na foto, a própria imagem). */
  media: string
  /** "bytes:sha1(12)" do pôster; null quando o cartão não tem pôster (foto). */
  poster: string | null
  /** O que foi feito (só quando mudou algo: foco trocado, prévia encurtada). */
  note?: string
}

export const ENQUADRAMENTO: Readonly<Record<string, Enquadrado>> = {
  // ── clip ──
  '/previews/galeria/cake-kitten.mp4': { focus: '50% 20%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '496497:0a2d173202a8', poster: '18036:33791a8c4314', note: 'foco 50% 55% → 50% 20%' },
  '/previews/galeria/capybara.mp4': { focus: '50% 32%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '949925:b0983f5b3855', poster: '45890:29035b57c0dd', note: 'foco 50% 45% → 50% 32%' },
  '/previews/galeria/golden-ball.mp4': { focus: '50% 12%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '707602:7ecff716ae83', poster: '37980:435edefc9414', note: 'foco 50% 18% → 50% 12%' },
  '/previews/galeria/knight-cat.mp4': { focus: '50% 15%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '838523:596273593fe5', poster: '29572:4e6abdfcb786' },
  '/previews/galeria/lion.mp4': { focus: '50% 22%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '907021:785ebd6eb894', poster: '41304:dbc3e33b449b', note: 'prévia encurtada de 5 s para 4 s (o fim era só o focinho, olhos fora do quadro) e pôster novo do segundo 2,2; foco 50% 50% → 50% 22%' },
  '/previews/galeria/pebble-castle.mp4': { focus: '50% 18%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '1048004:0d6802f2e9e8', poster: '27002:3ba45ecc6f63', note: 'foco 50% 25% → 50% 18%' },
  '/previews/galeria/wizard-cat.mp4': { focus: '50% 16%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '1025862:03580871d6d1', poster: '29288:0f4b099b9fd6', note: 'foco 50% 25% → 50% 16%' },
  // ── film ──
  '/previews/home-clean-sep24/castle.mp4': { focus: '50% 50%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '17842051:09828d635efe', poster: '425250:59d6b7265c6b' },
  '/previews/home-clean-sep24/lighthouse-scene.mp4': { focus: '50% 14%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '7132011:c967f873f36c', poster: '180926:303786cd06ec', note: 'foco 50% 28% → 50% 14%' },
  '/previews/home-clean-sep24/lituya-h3.mp4': { focus: '50% 50%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '14258609:2cdb08ed48d6', poster: '144090:85dfdaf198fc' },
  '/previews/home-clean-sep24/robot-action.mp4': { focus: '50% 12%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '8056452:22a36cb86783', poster: '140490:d8e9165e244d', note: 'foco 50% 35% → 50% 12%' },
  '/previews/home-clean-sep24/tunguska-globe.mp4': { focus: '50% 44%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '4732635:97deac07d955', poster: '52068:a7091fca618f' },
  '/previews/home-clean-sep24/volcano-scene.mp4': { focus: '50% 48%', shapes: ['big'], frames: 10, date: '2026-11-09', media: '11644775:06304dacc4a3', poster: '533338:95859285b1a2', note: 'foco 50% 35% → 50% 48%' },
  // ── motion ──
  '/previews/motion-eagle-0611.mp4': { focus: '50% 25%', shapes: ['motion'], frames: 10, date: '2026-11-09', media: '1180813:0d6af3fa67a5', poster: '58902:c42226153bf5', note: 'foco 50% 50% → 50% 25%' },
  '/previews/motion-horse-0611.mp4': { focus: '50% 32%', shapes: ['motion'], frames: 10, date: '2026-11-09', media: '1348903:b73c97691617', poster: '32904:459922718534', note: 'foco 50% 50% → 50% 32%' },
  '/previews/motion-manta-0611.mp4': { focus: '50% 35%', shapes: ['motion'], frames: 10, date: '2026-11-09', media: '1352099:534c24431755', poster: '49998:abc2bb322865', note: 'foco 50% 50% → 50% 35%' },
  '/previews/motion-neve-0611.mp4': { focus: '50% 50%', shapes: ['motion'], frames: 10, date: '2026-11-09', media: '1313571:34f1539d13ec', poster: '12076:24901140da0f' },
  '/previews/motion-rua-0611.mp4': { focus: '50% 75%', shapes: ['motion'], frames: 10, date: '2026-11-09', media: '1388876:301ca6e9f474', poster: '27250:2fcec17cc3a6' },
  '/previews/motion-surf-0611.mp4': { focus: '50% 55%', shapes: ['motion'], frames: 10, date: '2026-11-09', media: '1652956:284844d4ba80', poster: '16860:757b95408c0c' },
  // ── novo ──
  '/previews/galeria/adeus-2026.mp4': { focus: '50% 36%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '454814:ab534c748027', poster: '40020:4a3cad6d9ba2', note: 'foco 50% 45% → 50% 36%' },
  '/previews/galeria/bebe-danca.mp4': { focus: '50% 70%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '266099:9474e7b36757', poster: '33110:afb590fd5d93' },
  '/previews/galeria/flying-burger.mp4': { focus: '50% 40%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '549664:8759c51dc4d6', poster: '38400:a8b6469d1707' },
  '/previews/galeria/glow-up.mp4': { focus: '50% 34%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '296119:dd4a8b49b605', poster: '23024:8ad08b224806', note: 'foco 50% 55% → 50% 34%' },
  '/previews/galeria/iced-coffee-pour.mp4': { focus: '50% 35%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '377478:477aed050b1d', poster: '23364:3f0230071c8f' },
  '/previews/galeria/outfit-morph.mp4': { focus: '50% 30%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '522099:19361537ad4e', poster: '53674:679511d42ae4', note: 'foco 50% 40% → 50% 30%' },
  '/previews/galeria/perfume-splash.mp4': { focus: '50% 58%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '574797:4519203637fd', poster: '30648:9ed7b01aa101', note: 'foco 50% 55% → 50% 58%' },
  '/previews/galeria/pet-barista.mp4': { focus: '50% 19%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '291923:3b6ec0528d90', poster: '24272:6ecba0d4259e', note: 'foco 50% 55% → 50% 19%' },
  '/previews/galeria/produto-burger-mesa.mp4': { focus: '50% 75%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '306329:d723267588e6', poster: '39930:8fe61cda48a3' },
  '/previews/galeria/produto-perfume-marmore.mp4': { focus: '50% 65%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '281567:57f61fd749f6', poster: '37636:2ab4831a9005' },
  '/previews/galeria/produto-tenis-rua.mp4': { focus: '50% 50%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '308379:bd9140f7e563', poster: '29250:969bfc06d7b6' },
  '/previews/galeria/spinning-headphones.mp4': { focus: '50% 40%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '517277:40538915a36c', poster: '13944:005ca3fa7309', note: 'foco 50% 43% → 50% 40%' },
  '/previews/galeria/ugc-homem-cafe.mp4': { focus: '50% 26%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '376725:d7795fbdd563', poster: '32930:df086605dde9', note: 'foco 50% 40% → 50% 26%' },
  '/previews/galeria/ugc-idosa-creme.mp4': { focus: '50% 25%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '492890:86ade408576f', poster: '38628:9b51ac761847' },
  '/previews/galeria/ugc-indiano-fone.mp4': { focus: '50% 38%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '509774:0efd076c4ddf', poster: '34454:279fd9c6be8f', note: 'foco 50% 55% → 50% 38%' },
  '/previews/galeria/virada-natal.mp4': { focus: '50% 54%', shapes: ['big', 'small'], frames: 10, date: '2026-11-09', media: '362809:376362b09db0', poster: '36008:c7274148474e', note: 'foco 50% 88% → 50% 54%' },
  // ── effect ──
  '/previews/efeito-bring_to_life.mp4': { focus: '50% 38%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1420674:1825f976f45f', poster: '68300:a5ffe504b0c7', note: 'foco 50% 45% → 50% 38%' },
  '/previews/efeito-cinematic_slowmo.mp4': { focus: '50% 28%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1859783:d0c082d76f2d', poster: '126396:fea03a7be3d0', note: 'foco 50% 45% → 50% 28%' },
  '/previews/efeito-color_burst.mp4': { focus: '50% 15%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '2209143:862f5160e23b', poster: '55854:d07ef9e6a3ba', note: 'foco 50% 45% → 50% 15%' },
  '/previews/efeito-dollar_rain.mp4': { focus: '50% 25%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1608353:733465679225', poster: '65576:cd01a061535d', note: 'foco 50% 45% → 50% 25%' },
  '/previews/efeito-giant_product.mp4': { focus: '50% 28%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1057359:cc5d07275bde', poster: '76690:aae058237d3e', note: 'foco 50% 45% → 50% 28%' },
  '/previews/efeito-hug.mp4': { focus: '50% 22%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1016262:3a490d8045cc', poster: '35204:eb241a6ed398', note: 'foco 50% 45% → 50% 22%' },
  '/previews/efeito-kiss.mp4': { focus: '50% 22%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1457341:d55f7b3581ef', poster: '56456:831e7afc95d6', note: 'foco 50% 45% → 50% 22%' },
  '/previews/efeito-melt.mp4': { focus: '50% 33%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '745117:dc103431edc9', poster: '31784:316f9a4be9e4', note: 'foco 50% 45% → 50% 33%' },
  '/previews/efeito-muscle_surge.mp4': { focus: '50% 22%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1311197:7856b3176a27', poster: '52128:833ee6c6d4bd', note: 'foco 50% 45% → 50% 22%' },
  '/previews/efeito-pet_bee.mp4': { focus: '50% 12%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1753179:49c4e3c00617', poster: '50928:1a0b668fbfcb', note: 'foco 50% 45% → 50% 12%' },
  '/previews/efeito-pet_lion.mp4': { focus: '50% 14%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1648054:4083159bdce7', poster: '57404:6625da1ab7e4', note: 'foco 50% 25% → 50% 14%' },
  '/previews/efeito-pet_xmas_angel.mp4': { focus: '50% 18%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '2106700:e3730ee4cf41', poster: '51430:0855e13bb83a', note: 'foco 50% 30% → 50% 18%' },
  '/previews/efeito-pet_xmas_tree.mp4': { focus: '50% 8%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1233330:531e62e7d585', poster: '51716:9fa2e14cb518', note: 'foco 50% 25% → 50% 8%' },
  '/previews/efeito-product_360.mp4': { focus: '50% 32%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '753315:2ad29e95e47e', poster: '40116:f0b61bea439a', note: 'foco 50% 45% → 50% 32%' },
  '/previews/efeito-restore_old_photo.mp4': { focus: '50% 22%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '2262747:2ebf4977b7a6', poster: '48556:81c84c1c2545', note: 'foco 50% 45% → 50% 22%' },
  '/previews/efeito-santa_cartoon.mp4': { focus: '50% 10%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1167366:56b4a58c1314', poster: '34248:502e7618d481', note: 'foco 50% 25% → 50% 10%' },
  '/previews/efeito-secret_cake.mp4': { focus: '50% 40%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '597254:3cfe44ae00c6', poster: '43092:8353d4924602', note: 'foco 50% 45% → 50% 40%' },
  '/previews/efeito-snow_globe.mp4': { focus: '50% 8%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1555343:e65ab1448f5d', poster: '75770:eb76e05432d5', note: 'foco 50% 35% → 50% 8%' },
  '/previews/efeito-storm_behind.mp4': { focus: '50% 40%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '957518:9db98c159094', poster: '56460:fa0edd769086', note: 'foco 50% 45% → 50% 40%' },
  '/previews/efeito-wings.mp4': { focus: '50% 18%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '648565:2eea5ebe5118', poster: '24972:a786a99f9a01', note: 'foco 50% 45% → 50% 18%' },
  '/previews/efeito-zoom_out_earth.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '2195424:d884f7796e45', poster: '42178:f150e4f64145' },
  // ── style ──
  '/ads-styles/beach_ad.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '198773:5ac90d82dff5', poster: '14451:23df52b13e9d' },
  '/ads-styles/boom_drop.mp4': { focus: '50% 38%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '293094:a1dc833f77a9', poster: '39337:0d2a5a32e72a', note: 'foco 50% 45% → 50% 38%' },
  '/ads-styles/dishes_served.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '223890:97dd041e7568', poster: '28901:72999b370a28' },
  '/ads-styles/dreamlike_cloud.mp4': { focus: '50% 55%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '124802:ba3aa912e74e', poster: '14219:08de8379531f', note: 'foco 50% 45% → 50% 55%' },
  '/ads-styles/giant_product.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '165357:3986bab1ba03', poster: '28984:ac6a329a5887' },
  '/ads-styles/graffiti_ad.mp4': { focus: '50% 62%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '288642:e7f8dc0afd8c', poster: '37519:8bf2d5ca3db2', note: 'foco 50% 45% → 50% 62%' },
  '/ads-styles/lighting_ad.mp4': { focus: '50% 55%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '82408:c3ac1b1959ad', poster: '12834:e00da3e38186', note: 'foco 50% 45% → 50% 55%' },
  '/ads-styles/macaron_machine.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '253901:e4561e65c004', poster: '33408:bb7ed34273b8' },
  '/ads-styles/mechanical_assembly.mp4': { focus: '50% 40%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '193767:2bd73939a615', poster: '25635:b3f473825224', note: 'foco 50% 45% → 50% 40%' },
  '/ads-styles/naked_eye_3d_ad.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '288208:b8c89d070817', poster: '42935:97744d84e28a' },
  '/ads-styles/ocean_ad.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '287718:78ebcfd9c454', poster: '41712:b0557c62fd80' },
  '/ads-styles/package_explosion.mp4': { focus: '50% 60%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '216656:7bbcc2ba177a', poster: '18335:e66389007006', note: 'foco 50% 45% → 50% 60%' },
  '/ads-styles/parachute_delivery.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '234686:bdae88ff1bca', poster: '30380:406156da46e8' },
  '/ads-styles/poster_ad.mp4': { focus: '50% 50%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '209517:1d22a632e35d', poster: '40596:ec266dbc6858', note: 'foco 50% 45% → 50% 50%' },
  '/ads-styles/product_closeup.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '147373:fe78d2f9d713', poster: '17592:51c7adf31976' },
  '/ads-styles/shoal_surround.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '118414:5e3f2906b559', poster: '12501:22c71aa3d3c6' },
  '/ads-styles/supermarket_ad.mp4': { focus: '50% 45%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '312309:31f484122972', poster: '49303:3d4e8d3070b5' },
  // ── image ──
  '/home-images/ad-01.webp': { focus: '50% 45%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '45544:7688391cd04f', poster: null, note: 'foco 50% 50% → 50% 45%' },
  '/home-images/ad-02.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '29154:e7362cab659d', poster: null },
  '/home-images/ad-03.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '17506:7ff92cdbf6f8', poster: null },
  '/home-images/ad-04.webp': { focus: '50% 38%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '42694:1b77cd6bb8d3', poster: null, note: 'foco 50% 50% → 50% 38%' },
  '/home-images/ad-05.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '39782:b67d63e7a931', poster: null },
  '/home-images/ad-06.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '34474:a453a986ae4c', poster: null },
  '/home-images/ad-07.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '12730:9b500fd6cca7', poster: null },
  '/home-images/ad-08.webp': { focus: '50% 41%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '79744:d837959ee506', poster: null, note: 'foco 50% 50% → 50% 41%' },
  '/home-images/ad-09.webp': { focus: '50% 37%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '20012:96ea38a2e2c0', poster: null, note: 'foco 50% 50% → 50% 37%' },
  '/home-images/ad-10.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '37454:a429e93cc4ab', poster: null },
  '/home-images/apple.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '22534:0ef693ec059d', poster: null },
  '/home-images/astronaut.webp': { focus: '50% 50%', shapes: ['wide'], frames: 1, date: '2026-11-09', media: '47236:31d388e9bb74', poster: null },
  '/home-images/boutique.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '94560:9284ff9689b5', poster: null },
  '/home-images/clock-blue.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '31138:8644f5255c1c', poster: null },
  '/home-images/clock-brass.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '112152:ddae347bcd31', poster: null },
  '/home-images/coffee.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '103230:89f8b1fb5f4b', poster: null },
  '/home-images/coworking.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '73594:6362b76de1c1', poster: null },
  '/home-images/cube.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '11988:3d4f5b64a4da', poster: null },
  '/home-images/lighthouse.webp': { focus: '50% 30%', shapes: ['wide'], frames: 1, date: '2026-11-09', media: '48938:8618cc84a03d', poster: null, note: 'foco 50% 50% → 50% 30%' },
  '/home-images/perfume-splash.webp': { focus: '50% 28%', shapes: ['wide'], frames: 1, date: '2026-11-09', media: '37042:a9e6190c3815', poster: null, note: 'foco 50% 50% → 50% 28%' },
  '/home-images/puddle.webp': { focus: '50% 32%', shapes: ['big'], frames: 1, date: '2026-11-09', media: '117724:4553765b7b37', poster: null, note: 'foco 50% 50% → 50% 32%' },
  '/home-images/raincoat.webp': { focus: '50% 44%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '43018:ad97786306a1', poster: null, note: 'foco 50% 50% → 50% 44%' },
  '/home-images/sneaker-white.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '10352:405b72707d87', poster: null },
  '/home-images/toycar.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '17046:aa8a3716fd05', poster: null },
  '/home-mosaic/alley.webp': { focus: '50% 50%', shapes: ['wide'], frames: 1, date: '2026-11-09', media: '28556:e0e65b52b280', poster: null },
  '/home-mosaic/boot-stream.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '65934:687cce786ffc', poster: null },
  '/home-mosaic/cabin.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '36662:b1e3e0de8bd5', poster: null },
  '/home-mosaic/camper.webp': { focus: '50% 50%', shapes: ['wide'], frames: 1, date: '2026-11-09', media: '16836:cf96f869ef08', poster: null },
  '/home-mosaic/canoe.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '21026:587bae0a1225', poster: null },
  '/home-mosaic/dog-sweater.webp': { focus: '50% 25%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '41312:cf7f1c56c409', poster: null, note: 'foco 50% 50% → 50% 25%' },
  '/home-mosaic/jelly.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '19250:4184f1051c74', poster: null },
  '/home-mosaic/matcha.webp': { focus: '50% 35%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '21030:852cc3342fa9', poster: null, note: 'foco 50% 50% → 50% 35%' },
  '/home-mosaic/mug-rain.webp': { focus: '50% 50%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '23106:042d77fc0c9f', poster: null },
  '/home-mosaic/perfume-snow.webp': { focus: '50% 37%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '52526:94a2e8ae00e5', poster: null, note: 'foco 50% 50% → 50% 37%' },
  '/home-mosaic/roses.webp': { focus: '50% 30%', shapes: ['small'], frames: 1, date: '2026-11-09', media: '29218:421c473bcb8f', poster: null, note: 'foco 50% 50% → 50% 30%' },
}
