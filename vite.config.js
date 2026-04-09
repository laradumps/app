import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    root: 'src/renderer/',
    base: './',
    plugins: [vue(), tailwindcss()],
    server: {
        port: 4999
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/renderer')
        }
    },
    build: {
        outDir: '../../dist/app/',
        assetsDir: '.',
        emptyOutDir: true,
        rolldownOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (
                            id.includes('vue') ||
                            id.includes('pinia') ||
                            id.includes('vue-router') ||
                            id.includes('vue-i18n')
                        ) {
                            return 'vendor-vue';
                        }
                        if (id.includes('highlight.js') || id.includes('@highlightjs')) {
                            return 'vendor-highlight';
                        }
                        if (id.includes('chart.js')) {
                            return 'vendor-chart';
                        }
                        if (id.includes('dayjs') || id.includes('humanize-duration') || id.includes('sql-formatter')) {
                            return 'vendor-utils';
                        }
                    }
                }
            }
        }
    }
});
