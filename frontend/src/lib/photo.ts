// Фото с телефона весит 3–8 МБ: перед загрузкой уменьшаем до 1280px по длинной стороне (JPEG ~150–300 КБ).
export async function shrinkPhoto(file: File, max = 1280): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не удалось обработать фото'))), 'image/jpeg', 0.82),
    );
  } catch {
    throw new Error('Не удалось открыть фото — выберите JPEG или PNG');
  } finally {
    URL.revokeObjectURL(url);
  }
}
