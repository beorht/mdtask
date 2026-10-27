import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Клиент тренажёра — один JS и один CSS без хешей в именах: их подключает шаблон mdtask
// src/views/emmet/index.ejs. Сборка — scripts/vendor/emmet.sh, результат лежит в git (как Pyodide и CodeMirror).
export default defineConfig({
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('../public/vendor/emmet/', import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      input: fileURLToPath(new URL('./src/main.js', import.meta.url)),
      output: {
        entryFileNames: 'emmet.js',
        assetFileNames: 'emmet[extname]',
        codeSplitting: false,
      },
    },
  },
});
