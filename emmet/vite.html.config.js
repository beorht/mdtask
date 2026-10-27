import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Клиент практических работ предмета «Web-разработка: HTML» — отдельная сборка из тех же компонентов, что тренажёр
// Emmet: один JS и один CSS в public/vendor/html-course/ (подключает src/views/html-course/practice.ejs).
export default defineConfig({
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('../public/vendor/html-course/', import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      input: fileURLToPath(new URL('./src/html/main.js', import.meta.url)),
      output: {
        entryFileNames: 'html-course.js',
        assetFileNames: 'html-course[extname]',
        codeSplitting: false,
      },
    },
  },
});
