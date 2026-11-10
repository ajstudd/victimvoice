// Local visual QA only. Run on loopback; never point production at this server.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import { createHash } from 'node:crypto';
const owner='00000000-0000-0000-0000-000000000021';
const actor='00000000-0000-0000-0000-000000000023';
const first='10000000-0000-0000-0000-000000000021';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const imageId='20000000-0000-0000-0000-000000000021';
const stamp=new Date().toISOString();
const staff=[{user_id:'00000000-0000-0000-0000-000000000024',display_name:'Maya · support',enabled:true}];
const cases=[
 {id:first,description:'I am receiving repeated unwanted messages after asking someone to stop. I would like help understanding my options and keeping a record. Please discuss next steps here before taking any action.',status:'in_progress',harassment_type:'cyber_harassment',severity_level:'high',created_at:stamp,allow_volunteer_support:true,message_count:3,evidence_count:2,team:staff},
 {id:'10000000-0000-0000-0000-000000000022',description:'I would like to discuss a concern at work and understand what support is available.',status:'pending',harassment_type:'workplace_harassment',severity_level:'medium',created_at:stamp,allow_volunteer_support:false,message_count:1,evidence_count:0,team:[]},
 {id:'10000000-0000-0000-0000-000000000023',description:'Thank you for listening. I have saved a record and agreed on a next step with my support person.',status:'resolved',harassment_type:'other',severity_level:'low',created_at:stamp,allow_volunteer_support:true,message_count:4,evidence_count:1,team:staff},
];
let messages=[
 {id:'30000000-0000-0000-0000-000000000023',request_id:first,sender:'admin',content:'Thank you for sharing this. You are in control of what happens next. We can start by reviewing the messages you chose to share and discussing the options that feel right for you.',created_at:stamp},
 {id:'30000000-0000-0000-0000-000000000022',request_id:first,sender:'user',content:'I have shared the messages. I would prefer to discuss things here for now.',created_at:stamp},
 {id:'30000000-0000-0000-0000-000000000021',request_id:first,sender:'admin',content:'I am here to listen. Would you like to tell me what would feel most helpful right now?',created_at:stamp},
];
let accessAllowed=true;
let notes=[{id:'note-1',author_name:'Maya · support',content:'Owner prefers written communication. Review the shared timeline, then discuss available next steps. Do not contact anyone externally without a clear request.',created_at:stamp}];
const evidence=[{id:imageId,label:'Messages from 31 October',kind:'file',mime_type:'image/png',byte_size:png.length,sha256:createHash('sha256').update(png).digest('hex'),review_status:'under_review',created_at:stamp},{id:'20000000-0000-0000-0000-000000000022',label:'Public context link',kind:'link',mime_type:null,byte_size:0,sha256:null,review_status:'new',created_at:stamp}];
const user={id:actor,aud:'authenticated',role:'authenticated',email:'supervisor@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:stamp};
let fixtureAal='aal2';let fixtureFactors=[];
const fakeQr=readFileSync(new URL('../design/team-portal/fixture-authenticator.svg',import.meta.url),'utf8');
const fixtureUser=()=>({...user,factors:fixtureFactors});
const fixtureSession=()=>({access_token:token(),refresh_token:'local-fixture-refresh',token_type:'bearer',expires_in:3600,user:fixtureUser()});
const token=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:actor,aal:fixtureAal,amr:[{method:fixtureAal==='aal2'?'totp':'password',timestamp:Math.floor(Date.now()/1000)}],aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),Buffer.from('fictional-signature').toString('base64url')].join('.');
const events=[{id:'event-3',actor_name:'Maya · support',action:'evidence_opened',created_at:stamp},{id:'event-2',actor_name:'Supervisor',action:'volunteer_assigned',created_at:stamp},{id:'event-1',actor_name:'Case owner',action:'volunteer_consent_given',created_at:stamp}];
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3002');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Access-Control-Expose-Headers','Content-Range');res.setHeader('Content-Type','application/json');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1:54323');let body='';for await(const chunk of req)body+=chunk;
 let args={};try{args=JSON.parse(body||'{}');}catch{}
 const send=(value,status=200)=>{res.writeHead(status);res.end(JSON.stringify(value));};
 if(url.pathname==='/auth/v1/token'){fixtureAal=args.email==='setup@example.test'?'aal1':'aal2';fixtureFactors=[];send(fixtureSession());return;}
 if(url.pathname==='/auth/v1/user'){send(fixtureUser());return;}
 if(url.pathname==='/auth/v1/logout'){send({});return;}
 if(url.pathname==='/auth/v1/factors'&&req.method==='POST'){const f={id:'00000000-0000-0000-0000-000000000099',factor_type:'totp',status:'unverified',friendly_name:'Fictional staff authenticator'};fixtureFactors=[f];send({...f,type:'totp',totp:{qr_code:fakeQr,secret:'JBSWY3DPEHPK3PXP',uri:'otpauth://totp/Victim%20Voice:demo%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=Victim%20Voice'}});return;}
 if(url.pathname.endsWith('/challenge')&&url.pathname.startsWith('/auth/v1/factors/')){send({id:'fixture-challenge',expires_at:Math.floor(Date.now()/1000)+300});return;}
 if(url.pathname.endsWith('/verify')&&url.pathname.startsWith('/auth/v1/factors/')){if(args.code!=='123456'){send({msg:'Invalid authenticator code. Try the current code.',code:'mfa_verification_failed'},422);return;}fixtureAal='aal2';fixtureFactors=fixtureFactors.map(f=>({...f,status:'verified'}));send(fixtureSession());return;}
 if(url.pathname.startsWith('/auth/v1/factors/')&&req.method==='DELETE'){fixtureFactors=[];send({});return;}
 if(url.pathname.startsWith('/rest/v1/rpc/')){
  const name=url.pathname.split('/').pop();
  const row=cases.find(c=>c.id===args.p_request_id)||cases[0];
  if(name==='vv_worker_console'){send({workers:[{user_id:staff[0].user_id,display_name:'Maya Sharma',organisation:'Fictional support partner',requested_role:'support_volunteer',region:'bhopal',languages:'Hindi, English',skills:'Crisis listening and case documentation',status:'pending'},{user_id:'00000000-0000-0000-0000-000000000025',display_name:'Ananya Das',organisation:'Fictional outreach team',requested_role:'case_worker',region:'tripura',languages:'Bengali, English',skills:'Case support',status:'approved',review_due:stamp},{user_id:'00000000-0000-0000-0000-000000000026',display_name:'Priya Mishra',organisation:'Fictional community partner',requested_role:'emergency_responder',region:'bhubaneswar',languages:'Odia, Hindi',skills:'First aid',status:'probation',review_due:stamp}],invites:[],reports:[{id:'report-1',worker_id:staff[0].user_id,reason:'Fictional concern for visual review only.',state:'new'}],overdue_cases:[{request_id:first,user_id:staff[0].user_id}],overdue_sos:[],access_review:[]});return;}
  if(name==='vv_my_assignments'){send([]);return;}
  if(name==='vv_evidence_permissions'){send([]);return;}
  if(name==='vv_can_work_case'){send(accessAllowed);return;}
  if(name==='is_admin'){send(true);return;}if(name==='vv_staff_role'){send('admin');return;}
  if(name==='vv_list_cases'){send(cases.filter(c=>(!args.p_status||c.status===args.p_status)&&(!args.p_search||`${c.id} ${c.description}`.toLowerCase().includes(args.p_search.toLowerCase()))));return;}
  if(name==='vv_open_case'){send(row);return;}if(name==='vv_list_staff'){send(staff);return;}
  if(name==='vv_case_activity'){send(args.p_kind==='notes'?notes:events);return;}
  if(name==='vv_list_evidence'){send(evidence);return;}
  if(name==='vv_open_evidence'){const item=evidence.find(e=>e.id===args.p_evidence_id)||evidence[0];send({...item,storage_path:`${first}/${item.id}`,url:item.kind==='link'?'https://example.org/context':null});return;}
  if(name==='vv_review_evidence'){const item=evidence.find(e=>e.id===args.p_evidence_id);if(item)item.review_status=args.p_status;send(null);return;}
  if(name==='vv_set_case_status'){row.status=args.p_status;send(null);return;}
  if(name==='vv_add_case_note'){notes=[{id:`note-${Date.now()}`,author_name:'Supervisor',content:args.p_content,created_at:new Date().toISOString()},...notes];send(null);return;}
  if(name==='vv_assign_case'){row.team=args.p_active?staff:[];send(null);return;}
  if(name==='vv_set_volunteer'){send(null);return;}
  send({message:`Fixture does not implement ${name}`},400);return;
 }
 if(url.pathname==='/rest/v1/comments'){
  if(req.method==='POST'){messages=[{id:`message-${Date.now()}`,sender:'admin',created_at:new Date().toISOString(),...args},...messages];send(null,201);return;}
  res.setHeader('Content-Range',`0-${messages.length-1}/${messages.length}`);send(messages);return;
 }
 if((url.pathname.startsWith('/storage/v1/object/authenticated/')||url.pathname.startsWith('/storage/v1/object/case-evidence/'))){res.setHeader('Content-Type','image/png');res.writeHead(200);res.end(png);return;}
 if(url.pathname==='/fixture/revoke'&&req.method==='POST'){accessAllowed=false;send({ok:true});return;}
 if(url.pathname==='/fixture/add-reply'&&req.method==='POST'){messages=[{id:`reply-${Date.now()}`,request_id:first,sender:'user',content:'Fictional automatic reply for the UI regression check.',created_at:new Date().toISOString()},...messages];send({ok:true});return;}
 send({message:'Not a fixture endpoint'},404);
}).listen(54323,'127.0.0.1',()=>console.log('Fictional support API: http://127.0.0.1:54323; no real Supabase requests.'));
