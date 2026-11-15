import {test} from 'node:test';
import assert from 'node:assert/strict';
// Deployment tooling is JavaScript and independent of the Worker runtime.
// @ts-expect-error no declarations required for the build script
import {productionConfig} from '../scripts/production-config.mjs';

test('production config requires explicit Hyperdrive and preserves runtime/cron', () => {
  assert.throws(() => productionConfig({}, {}), /HYPERDRIVE_ID/);
  assert.throws(() => productionConfig({}, {HYPERDRIVE_ID: 'bad'}), /HYPERDRIVE_ID/);
  const base = {name:'trazal-api', main:'src/worker.ts', compatibility_flags:['nodejs_compat'], triggers:{crons:['17 * * * *']}};
  const result = productionConfig(base, {HYPERDRIVE_ID:'a'.repeat(32), DATABASE_URL:'private', CLOUDFLARE_API_TOKEN:'private'});
  assert.deepEqual(result.triggers, base.triggers);
  assert.equal(result.main, base.main);
  assert.equal(result.workers_dev, true);
  assert.equal(result.preview_urls, false);
  assert.deepEqual(result.hyperdrive,[{binding:'HYPERDRIVE',id:'a'.repeat(32)}]);
  assert.deepEqual(result.vars, {FIREBASE_PROJECT_ID:'trazal-773ba'});
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.throws(() => productionConfig(base, {HYPERDRIVE_ID:'a'.repeat(32), FIREBASE_PROJECT_ID:'https://wrong'}), /FIREBASE_PROJECT_ID/);
});
