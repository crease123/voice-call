/**
 * Host-face build. The client bundle is built separately by
 * `tsdown.client.config.ts`, because it has its own externals contract.
 */
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  fixedExtension: false,
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: false,
})