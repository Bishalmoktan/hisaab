import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hisaab – Fair Expense Sharing',
    short_name: 'Hisaab',
    description: 'App to split expenses exactly the way you want with manual item-based splitting.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1d4ed8',   
    theme_color: '#1d4ed8',       
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/logo-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',           
      },
      {
        src: '/logo-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',      
      },
      {
        src: '/logo-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',       
      },
    ],
  }
}