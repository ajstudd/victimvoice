import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seal,unseal} from '../src/lib/cipher.ts';
const key=new Uint8Array(32).fill(7),nonce=new Uint8Array(12).fill(8);
test('encrypted vault round-trips multilingual text without storing it in plaintext',()=>{
 const value='मेरी निजी बात — private note';const raw=seal(key,nonce,'vault.a',value);
 assert.equal(unseal(key,'vault.a',raw),value);assert.equal(raw.includes('private note'),false);
});
test('encryption binds data to the account namespace',()=>{
 const raw=seal(key,nonce,'vault.a','private');assert.throws(()=>unseal(key,'vault.b',raw));
});
test('changed ciphertext or wrong device key cannot open the vault',()=>{
 const raw=seal(key,nonce,'vault.a','private');assert.throws(()=>unseal(new Uint8Array(32).fill(1),'vault.a',raw));
 const data=JSON.parse(raw);data.data=(data.data[0]==='a'?'b':'a')+data.data.slice(1);assert.throws(()=>unseal(key,'vault.a',JSON.stringify(data)));
});
