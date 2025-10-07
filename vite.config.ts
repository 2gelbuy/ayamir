import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const publicDir = resolve(__dirname, 'public');
        const srcDir = resolve(__dirname, 'src');

        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        try {
          copyFileSync(
            resolve(publicDir, 'manifest.json'),
            resolve(distDir, 'manifest.json')
          );
          console.log('Copied manifest.json to dist');
        } catch (error) {
          console.error('Error copying manifest:', error);
        }

        try {
          copyFileSync(
            resolve(srcDir, 'content.css'),
            resolve(distDir, 'content.css')
          );
          console.log('Copied content.css to dist');
        } catch (error) {
          console.error('Error copying content.css:', error);
        }
        
        try {
          copyFileSync(
            resolve(publicDir, 'options.html'),
            resolve(distDir, 'options.html')
          );
          console.log('Copied options.html to dist');
        } catch (error) {
          console.error('Error copying options.html:', error);
        }
        
        try {
          copyFileSync(
            resolve(publicDir, 'options.js'),
            resolve(distDir, 'options.js')
          );
          console.log('Copied options.js to dist');
        } catch (error) {
          console.error('Error copying options.js:', error);
        }
        
        try {
          copyFileSync(
            resolve(publicDir, 'popup.html'),
            resolve(distDir, 'popup.html')
          );
          console.log('Copied popup.html to dist');
        } catch (error) {
          console.error('Error copying popup.html:', error);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        popup: resolve(__dirname, 'public/popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        edgePanel: resolve(__dirname, 'src/edgePanel.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'edgePanel') return 'edgePanel.js';
          if (chunkInfo.name === 'popup') return 'assets/popup-[hash].js';
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'content.css') return 'content.css';
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
});
