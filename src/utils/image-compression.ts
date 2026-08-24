// Client-side image compression and resizing utility using HTML5 Canvas
// Optimizes user avatars and workspace logos into lightweight WebP format (< 100 KB).

export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
  cropToSquare?: boolean
}

/**
 * Resizes and compresses an image File in the browser using HTML5 Canvas.
 * Converts large smartphone/desktop images (e.g. 5MB) into high-quality, lightweight WebP files.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.85,
    mimeType = 'image/webp',
    cropToSquare = true
  } = options

  // If SVG or already very tiny, return as-is
  if (file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = event => {
      const img = new Image()

      img.onload = () => {
        let { width, height } = img

        let sourceX = 0
        let sourceY = 0
        let sourceWidth = width
        let sourceHeight = height

        if (cropToSquare) {
          // Center-crop to 1:1 aspect ratio for avatars and square logos
          const minDim = Math.min(width, height)
          sourceX = (width - minDim) / 2
          sourceY = (height - minDim) / 2
          sourceWidth = minDim
          sourceHeight = minDim

          width = Math.min(minDim, maxWidth)
          height = Math.min(minDim, maxHeight)
        } else {
          // Maintain original aspect ratio within bounds
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          // If canvas context unavailable, fallback to original file
          resolve(file)
          return
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          width,
          height
        )

        canvas.toBlob(
          blob => {
            if (!blob) {
              resolve(file)
              return
            }

            const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || 'avatar'
            const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
            const compressedFile = new File(
              [blob],
              `${fileNameWithoutExt}.${extension}`,
              {
                type: blob.type || mimeType,
                lastModified: Date.now()
              }
            )

            resolve(compressedFile)
          },
          mimeType,
          quality
        )
      }

      img.onerror = () => resolve(file)

      if (typeof event.target?.result === 'string') {
        img.src = event.target.result
      } else {
        resolve(file)
      }
    }

    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
