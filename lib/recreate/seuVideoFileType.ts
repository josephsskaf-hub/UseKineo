/** Local file metadata only. The video reader and server still validate the actual media. */
export function seuVideoContentType(file: { name: string; type: string }): 'video/mp4' | 'video/quicktime' | null {
  const name = file.name.toLowerCase(), type = file.type.toLowerCase()
  if (/\.webm$/.test(name)) return null
  if (type === 'video/mp4' || type === 'video/quicktime') return type
  if (type !== '' && type !== 'application/octet-stream') return null
  if (/\.mp4$/.test(name)) return 'video/mp4'
  if (/\.mov$/.test(name)) return 'video/quicktime'
  return null
}
