import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/extension.ts', 'src/worker.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // `vscode` is provided by the host. OpenChemLib is bundled into `worker.js`, so the packaged
  // extension ships no node_modules (see THIRD_PARTY_NOTICES.md).
  external: ['vscode'],
  sourcemap: false
});
