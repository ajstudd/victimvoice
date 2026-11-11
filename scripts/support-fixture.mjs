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

const emergencyRequests=[
 {id:'40000000-0000-0000-0000-000000000001',created_at:stamp,status:'active',region_id:'bhopal',routing:'no_verified_route'},
 {id:'40000000-0000-0000-0000-000000000002',created_at:stamp,status:'active',region_id:'tripura',routing:'no_on_duty_recipient'},
 {id:'40000000-0000-0000-0000-000000000003',created_at:stamp,status:'resolved',region_id:'bhubaneswar',routing:'not_requested'}
];
const emergencyTeam=[
 {user_id:'00000000-0000-0000-0000-000000000026',display_name:'Priya Mishra',region_id:'bhopal',approved:true,kind:'volunteer',agency_id:null,duty_until:new Date(Date.now()+900000).toISOString()},
 {user_id:'00000000-0000-0000-0000-000000000027',display_name:'Neha Deb',region_id:'tripura',approved:false,kind:'volunteer',agency_id:null,duty_until:null}
];
let dispatchAccess=null;

let accessAllowed=true;
let notes=[{id:'note-1',author_name:'Maya · support',content:'Owner prefers written communication. Review the shared timeline, then discuss available next steps. Do not contact anyone externally without a clear request.',created_at:stamp}];
const evidence=[{id:imageId,label:'Messages from 31 October',kind:'file',mime_type:'image/png',byte_size:png.length,sha256:createHash('sha256').update(png).digest('hex'),review_status:'under_review',created_at:stamp},{id:'20000000-0000-0000-0000-000000000022',label:'Public context link',kind:'link',mime_type:null,byte_size:0,sha256:null,review_status:'new',created_at:stamp}];
const user={id:actor,aud:'authenticated',role:'authenticated',email:'supervisor@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:stamp};
let fixtureRole='superadmin';let casePurpose=false;let incidentPurpose=false;let fixtureAal='aal2';let fixtureFactors=[];
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
 if(url.pathname==='/functions/v1/sos'&&req.method==='GET'){send({relay:true,push:false});return;}
 if(url.pathname==='/auth/v1/token'){fixtureAal=args.email==='setup@example.test'?'aal1':'aal2';fixtureRole=args.email==='admin@example.test'?'admin':args.email==='employee@example.test'?'employee':'superadmin';fixtureFactors=[];send(fixtureSession());return;}
 if(url.pathname==='/auth/v1/user'){send(fixtureUser());return;}
 if(url.pathname==='/auth/v1/logout'){send({});return;}
 if(url.pathname==='/auth/v1/factors'&&req.method==='POST'){const f={id:'00000000-0000-0000-0000-000000000099',factor_type:'totp',status:'unverified',friendly_name:'Fictional staff authenticator'};fixtureFactors=[f];send({...f,type:'totp',totp:{qr_code:fakeQr,secret:'JBSWY3DPEHPK3PXP',uri:'otpauth://totp/Victim%20Voice:demo%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=Victim%20Voice'}});return;}
 if(url.pathname.endsWith('/challenge')&&url.pathname.startsWith('/auth/v1/factors/')){send({id:'fixture-challenge',expires_at:Math.floor(Date.now()/1000)+300});return;}
 if(url.pathname.endsWith('/verify')&&url.pathname.startsWith('/auth/v1/factors/')){if(args.code!=='123456'){send({msg:'Invalid authenticator code. Try the current code.',code:'mfa_verification_failed'},422);return;}fixtureAal='aal2';fixtureFactors=fixtureFactors.map(f=>({...f,status:'verified'}));send(fixtureSession());return;}
 if(url.pathname.startsWith('/auth/v1/factors/')&&req.method==='DELETE'){fixtureFactors=[];send({});return;}
 if(url.pathname.startsWith('/rest/v1/rpc/')){
  const name=url.pathname.split('/').pop();
  const row=cases.find(c=>c.id===args.p_request_id)||cases[0];
  const scopes=[{id:'india',name:'India',kind:'country',parent_id:null},{id:'madhya_pradesh',name:'Madhya Pradesh',kind:'state',parent_id:'india'},{id:'bhopal',name:'Bhopal',kind:'city',parent_id:'madhya_pradesh'},{id:'tripura',name:'Tripura',kind:'state',parent_id:'india'},{id:'bhubaneswar',name:'Bhubaneswar',kind:'city',parent_id:'odisha'}];
  const application={user_id:emergencyTeam[0].user_id,display_name:'Priya Mishra',organisation:'Fictional community partner',scope_id:'bhopal',scope_name:'Bhopal',status:'approved',field_status:'pending',reviewer_id:'00000000-0000-0000-0000-000000000025',reviewed_by:'00000000-0000-0000-0000-000000000025',review_due:new Date(Date.now()+86400000).toISOString(),languages:'Hindi, English',skills:'First aid, listening',availability:'Weekends in Bhopal',decision_reason:'Fictional completed training and reference review',review_reference:'FAKE-REVIEW-2026',checks:{identity:true,contact:true,references:true,interview:true,training:true,confidentiality:true,local_area:true}};
  if(name==='vv2_context'){send({role:fixtureRole,display_name:'Fictional '+fixtureRole,memberships:fixtureRole==='superadmin'?[]:[{scope_id:'bhopal',scope_name:'Bhopal',role:fixtureRole,expires_at:new Date(Date.now()+7776000000).toISOString()}]});return;}
  if(name==='vv2_scopes'){send(fixtureRole==='superadmin'?scopes:scopes.filter(x=>x.id==='bhopal'));return;}
  if(name==='vv2_console'){send({staff:[{user_id:staff[0].user_id,display_name:'Maya Sharma',organisation:'Fictional support partner',role:fixtureRole==='superadmin'?'admin':'employee',scope_id:'bhopal',scope_name:'Bhopal',enabled:true,expires_at:new Date(Date.now()+7776000000).toISOString()}],invites:[],applications:[application],audit:[{id:'fixture-audit',actor_id:actor,actor_role:'employee',action:'volunteer_approved',reason:application.decision_reason,created_at:stamp}],reports:[]});return;}
  if(name==='vv2_claim_volunteer_review'||name==='vv2_field_review'){send(application);return;}
  if(name==='vv2_invite_staff'){send('50000000-0000-0000-0000-000000000002');return;}
  if(name==='vv2_purpose_access'){if(args.p_kind==='case')casePurpose=true;else incidentPurpose=true;send(null);return;}
  if(name==='vv2_incident_messages'){send([{id:'fake-incident-message',author_name:'Person requesting help',author_role:'owner',content:'Fictional chat: please stay here while I wait for my family.',created_at:stamp}]);return;}
  if(name==='vv2_incident_participants'){send([{user_id:emergencyTeam[0].user_id,display_name:'Priya Mishra',role:'volunteer',organisation:'Fictional partner'}]);return;}
  if(name==='vv2_list_evidence'){send([]);return;}
  if(name?.startsWith('vv2_')){send(null);return;}
  if(name==='vv_sos_role'){send('admin');return;}
  if(name==='vv_sos_list'){send(emergencyRequests);return;}
  if(name==='vv_sos_team'){send(emergencyTeam);return;}
  if(name==='vv_sos_areas'){send({regions:[{id:'bhopal',name:'Bhopal',scope:'City / commissionerate',source_url:'https://bhopal.mppolice.gov.in/contact/',geometry:null,volunteer_enabled:false},{id:'tripura',name:'Tripura',scope:'Entire state · district-by-district onboarding',source_url:'https://tripura.gov.in/',geometry:null,volunteer_enabled:false},{id:'bhubaneswar',name:'Bhubaneswar',scope:'Bhubaneswar Urban Police District',source_url:'https://bhubaneswarcuttackpolice.gov.in/know-your-police-station/',geometry:null,volunteer_enabled:false}],agencies:[]});return;}
  if(name==='vv_sos_read'){const r=emergencyRequests.find(x=>x.id===args.p_id);if(!r){send({message:'Incident unavailable'},403);return;}send({...r,expires_at:new Date(Date.now()+1800000).toISOString(),alias:incidentPurpose?'Fictional safety request':null,callback:null,latitude:incidentPurpose?23.25:null,longitude:incidentPurpose?77.4:null,accuracy:20,details_allowed:incidentPurpose,chat_allowed:incidentPurpose,recipients:[{id:'fixture-contact',name:'Fictional trusted contact',state:'relay_accepted'}],accepted:1,offers:1});return;}
  if(name==='vv_dispatch_team'){send([{user_id:emergencyTeam[0].user_id,display_name:emergencyTeam[0].display_name,organisation:'Fictional community partner',accepted_at:stamp,access_until:dispatchAccess}]);return;}
  if(name==='vv_dispatch_responder'){dispatchAccess=args.p_allow?new Date(Date.now()+900000).toISOString():null;send(null);return;}
  if(name==='vv_sos_close'){const r=emergencyRequests.find(x=>x.id===args.p_id);if(r)r.status=args.p_status;send(null);return;}
  if(name==='vv_create_worker_invite'){send('50000000-0000-0000-0000-000000000001');return;}
  if(name==='vv_worker_console'){send({workers:[{user_id:staff[0].user_id,display_name:'Maya Sharma',organisation:'Fictional support partner',requested_role:'support_volunteer',region:'bhopal',languages:'Hindi, English',skills:'Crisis listening and case documentation',status:'pending'},{user_id:'00000000-0000-0000-0000-000000000025',display_name:'Ananya Das',organisation:'Fictional outreach team',requested_role:'case_worker',region:'tripura',languages:'Bengali, English',skills:'Case support',status:'approved',review_due:stamp},{user_id:'00000000-0000-0000-0000-000000000026',display_name:'Priya Mishra',organisation:'Fictional community partner',requested_role:'emergency_responder',region:'bhubaneswar',languages:'Odia, Hindi',skills:'First aid',status:'probation',review_due:new Date(Date.now()+86400000).toISOString(),identity_checked:true,reference_checked:true,interview_checked:true,training_checked:true,confidentiality_checked:true}],invites:[],reports:[{id:'report-1',worker_id:staff[0].user_id,reason:'Fictional concern for visual review only.',state:'new'}],overdue_cases:[{request_id:first,user_id:staff[0].user_id}],overdue_sos:[],access_review:[]});return;}
  if(name==='vv_my_assignments'){send([]);return;}
  if(name==='vv_evidence_permissions'){send([]);return;}
  if(name==='vv_can_work_case'){send(accessAllowed);return;}
  if(name==='is_admin'){send(true);return;}if(name==='vv_staff_role'){send(fixtureRole==='employee'?'case_worker':'admin');return;}
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
