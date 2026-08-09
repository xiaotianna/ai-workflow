import babel from '@rolldown/plugin-babel'
import mdx from 'fumadocs-mdx/vite'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [mdx(), react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })],
  optimizeDeps: {
    include: ['react-router'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
