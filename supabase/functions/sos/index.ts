import {sendTwilio,responderPushPayload} from '../../../shared/twilio.ts';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {isUuid,validateSosContacts,freshSosLocation,sosText,canFallback,PILOT_REGIONS} from '../../../shared/sos.ts';
const base=Deno.env.get('SUPABASE_URL')!;
const service=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const relayEnabled=()=>Deno.env.get('VV_ENABLE_SMS_RELAY')==='true'&&/^AC[0-9a-f]{32}$/i.test(Deno.env.get('TWILIO_ACCOUNT_SID')||'')&&Boolean(Deno.env.get('TWILIO_AUTH_TOKEN'))&&(/^MG[0-9a-f]{32}$/i.test(Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')||'')||/^\+[1-9][0-9]{7,14}$/.test(Deno.env.get('TWILIO_FROM_NUMBER')||''));
const pushEnabled=()=>Deno.env.get('VV_ENABLE_RESPONDER_PUSH')==='true';
function headers(req:Request){const origin=req.headers.get('origin')||'';const allowed=(Deno.env.get('VV_WEB_ORIGINS')||'http://127.0.0.1:3000,http://localhost:3000,http://localhost:8092').split(',');return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-sos-worker-key','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};}
function reply(req:Request,value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:headers(req)});}
function equal(a:string,b:string){if(a.length!==b.length)return false;let out=0;for(let i=0;i<a.length;i++)out|=a.charCodeAt(i)^b.charCodeAt(i);return out===0;}
type Job={job_id:string;event_id:string;contact_id:string;phone:string;alias:string;callback:string|null;latitude:number|null;longitude:number|null;position_at:string;tokens:string[]};
async function rpc<T=unknown>(client:SupabaseClient,name:string,args:Record<string,unknown>={}){const result=await client.rpc(name,args);if(result.error)throw new Error(result.error.message);return result.data as T;}
async function finish(job:Job,state:string,provider:string|null=null,error:string|null=null){await rpc(service,'vv_sos_finish_job',{p_job:job.job_id,p_state:state,p_provider:provider,p_error:error});}
async function work(kind:'sms'|'push'){
 if(kind==='sms'?!relayEnabled():!pushEnabled())return;
 for(let n=0;n<5;n++){
  const job=await rpc<Job|null>(service,'vv_sos_claim_job',{p_kind:kind});if(!job)return;
  try{
   if(kind==='sms'){
    const result=await sendTwilio({accountSid:Deno.env.get('TWILIO_ACCOUNT_SID')!,authToken:Deno.env.get('TWILIO_AUTH_TOKEN')!,messagingServiceSid:Deno.env.get('TWILIO_MESSAGING_SERVICE_SID'),from:Deno.env.get('TWILIO_FROM_NUMBER'),to:job.phone,body:sosText(job.event_id,job.alias,job.latitude==null||job.longitude==null?null:{latitude:job.latitude,longitude:job.longitude,timestamp:Date.parse(job.position_at),accuracy:null},false,job.callback||undefined),callback:`${base}/functions/v1/sos-callback?job=${job.job_id}`});
    await finish(job,result.state,result.sid,result.error);
   }else{
    const tokens=job.tokens as string[];if(!tokens.length){await finish(job,'failed',null,'no_registered_device');continue;}
    // Opaque reference only. Recipient must authenticate and accept before precise details.
    const messages=tokens.slice(0,3).map(to=>responderPushPayload(to,job.event_id));
    const token=Deno.env.get('EXPO_ACCESS_TOKEN');
    const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(messages),signal:AbortSignal.timeout(15000)});
    const value=await response.json();const receipts=Array.isArray(value.data)?value.data:[];
    const accepted=receipts.some((r:{status:string})=>r.status==='ok');
    await finish(job,accepted?'accepted':'failed',JSON.stringify(receipts.filter((r:{id?:string})=>r.id).map((r:{id:string})=>r.id)),'push_receipt_is_handoff_only');
   }
  }catch{await finish(job,'unknown',null,'network_or_worker_uncertainty');}
 }
}
async function cleanExpiredMedia(){
 const paths=await rpc<string[]>(service,'vv2_expired_media');
 if(paths.length){const result=await service.storage.from('incident-evidence').remove(paths);if(result.error)throw result.error;}
 await rpc(service,'vv_sos_cleanup');
}
async function drain(){await Promise.allSettled([work('sms'),work('push'),cleanExpiredMedia()]);}
declare const EdgeRuntime:{waitUntil:(task:Promise<unknown>)=>void};
function background(){const task=drain();if(typeof EdgeRuntime!=='undefined')EdgeRuntime.waitUntil(task);else void task;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method==='GET')return reply(req,{relay:relayEnabled(),push:pushEnabled(),regions:PILOT_REGIONS});
 if(req.method!=='POST')return reply(req,{error:'Method not allowed'},405);
 if(Number(req.headers.get('content-length')||0)>20000)return reply(req,{error:'Request too large'},413);
 try{
  const raw=await req.text();if(raw.length>20000)return reply(req,{error:'Request too large'},413);const args=JSON.parse(raw);
  const worker=Deno.env.get('VV_SOS_WORKER_SECRET')||'';
  if(args.action==='drain'){
   if(worker.length<32||!equal(req.headers.get('x-sos-worker-key')||'',worker))return reply(req,{error:'Unauthorized'},401);
   await drain();return reply(req,{ok:true});
  }
  const authorization=req.headers.get('Authorization')||'';if(!authorization.startsWith('Bearer '))return reply(req,{error:'Sign in required'},401);
  const client=createClient(base,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const user=await client.auth.getUser(authorization.slice(7));if(user.error||!user.data.user||user.data.user.is_anonymous)return reply(req,{error:'Sign in required'},401);
  if(args.action==='start'){
   if(!isUuid(args.id)||typeof args.alias!=='string'||!args.alias.trim()||args.alias.length>60||!PILOT_REGIONS.some(r=>r.id===args.region))throw Error('Invalid incident details');
   const contacts=validateSosContacts(args.contacts),location=freshSosLocation(args.location);
   await rpc(client,'vv_sos_start',{p_id:args.id,p_alias:args.alias,p_contacts:contacts,p_region:args.region,p_relay:args.relay===true&&relayEnabled(),p_volunteers:args.volunteers===true&&pushEnabled(),p_police:args.police===true&&pushEnabled(),p_location:location,p_callback:args.callback||null});
   background();return reply(req,{id:args.id,relay:relayEnabled(),push:pushEnabled()});
  }
  if(args.action==='native'){
   if(!isUuid(args.id)||!isUuid(args.contactId)||!['submitted','sent','delivered','failed','unknown','unavailable'].includes(args.status))throw Error('Invalid native result');
   await rpc(client,'vv_sos_native_result',{p_id:args.id,p_contact:args.contactId,p_state:args.status,p_fallback:canFallback({status:args.status,fallbackAllowed:args.fallbackAllowed===true})&&relayEnabled()});
   background();return reply(req,{ok:true,relay:relayEnabled()});
  }
  return reply(req,{error:'Unknown action'},400);
 }catch(e){const message=e instanceof Error?e.message:'Could not process SOS';return reply(req,{error:message},400);}
});
