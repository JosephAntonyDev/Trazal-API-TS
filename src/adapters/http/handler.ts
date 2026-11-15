import { id, MAX_BODY } from '../../modules/sync/domain/work-document.js';
import { SyncService } from '../../modules/sync/application/sync-service.js';
import type { SyncStore, Fingerprint } from '../../modules/sync/application/ports.js';
import { ApplicationError } from '../../shared/domain/application-error.js';
import { ApiError, statusFor } from './api-error.js';
export interface Env { FIREBASE_PROJECT_ID?: string; HYPERDRIVE?: {connectionString:string}; DATABASE_URL?: string; ALLOWED_ORIGINS?: string }
export interface Context { waitUntil(promise:Promise<unknown>):void }
interface Dependencies { auth:(request:Request,project:string)=>Promise<string>; repository:(env:Env)=>{store:SyncStore;close:()=>Promise<unknown>}; fingerprint:Fingerprint }
function revision(value:string) { if(!/^(0|[1-9][0-9]{0,18})$/.test(value)||BigInt(value)>9223372036854775807n)throw new ApiError(400,'invalid_revision','Revisión inválida.');return value; }
async function body(request:Request):Promise<unknown> {
  if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')throw new ApiError(415,'content_type','Usa application/json.');
  if(Number(request.headers.get('content-length'))>MAX_BODY)throw new ApiError(413,'work_too_large','Esta obra excede 512 KiB; se conserva localmente.');
  const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'empty_body','Documento vacío.');
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BODY){await reader.cancel();throw new ApiError(413,'work_too_large','Esta obra excede 512 KiB; se conserva localmente.');}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new ApiError(400,'invalid_json','JSON inválido.');}
}
export function createHandler(dependencies:Dependencies) {
  return async(request:Request,env:Env,ctx:Context):Promise<Response>=>{
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-request-id':crypto.randomUUID()});
    const origin=request.headers.get('origin');let connection:ReturnType<Dependencies['repository']>|undefined;
    const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
    try {
      if(origin){const allowed=(env.ALLOWED_ORIGINS??'').split(',').map(x=>x.trim());if(!allowed.includes(origin))throw new ApiError(403,'origin_denied','Origen no permitido.');headers.set('access-control-allow-origin',origin);headers.set('vary','Origin');headers.set('access-control-expose-headers','ETag, X-Request-Id');}
      if(request.method==='OPTIONS'){headers.set('access-control-allow-methods','GET, PUT, OPTIONS');headers.set('access-control-allow-headers','Authorization, Content-Type, If-Match, Idempotency-Key');return new Response(null,{status:204,headers});}
      const url=new URL(request.url);
      if(url.pathname==='/health'&&request.method==='GET')return json({service:'trazal-api',version:'0.6.0'});
      if(!env.FIREBASE_PROJECT_ID)throw new ApiError(503,'auth_not_configured','Firebase Auth está pendiente de configurar.');
      const uid=await dependencies.auth(request,env.FIREBASE_PROJECT_ID);
      if(!['GET','PUT'].includes(request.method))throw new ApiError(405,'method_not_allowed','Método no permitido.');
      const match=/^\/v1\/works\/([0-9a-f]{32})$/.exec(url.pathname);
      if(!match&&url.pathname!=='/v1/me'&&url.pathname!=='/v1/sync/changes')throw new ApiError(404,'not_found','Ruta no encontrada.');
      // Bound and parse the input here. The use case validates it before any database query.
      let document:unknown;let expected='0';let requestId='';
      if(request.method==='PUT'){
        if(!match)throw new ApiError(405,'method_not_allowed','Método no permitido.');
        const tag=request.headers.get('if-match');if(!tag||!/^"\d+"$/.test(tag))throw new ApiError(428,'revision_required','Se requiere If-Match con la revisión conocida.');
        expected=revision(tag.slice(1,-1));requestId=id(request.headers.get('idempotency-key'));document=await body(request);
      }
      const cursor=url.pathname==='/v1/sync/changes'?revision(url.searchParams.get('cursor')??'0'):'0';
      connection=dependencies.repository(env);const repo=new SyncService(connection.store,dependencies.fingerprint);
      if(url.pathname==='/v1/me')return json(await repo.me(uid));
      if(url.pathname==='/v1/sync/changes')return json(await repo.changes(uid,cursor));
      const result=request.method==='PUT'?await repo.put(uid,match![1]!,expected,requestId,document):await repo.get(uid,match![1]!);
      headers.set('etag','"'+result.revision+'"');return json(result);
    }catch(error){
      if(error instanceof ApplicationError){const status=statusFor(error);if(status===429)headers.set('retry-after','60');return json({error:{code:error.code,message:error.message,...(error.revision===undefined?{}:{revision:error.revision})}},status);}
      // Never return/log tokens, SQL, connection strings or customer documents.
      return json({error:{code:'service_unavailable',message:'No se pudo completar la sincronización. Tus datos locales siguen disponibles.'}},503);
    }finally{if(connection)ctx.waitUntil(connection.close());}
  };
}
