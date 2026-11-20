import { defineConfig } from 'vite';

// Relative Verweise: die gebaute Seite laeuft aus jedem Unterpfad (z. B. GitHub Pages unter /<repo>/).
export default defineConfig({
  base: './',
});
