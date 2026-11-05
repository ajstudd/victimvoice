import {gcm} from '@noble/ciphers/aes.js';
import {bytesToHex,hexToBytes} from '@noble/ciphers/utils.js';
export function seal(key:Uint8Array,nonce:Uint8Array,name:string,value:string){
 const data=gcm(key,nonce,new TextEncoder().encode(name)).encrypt(new TextEncoder().encode(value));
 return JSON.stringify({version:1,nonce:bytesToHex(nonce),data:bytesToHex(data)});
}
export function unseal(key:Uint8Array,name:string,raw:string){
 const data=JSON.parse(raw);
 if(data.version!==1)throw new Error('Unsupported encrypted storage format');
 return new TextDecoder().decode(gcm(key,hexToBytes(data.nonce),new TextEncoder().encode(name)).decrypt(hexToBytes(data.data)));
}
