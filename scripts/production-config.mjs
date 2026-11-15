import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export function productionConfig(base, env) {
  const id = env.HYPERDRIVE_ID?.trim();
  if (!/^[a-f0-9]{32}$/i.test(id ?? '')) throw new Error('Configura HYPERDRIVE_ID (32 caracteres hexadecimales) en Settings → Build → Variables.');
  const project = env.FIREBASE_PROJECT_ID?.trim() || 'trazal-773ba';
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(project)) throw new Error('FIREBASE_PROJECT_ID no es válido.');
  return {...base, workers_dev: true, preview_urls: false,
    vars: {FIREBASE_PROJECT_ID: project},
    hyperdrive: [{binding: 'HYPERDRIVE', id}]};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Base is deliberately JSON-compatible. No credentials are copied from the build environment.
  const base = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  const result = productionConfig(base, process.env);
  await writeFile(new URL('../wrangler.production.jsonc', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log('Configuración de producción generada: trazal-api / Firebase / HYPERDRIVE.');
}
