export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * 根據使用者在 Cropper 中選取的座標與縮放區域，使用 HTML5 Canvas 裁切並輸出 128x128 圓形 WebP/PNG Base64
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = 128
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('無法建立 Canvas 繪圖環境！');
  }

  // 繪製裁切區域並縮放至 outputSize x outputSize
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  // 優先使用 WebP 輸出（體積小無損），若不支援則退回 PNG
  let dataUrl = canvas.toDataURL('image/webp', 0.92);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/png');
  }

  return dataUrl;
}
