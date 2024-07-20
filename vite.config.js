import { defineConfig } from 'vite';
import utools from '@qc2168/vite-plugin-utools';
import react from '@vitejs/plugin-react';
import pkg from './package.json';
import electron from 'vite-plugin-electron';
import { rmSync } from 'node:fs';
import { notBundle } from 'vite-plugin-electron/plugin';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var command = _a.command, mode = _a.mode;
    rmSync('dist-electron', { recursive: true, force: true });
    var isServe = command === 'serve';
    var isBuild = command === 'build';
    var isStartElectron = mode === 'electron';
    var sourcemap = isServe || !!process.env.VSCODE_DEBUG;
    return {
        base: './',
        plugins: [react(),
            utools({
                entry: [
                    { entry: 'utools/preload.ts' }
                ],
                hmr: {
                    pluginJsonPath: './plugin.json'
                },
                upx: {
                    pluginJsonPath: './plugin.json',
                }
            }),
            isStartElectron && electron([
                {
                    // Main process entry file of the Electron App.
                    entry: 'electron/main/index.ts',
                    onstart: function (_a) {
                        var startup = _a.startup;
                        if (process.env.VSCODE_DEBUG) {
                            console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App');
                        }
                        else {
                            startup();
                        }
                    },
                    vite: {
                        build: {
                            sourcemap: sourcemap,
                            minify: isBuild,
                            outDir: 'dist-electron/main',
                            rollupOptions: {
                                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons, 
                                // we can use `external` to exclude them to ensure they work correctly.
                                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                                // Of course, this is not absolute, just this way is relatively simple. :)
                                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                            },
                        },
                        plugins: [
                            // This is just an option to improve build performance, it's non-deterministic!
                            // e.g. `import log from 'electron-log'` -> `const log = require('electron-log')`
                            isServe && notBundle(),
                        ],
                    },
                },
                {
                    entry: 'utools/preload.ts',
                    onstart: function (_a) {
                        var reload = _a.reload;
                        // Notify the Renderer process to reload the page when the Preload scripts build is complete,
                        // instead of restarting the entire Electron App.
                        reload();
                    },
                    vite: {
                        build: {
                            sourcemap: sourcemap ? 'inline' : undefined, // #332
                            minify: isBuild,
                            outDir: 'dist-electron/preload',
                            rollupOptions: {
                                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                            },
                        },
                        plugins: [
                            isServe && notBundle(),
                        ],
                    },
                }
            ]),
        ],
        server: {
            host: pkg.env.VITE_DEV_SERVER_HOST,
            port: pkg.env.VITE_DEV_SERVER_PORT,
        },
    };
});
