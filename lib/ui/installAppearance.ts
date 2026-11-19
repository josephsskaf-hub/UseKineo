export const installColors = { light: '#F7F7F5', dark: '#07090D' } as const

// Safari matches startup artwork to the device screen, not the browser viewport.
export const iphoneStartupImages = [
  [375, 667, 2], [375, 812, 3], [390, 844, 3], [393, 852, 3],
  [402, 874, 3], [414, 896, 2], [414, 896, 3], [428, 926, 3],
  [430, 932, 3], [440, 956, 3],
].flatMap(([width, height, scale]) =>
  (['light', 'dark'] as const).map(theme => ({
    url: '/pwa/start-' + width * scale + 'x' + height * scale + '-' + theme + '.png',
    media: '(device-width: ' + width + 'px) and (device-height: ' + height + 'px) and (-webkit-device-pixel-ratio: ' + scale + ') and (orientation: portrait) and (prefers-color-scheme: ' + theme + ')',
  })),
)
