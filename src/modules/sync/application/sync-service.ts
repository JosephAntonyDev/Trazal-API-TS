import { ApplicationError } from '../../../shared/domain/application-error.js';
import { canonical, validateDocument, validateTransition } from '../domain/work-document.js';
import type { Fingerprint, SyncStore } from './ports.js';

export class SyncService {
  constructor(private store: SyncStore, private fingerprint: Fingerprint) {}

  me(uid: string) { return this.store.withAccount(uid, async () => ({ uid })); }

  changes(uid: string, cursor: string) {
    return this.store.withAccount(uid, async transaction => {
      const rows = await transaction.changes(cursor);
      const changes = rows.slice(0, 100);
      return { changes, nextCursor: changes.at(-1)?.revision ?? cursor, hasMore: rows.length > 100 };
    });
  }

  get(uid: string, id: string) {
    return this.store.withAccount(uid, async transaction => {
      const work = await transaction.findWork(id);
      if (!work) throw new ApplicationError('work_not_found', 'No se encontró esta obra en tu cuenta.');
      return work;
    });
  }

  async put(uid: string, id: string, expected: string, requestId: string, input: unknown) {
    const document = validateDocument(input, id);
    const fingerprint = await this.fingerprint.digest(id + '\n' + expected + '\n' + canonical(document));
    return this.store.withAccount(uid, async transaction => {
      const receipt = await transaction.findReceipt(requestId);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint)
          throw new ApplicationError('idempotency_mismatch', 'No se puede reutilizar una solicitud con otros datos.');
        return { revision: receipt.revision };
      }
      const current = await transaction.findWork(id);
      if ((current?.revision ?? '0') !== expected)
        throw new ApplicationError('revision_conflict', 'La obra cambió en otro equipo. Se conservaron tus cambios.', current?.revision ?? '0');
      if (current) validateTransition(current.document, document);
      else if (await transaction.countWorks() >= 100)
        throw new ApplicationError('work_quota', 'El piloto admite hasta 100 obras sincronizadas por cuenta. Tus obras locales se conservan.');
      const revision = await transaction.nextRevision();
      await transaction.save(id, revision, document, requestId, fingerprint);
      return { revision };
    });
  }
}
