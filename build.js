const { buildSync } = require("esbuild");
const { copyFileSync } = require("fs");
const options = {
    platform: "node",
    bundle: true,
    external: ["electron"],
    define: {
        "process.env.NODE_ENV": `"${process.argv[2] === "--dev" ? "development" : "production"}"`,
        "process.platform": `"${process.platform}"`
    }
};
buildSync({
    entryPoints: ["src/main/main.ts"],
    outfile: "dist/main.js",
    ...options,
    minify: process.argv[2] !== "--dev"
});
buildSync({
    entryPoints: ["src/preload/preload.js"],
    outfile: "dist/preload.js",
    ...options
});
buildSync({
    entryPoints: ["src/preload/global-ipc-renderer.js"],
    outfile: "dist/global-ipc-renderer.js",
    ...options
});
copyFileSync("build/icon.png", "dist/icon.png");
copyFileSync("build/icon.icns", "dist/icon.icns");
copyFileSync("src/renderer/coffee.html", "dist/app/coffee.html");
