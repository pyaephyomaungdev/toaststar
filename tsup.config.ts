import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: false,
  clean: true,
  external: ["react", "react-dom"],
  target: "es2019",
  treeshake: true,
  splitting: false,
  minify: true,
});
