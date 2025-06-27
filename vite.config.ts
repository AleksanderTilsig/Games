import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    base: "/Games/", // must match your repo name (lowercase)
    build: {
        outDir: 'dist'
    }
})