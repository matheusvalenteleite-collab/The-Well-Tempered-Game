// D540: the dev server for tools/playback/cpu/*.mjs: no hot reload (an edit elsewhere never reloads the page mid-measurement).
import { defineConfig, mergeConfig } from "vite";
import base from "../../../vite.config.ts";
export default defineConfig((env) => mergeConfig((base as (e: typeof env) => object)(env), { server: { hmr: false, watch: null } }));
