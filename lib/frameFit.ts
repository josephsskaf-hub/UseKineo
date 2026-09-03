'use client'

// ═══ KINEO-QUADRO-QUE-SE-AJUSTA-2026-09-02 ═════════════════════════════════
// O multi-formato (16:9 · 1:1 · 4:5) subiu hoje. O render já nasce no quadro
// certo — mas TODAS as ~10 telas que mostram o filme tinham `aspectRatio:
// '9 / 16'` CHUMBADO. Efeito prático: o cliente escolhe 16:9, o arquivo sai
// 1920×1080 correto, e a tela do resultado o espreme dentro de uma caixa
// vertical com `objectFit: cover` — ou seja, ele veria o próprio vídeo
// CORTADO nas laterais e concluiria que o formato novo não funciona. O
// recurso mais vendável do dia pareceria defeito na primeira olhada.
//
// A CORREÇÃO DELIBERADAMENTE NÃO PASSA PELO BANCO. A alternativa óbvia era
// uma coluna `videos.aspect`: exige migration, exige achar todos os pontos
// de escrita, e — o que mata — deixa os 1.100+ vídeos ANTIGOS sem valor, com
// backfill adivinhado. Aqui a fonte da verdade é o próprio arquivo:
// `videoWidth`/`videoHeight` são as dimensões REAIS decodificadas pelo
// navegador. Não tem como divergir do que a pessoa está vendo, funciona
// retroativamente em 100% da biblioteca e não custa uma linha de SQL.
//
// O 9:16 continua sendo o valor inicial de toda caixa: é o quadro de ~100%
// do acervo, então na prática nada pisca. O ajuste só acontece quando o
// arquivo realmente não é vertical.

/** Ajusta a caixa ao quadro real do arquivo. Idempotente e à prova de erro. */
export function fitFrameToVideo(video: HTMLVideoElement | null | undefined): void {
  if (!video) return
  const w = video.videoWidth
  const h = video.videoHeight
  // metadata ainda não chegou (0×0) ou veio quebrada → não mexe em nada.
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return

  // A caixa é o ancestral marcado; sem marcação, o próprio <video>.
  const box = (video.closest('[data-kineo-frame]') as HTMLElement | null) ?? video
  box.style.aspectRatio = `${w} / ${h}`

  // Um filme deitado dentro de uma coluna de 460px vira uma tarja de 259px de
  // altura. Quando a caixa declara uma largura alternativa para paisagem
  // (data-kineo-frame-wide), usamos ela — é o mesmo player, respirando.
  const wide = box.getAttribute('data-kineo-frame-wide')
  if (wide && w > h) box.style.width = wide
  box.setAttribute('data-kineo-frame-ratio', w > h ? 'landscape' : w === h ? 'square' : 'portrait')
}

/**
 * Igual à de cima, mas para o caso do lightbox: lá a moldura tem width:100%
 * dentro de uma COLUNA que já limita a 420px. Alargar só a moldura não faria
 * efeito nenhum — quem manda na largura é a coluna. `data-kineo-frame-shell`
 * marca essa coluna; ela acompanha a moldura quando o filme é deitado, e os
 * botões de download continuam empilhados embaixo, na mesma largura.
 */
export function fitLightboxFrame(video: HTMLVideoElement | null | undefined): void {
  if (!video) return
  const w = video.videoWidth
  const h = video.videoHeight
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return
  fitFrameToVideo(video)
  if (w > h) {
    const shell = video.closest('[data-kineo-frame-shell]') as HTMLElement | null
    if (shell) shell.style.width = 'min(820px, 94vw)'
  }
}

/** Handler pronto para `onLoadedMetadata` de um <video>. */
export function onVideoMetadataFitFrame(e: { currentTarget: HTMLVideoElement }): void {
  fitFrameToVideo(e.currentTarget)
}
