// Zmniejsza zdjęcie i zapisuje jako JPEG. Ponowne zakodowanie usuwa metadane (w tym lokalizację GPS).
export async function resizeToJpeg(file: File, maxSide = 1024, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Nie można odczytać zdjęcia'))
      i.src = url
    })

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Brak obsługi canvas')
    ctx.drawImage(img, 0, 0, w, h)

    let q = quality
    let data = canvas.toDataURL('image/jpeg', q)
    while (data.length > 400_000 && q > 0.4) {
      q -= 0.1
      data = canvas.toDataURL('image/jpeg', q)
    }
    return data
  } finally {
    URL.revokeObjectURL(url)
  }
}