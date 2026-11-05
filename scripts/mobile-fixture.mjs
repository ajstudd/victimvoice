// Fictional loopback-only mobile QA backend. Never deploy or use real credentials.
import http from 'node:http';
import {randomUUID} from 'node:crypto';
const user={id:'00000000-0000-0000-0000-000000000031',aud:'authenticated',role:'authenticated',phone:'+919999999991',app_metadata:{provider:'phone'},user_metadata:{},created_at:new Date().toISOString()};
const token=()=>[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture-signature'].join('.');
const session=()=>({access_token:token(),refresh_token:'local-fixture-refresh',token_type:'bearer',expires_in:3600,user});
const cases=[{id:'10000000-0000-0000-0000-000000000031',user_id:user.id,description:'Fictional QA case: I would like to discuss support options. No real help is needed.',status:'in_progress',created_at:new Date().toISOString(),allow_volunteer_support:false}];
const messages=[{id:randomUUID(),request_id:cases[0].id,sender:'admin',content:'Fictional support reply: you can choose what to share here.',created_at:new Date().toISOString()}];
const evidence=[];const objects=new Map();const contacts=[];
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://localhost:8093');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');res.setHeader('Access-Control-Expose-Headers','Content-Range');res.setHeader('Content-Type','application/json');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1:54324');const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);let args={};try{args=JSON.parse(raw.toString()||'{}');}catch{}
 const send=(value,status=200)=>{res.writeHead(status);res.end(JSON.stringify(value));};
 const caseId=(url.searchParams.get('request_id')||url.searchParams.get('id')||'').replace(/^eq\./,'');
 if(url.pathname==='/auth/v1/otp'){send({});return;}
 if(url.pathname==='/auth/v1/verify'||url.pathname==='/auth/v1/token'){send(session());return;}
 if(url.pathname==='/auth/v1/user'){send(user);return;}
 if(url.pathname==='/auth/v1/logout'){send({});return;}
 if(url.pathname==='/rest/v1/support_requests'){
  if(req.method==='POST'){const row={id:randomUUID(),...args,status:'pending',created_at:new Date().toISOString()};cases.unshift(row);send(row,201);return;}
  const found=caseId?cases.filter(c=>c.id===caseId):cases;
  send((req.headers.accept||'').includes('vnd.pgrst.object')?found[0]:found);return;
 }
 if(url.pathname==='/rest/v1/comments'){
  if(req.method==='POST'){messages.unshift({id:randomUUID(),...args,sender:'user',created_at:new Date().toISOString()});send(null,201);return;}
  send(messages.filter(m=>m.request_id===caseId));return;
 }
 if(url.pathname==='/rest/v1/vv_contacts'){
  if(req.method==='POST'){contacts.push({...args});send(null,201);return;}
  const found=contacts.filter(c=>!url.searchParams.has('id')||c.id===url.searchParams.get('id').slice(3)).filter(c=>!url.searchParams.has('phone')||c.phone===url.searchParams.get('phone').slice(3));
  if(req.method==='DELETE'){for(const row of found){const i=contacts.indexOf(row);if(i>=0)contacts.splice(i,1);}send(null);return;}
  if(req.method==='PATCH'){found.forEach(c=>Object.assign(c,args));send(null);return;}
  send((req.headers.accept||'').includes('vnd.pgrst.object')?(found[0]||null):found);return;
 }
 if(url.pathname.startsWith('/rest/v1/rpc/')){
  const name=url.pathname.split('/').pop();
  if(name==='vv_set_support_consent'){const row=cases.find(c=>c.id===args.p_request_id);if(row)row.allow_volunteer_support=args.p_allowed;send(null);return;}
  if(name==='vv_list_evidence'){send(evidence.filter(e=>e.request_id===args.p_request_id&&e.complete));return;}
  if(name==='vv_add_evidence_link'){evidence.push({id:randomUUID(),request_id:args.p_request_id,label:args.p_label,kind:'link',url:args.p_url,byte_size:0,review_status:'new',created_at:new Date().toISOString(),complete:true});send(null);return;}
  if(name==='vv_reserve_evidence'){const id=randomUUID();const row={id,request_id:args.p_request_id,label:args.p_label,kind:'file',mime_type:args.p_mime,byte_size:args.p_bytes,sha256:args.p_sha256,storage_path:`${args.p_request_id}/${id}`,review_status:'new',created_at:new Date().toISOString()};evidence.push(row);send(row);return;}
  if(name==='vv_finish_evidence'){const row=evidence.find(e=>e.id===args.p_evidence_id);if(row)row.complete=true;send(null);return;}
  if(name==='vv_open_evidence'){send(evidence.find(e=>e.id===args.p_evidence_id));return;}
  if(name==='vv_cancel_evidence'){send(null);return;}
  send({message:`Unsupported fixture operation ${name}`},400);return;
 }
 if(url.pathname.startsWith('/storage/v1/object/')){
  const path=url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/)?case-evidence\//,'');
  if(req.method==='POST'){objects.set(path,{bytes:raw,mime:req.headers['content-type']});send({Key:`case-evidence/${path}`},201);return;}
  const object=objects.get(path);if(!object){send({message:'Not found'},404);return;}
  res.setHeader('Content-Type',object.mime||'application/octet-stream');res.writeHead(200);res.end(object.bytes);return;
 }
 if(url.pathname==='/fixture/reply'&&req.method==='POST'){messages.unshift({id:randomUUID(),request_id:args.request_id||cases[0].id,sender:'admin',content:'Fictional new reply arrived automatically.',created_at:new Date().toISOString()});send({ok:true});return;}
 send({message:'Not a fixture endpoint'},404);
}).listen(54324,'127.0.0.1',()=>console.log('Fictional mobile API on loopback 54324. No real SMS, accounts or cases.'));
