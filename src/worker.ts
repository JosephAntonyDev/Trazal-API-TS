// Composition root: wire adapters here, never inside the application or domain.
import { connect } from './shared/adapters/postgres/database.js';
import { sha256 } from './shared/adapters/crypto/sha256.js';
import { Authenticate } from './modules/identity/application/authenticate.js';
import { verifyToken } from './modules/identity/adapters/firebase/token-verifier.js';
import { PostgresSyncStore } from './modules/sync/adapters/postgres/sync-store.js';
import { createHandler, type Env, type Context } from './adapters/http/handler.js';
import { ApiError } from './adapters/http/api-error.js';
export { createHandler } from './adapters/http/handler.js';
function connectionFor(env:Env) {
  const uri=env.HYPERDRIVE?.connectionString??env.DATABASE_URL;
  if(!uri)throw new ApiError(503,'database_not_configured','PostgreSQL está pendiente de configurar.');
  return connect(uri);
}
export default {
  fetch:createHandler({
    auth:(request,project)=>{
      const authorization=request.headers.get('authorization')??'';
      const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
      return new Authenticate({verify:value=>verifyToken(value,project)}).execute(token);
    },
    repository:env=>{const connection=connectionFor(env);return {store:new PostgresSyncStore(connection.database),close:connection.close};},
    fingerprint:sha256
  }),
  async scheduled(_event:unknown,env:Env,ctx:Context) {
    const connection=connectionFor(env);
    try {await connection.database.query("DELETE FROM sync_requests WHERE ctid IN (SELECT ctid FROM sync_requests WHERE created_at < now()-interval '30 days' ORDER BY created_at LIMIT 1000)");}
    finally {ctx.waitUntil(connection.close());}
  }
};
