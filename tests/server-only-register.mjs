import Module, { createRequire, register } from "node:module";

// Test process only: permit isolated server modules without changing application boundaries.
register("./server-only-loader.mjs", import.meta.url);
const require = createRequire(import.meta.url);
const markerPath = require.resolve("server-only");
const marker = new Module(markerPath);
marker.exports = {};
marker.loaded = true;
require.cache[markerPath] = marker;
require.extensions[".css"] = (module) => { module.exports = {}; };
