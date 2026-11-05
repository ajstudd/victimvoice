import {validTwilioSignature} from '../../../shared/twilio.ts';
import {createClient} from '@supabase/supabase-js';
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const job=new URL(req.url).searchParams.get('job');if(!job||!/^[a-f0-9-]{36}$/i.test(job))return new Response('Invalid callback',{status:400});
 const secret=Deno.env.get('TWILIO_AUTH_TOKEN');if(!secret)return new Response('Unavailable',{status:503});
 const raw=await req.text();if(raw.length>20000)return new Response('Too large',{status:413});const form=new URLSearchParams(raw);
 const url=`${Deno.env.get('SUPABASE_URL')}/functions/v1/sos-callback?job=${job}`;
 if(!await validTwilioSignature(url,form,secret,req.headers.get('X-Twilio-Signature')||''))return new Response('Unauthorized',{status:401});
 const sid=form.get('MessageSid'),state=form.get('MessageStatus');if(!sid||!/^SM[0-9a-f]{32}$/i.test(sid)||!state)return new Response('Invalid callback',{status:400});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await client.rpc('vv_sos_delivery',{p_job:job,p_sid:sid,p_status:state});
 return new Response(result.error?'Could not record callback':'OK',{status:result.error?500:200});
});
