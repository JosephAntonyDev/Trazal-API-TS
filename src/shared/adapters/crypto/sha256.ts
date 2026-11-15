import type { Fingerprint } from '../../../modules/sync/application/ports.js';
export const sha256: Fingerprint = {
  async digest(value) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  }
};
