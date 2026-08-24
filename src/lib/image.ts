export async function prepareImage(source: File | Blob, rotationDeg: number, maxDim = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const swap = rotationDeg % 180 !== 0;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const drawW = bitmap.width * scale;
  const drawH = bitmap.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? drawH : drawW;
  canvas.height = swap ? drawW : drawH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))), 'image/jpeg', 0.9);
  });
}
