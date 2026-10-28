const defaultApiUrl = import.meta.env.PROD
  ? 'https://sankara-fashion-hub1.onrender.com'
  : 'http://localhost:3001'

export const API_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/+$/, '')
