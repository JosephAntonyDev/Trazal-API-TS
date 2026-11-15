import type { Database } from '../../../../shared/adapters/postgres/database.js';
import { ApplicationError } from '../../../../shared/domain/application-error.js';
import type { SyncStore, WorkTransaction, StoredWork, Receipt, Change } from '../../application/ports.js';

export class PostgresSyncStore implements SyncStore {
  constructor(private db: Database) {}

  withAccount<T>(uid: string, operation: (transaction: WorkTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async tx => {
      await tx.query('INSERT INTO accounts(uid) VALUES($1) ON CONFLICT DO NOTHING', [uid]);
      // The lock serializes all committed revisions for this account.
      const [account] = await tx.query<{ disabled: boolean; request_count: number; age: number }>(
        'SELECT disabled,request_count,extract(epoch from now()-request_window)::float8 AS age FROM accounts WHERE uid=$1 FOR UPDATE', [uid]);
      if (!account || account.disabled) throw new ApplicationError('account_disabled', 'La cuenta no tiene acceso a sincronización.');
      if (account.age < 60 && account.request_count >= 120) throw new ApplicationError('rate_limit', 'Espera un minuto antes de sincronizar otra vez.');
      await tx.query("UPDATE accounts SET request_count=CASE WHEN now()-request_window >= interval '60 seconds' THEN 1 ELSE request_count+1 END, request_window=CASE WHEN now()-request_window >= interval '60 seconds' THEN now() ELSE request_window END WHERE uid=$1", [uid]);
      return operation(this.transaction(tx, uid));
    });
  }

  private transaction(tx: Database, uid: string): WorkTransaction {
    return {
      findWork: async id => (await tx.query<StoredWork & Record<string, unknown>>(
        'SELECT revision::text,document FROM works WHERE owner_uid=$1 AND id=$2', [uid, id]))[0],
      findReceipt: async requestId => (await tx.query<Receipt & Record<string, unknown>>(
        'SELECT fingerprint,revision::text FROM sync_requests WHERE owner_uid=$1 AND request_id=$2', [uid, requestId]))[0],
      countWorks: async () => (await tx.query<{ total: number }>('SELECT count(*)::integer AS total FROM works WHERE owner_uid=$1', [uid]))[0]!.total,
      nextRevision: async () => (await tx.query<{ revision: string }>('UPDATE accounts SET clock=clock+1 WHERE uid=$1 RETURNING clock::text AS revision', [uid]))[0]!.revision,
      save: async (id, revision, document, requestId, fingerprint) => {
        await tx.query('INSERT INTO works(owner_uid,id,revision,document) VALUES($1,$2,$3::bigint,$4::jsonb) ON CONFLICT(owner_uid,id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_at=now()', [uid, id, revision, JSON.stringify(document)]);
        await tx.query('INSERT INTO sync_requests(owner_uid,request_id,fingerprint,revision) VALUES($1,$2,$3,$4::bigint)', [uid, requestId, fingerprint, revision]);
      },
      changes: cursor => tx.query<Change & Record<string, unknown>>('SELECT id,revision::text FROM works WHERE owner_uid=$1 AND revision>$2::bigint ORDER BY revision LIMIT 101', [uid, cursor])
    };
  }
}
