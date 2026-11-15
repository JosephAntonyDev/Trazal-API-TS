import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Authenticate} from '../src/modules/identity/application/authenticate.js';
import {SyncService} from '../src/modules/sync/application/sync-service.js';
import type {SyncStore} from '../src/modules/sync/application/ports.js';

test('dominio y aplicación no dependen de adaptadores ni frameworks',async()=>{
  async function visit(directory:string):Promise<void>{
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const file=join(directory,entry.name);
      if(entry.isDirectory())await visit(file);
      else if(file.endsWith('.ts')&&/[/\\](domain|application)[/\\]/.test(file)){
        const text=await readFile(file,'utf8');
        for(const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){
          assert.ok(match[1]!.startsWith('.'),file+' importa un framework');
          assert.ok(!match[1]!.includes('adapters'),file+' depende de infraestructura');
        }
        assert.ok(!/\b(Request|Response|fetch|postgres)\b/.test(text),file+' utiliza transporte o SQL');
      }
    }
  }
  await visit('src/modules');await visit('src/shared/domain');
});

test('autenticación rechaza token vacío antes de invocar proveedor',async()=>{
  let calls=0;const useCase=new Authenticate({verify:async()=>{calls++;return 'user';}});
  assert.throws(()=>useCase.execute(''),{code:'authentication_required'});
  assert.equal(calls,0);assert.equal(await useCase.execute('opaque-token'),'user');
});

test('caso de uso rechaza documento inválido antes de abrir transacción',async()=>{
  let transactions=0;
  const store:SyncStore={withAccount:async()=>{transactions++;throw new Error('No debe abrirse');}};
  const useCase=new SyncService(store,{digest:async value=>value});
  await assert.rejects(useCase.put('user','a'.repeat(32),'0','b'.repeat(32),null),{code:'invalid_document'});
  assert.equal(transactions,0);
});
