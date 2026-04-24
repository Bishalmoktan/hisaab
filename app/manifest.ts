import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hisaab – Fair Expense Sharing',
    short_name: 'Hisaab',
    description: 'App to split expenses exactly the way you want with manual item-based splitting.',
    start_url: '/',
    display: 'standalone',
    background_color: '',
    theme_color: '#000000',
    icons: [
      {
        src: '/logo-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}