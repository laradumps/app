const { buildSync } = require('esbuild');
const { copyFileSync } = require('fs');

const options = {
    platform: 'node',
    bundle: true,
    external: ['electron'],
    define: {
        'process.env.NODE_ENV': `"${process.argv[2] === '--dev' ? 'development' : 'production'}"`,
        'process.platform': `"${process.platform}"`,
    },
};
buildSync({
    entryPoints: ['src/main/main.js'],
    outfile: 'dist/main.js',
    ...options,
});

buildSync({
    entryPoints: ['src/preload/index.js'],
    outfile: 'dist/index.js',
    ...options,
});
copyFileSync('build/icon.png', 'dist/icon.png');
copyFileSync('build/icon.icns', 'dist/icon.icns');
