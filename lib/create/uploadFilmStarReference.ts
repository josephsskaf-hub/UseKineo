/** Shared by the two Film composers. The server checks rights and owns the returned path. */
export async function uploadFilmStarReference(file: File, errorMessage: string): Promise<string> {
  let blob: Blob = file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    blob = (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))) ?? file
  } catch {}
  const form = new FormData()
  form.append('file', blob, blob === file ? file.name : 'reference.jpg')
  form.append('rights', 'true')
  const res = await fetch('/api/images/reference', { method: 'POST', body: form })
  const data = await res.json().catch(() => null)
  if (!res.ok || typeof data?.path !== 'string') throw new Error(typeof data?.error === 'string' ? data.error : errorMessage)
  return data.path
}
