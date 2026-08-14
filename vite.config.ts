import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    tailwindcss(),
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(env.VITE_DEV_PORT) || 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        // Laragon serves the backend over HTTPS with a self-signed cert;
        // without this Node/Vite rejects it and every proxied call returns 502.
        secure: false,
      },
    },
  },
  };
})
