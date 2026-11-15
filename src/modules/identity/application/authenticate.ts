import { ApplicationError } from '../../../shared/domain/application-error.js';

export interface TokenVerifier { verify(token: string): Promise<string> }
export class Authenticate {
  constructor(private verifier: TokenVerifier) {}
  execute(token: string) {
    if (!token || token.length > 8192)
      throw new ApplicationError('authentication_required', 'Inicia sesión para sincronizar.');
    return this.verifier.verify(token);
  }
}
