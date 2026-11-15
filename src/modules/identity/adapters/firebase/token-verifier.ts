import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';
import { ApplicationError } from '../../../../shared/domain/application-error.js';

type Key = Awaited<ReturnType<typeof importX509>>;
const CERTIFICATES = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let keys = new Map<string, Key>();
let expires = 0;
let pending: Promise<void> | undefined;
async function googleKey(kid: string): Promise<Key> {
  if(Date.now() >= expires) {
    pending ??= (async()=>{
      const response=await fetch(CERTIFICATES,{signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new ApplicationError('auth_unavailable','No se pudo verificar la sesión. Intenta más tarde.');
      const certs=await response.json() as Record<string,string>;const imported=new Map<string,Key>();
      for(const [id,certificate] of Object.entries(certs)) imported.set(id,await importX509(certificate,'RS256'));
      keys=imported;
      const age=Number(/max-age=(\d+)/.exec(response.headers.get('cache-control')??'')?.[1]??300);
      expires=Date.now()+Math.max(1,Math.min(age,86400))*1000;
    })().catch(()=>{throw new ApplicationError('auth_unavailable','No se pudo verificar la sesión. Intenta más tarde.');}).finally(()=>{pending=undefined;});
    await pending;
  }
  const key=keys.get(kid);if(!key)throw new ApplicationError('invalid_token','Vuelve a iniciar sesión.');return key;
}
export async function verifyToken(token: string,projectId: string,resolveKey: (kid:string)=>Promise<Key> = googleKey): Promise<string> {
  if(!/^[a-z][a-z0-9-]{4,62}$/.test(projectId))throw new ApplicationError('auth_not_configured','Firebase Auth está pendiente de configurar.');
  try {
    if(!token || token.length>8192)throw new Error('token length');
    const header=decodeProtectedHeader(token);
    if(header.alg!=='RS256'||!header.kid||header.kid.length>256)throw new Error('header');
    const {payload}=await jwtVerify(token,await resolveKey(header.kid),{
      algorithms:['RS256'],audience:projectId,issuer:'https://securetoken.google.com/'+projectId,
      requiredClaims:['sub','iat','exp','auth_time'],clockTolerance:0
    });
    const now=Math.floor(Date.now()/1000);
    if(!payload.sub || payload.sub.length>128 || typeof payload.iat!=='number'||payload.iat>now||typeof payload.auth_time!=='number'||payload.auth_time>now||payload.auth_time<0)
      throw new Error('claims');
    if(payload.email_verified!==true)throw new ApplicationError('email_unverified','Confirma tu correo antes de sincronizar.');
    return payload.sub;
  }catch(error){if(error instanceof ApplicationError&&['auth_unavailable','auth_not_configured','email_unverified'].includes(error.code))throw error;throw new ApplicationError('invalid_token','La sesión no es válida o expiró.');}
}
