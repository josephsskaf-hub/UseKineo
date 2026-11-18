export type ClipPhotoProblem = 'aspect' | 'unreadable'

export async function clipPhotoProblem(file: File): Promise<ClipPhotoProblem | null> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const { naturalWidth: width, naturalHeight: height } = image
    if (!width || !height) return 'unreadable'

    // The provider accepts 0.4–2.5 inclusive. Check the final upload bytes,
    // after any resize or letterbox crop, so we use the same dimensions it sees.
    return width * 5 < height * 2 || width * 2 > height * 5 ? 'aspect' : null
  } catch {
    return 'unreadable'
  } finally {
    URL.revokeObjectURL(url)
  }
}
