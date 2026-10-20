import coastalLook from './1.jpg'
import adminPhoto from './benoo.png'
import occasionLook from './2.jpg'
import streetLook from './images.jpg'

export const editorialImages = {
  hero: occasionLook,
  everyday: coastalLook,
  story: streetLook,
  journalWardrobe: coastalLook,
  journalGettingReady: occasionLook,
  journalCare: streetLook,
  admin: adminPhoto,
}

export const productImageOptions = [
  { value: 'coastal-look', label: 'Coastal look', src: coastalLook },
  { value: 'occasion-look', label: 'Occasion look', src: occasionLook },
  { value: 'street-look', label: 'Street look', src: streetLook },
]

export function getProductImage(image) {
  if (image?.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${image}`
  }
  return productImageOptions.find((option) => option.value === image)?.src ?? productImageOptions[0].src
}
