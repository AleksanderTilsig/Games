import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({
            pages: 'dist',
            assets: 'dist',
            fallback: null
        }),
        paths: {
            base: '/Games' // must match your repo name (lowercase)
        }
    }
};

export default config;
