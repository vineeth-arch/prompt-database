import { defineConfig } from 'vite';

// For GitHub Pages project sites, set base to '/<repo-name>/'.
// Repo: https://github.com/vineeth-arch/prompt-database
export default defineConfig({
  base: '/prompt-database/',
  build: { outDir: 'dist' },
});
