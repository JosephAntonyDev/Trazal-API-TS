import type { WorkDocument } from '../domain/work-document.js';

export interface StoredWork { revision: string; document: WorkDocument }
export interface Receipt { fingerprint: string; revision: string }
export interface Change { id: string; revision: string }

// Every callback runs in one account-scoped transaction, including its cursor and receipt.
export interface WorkTransaction {
  findWork(id: string): Promise<StoredWork | undefined>;
  findReceipt(requestId: string): Promise<Receipt | undefined>;
  countWorks(): Promise<number>;
  nextRevision(): Promise<string>;
  save(id: string, revision: string, document: WorkDocument, requestId: string, fingerprint: string): Promise<void>;
  changes(cursor: string): Promise<Change[]>;
}
export interface SyncStore {
  withAccount<T>(uid: string, operation: (transaction: WorkTransaction) => Promise<T>): Promise<T>;
}
export interface Fingerprint { digest(value: string): Promise<string> }
