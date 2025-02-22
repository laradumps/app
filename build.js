import { buildSync } from "esbuild";
import { copyFileSync } from "fs";

const options = {
    platform: "node",
    bundle: true,
    target: "node20",
    external: ["electron", "cpu-features"],
    define: {
        "process.env.NODE_ENV": `"${process.argv[2] === "--dev" ? "development" : "production"}"`,
        "process.platform": `"${process.platform}"`
    },
    loader: {
        ".node": "file"
    }
};
buildSync({
    entryPoints: ["src/main/main.ts"],
    outfile: "dist/main.cjs",
    ...options,
    minify: process.argv[2] !== "--dev"
});
buildSync({
    entryPoints: ["src/preload/preload.js"],
    outfile: "dist/preload.cjs",
    ...options
});
buildSync({
    entryPoints: ["src/preload/global-ipc-renderer.js"],
    outfile: "dist/global-ipc-renderer.cjs",
    ...options
});

copyFileSync("build/icon.png", "dist/icon.png");
copyFileSync("build/icon.icns", "dist/icon.icns");
