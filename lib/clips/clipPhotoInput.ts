export type ClipPhotoProblem = 'aspect' | 'unreadable'

export function clipPhotoDimensionsProblem(size: { width: number; height: number } | null, limitAspect = true): ClipPhotoProblem | null {
  if (!size || !size.width || !size.height) return 'unreadable'
  const { width, height } = size
  return limitAspect && (width * 5 < height * 2 || width * 2 > height * 5) ? 'aspect' : null
}

export async function clipPhotoProblem(file: File, limitAspect = true): Promise<ClipPhotoProblem | null> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const { naturalWidth: width, naturalHeight: height } = image
    return clipPhotoDimensionsProblem({ width, height }, limitAspect)
  } catch {
    return 'unreadable'
  } finally {
    URL.revokeObjectURL(url)
  }
}
