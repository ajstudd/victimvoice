from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import html,math
OUT=Path(__file__).resolve().parent
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
class Diagram:
 def __init__(self,name,w=1500,h=1450):
  self.name=name;self.w=w;self.h=h;self.im=Image.new('RGB',(w,h),'white');self.d=ImageDraw.Draw(self.im);self.svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="white"/>'];self.boxes={}
 def text(self,x,y,s,size=28,bold=False,color='#182534',center=False):
  f=ImageFont.truetype(BOLD if bold else FONT,size)
  for i,line in enumerate(s.split('\n')):
   yy=y+i*(size+10);anchor='mm' if center else 'lm'
   self.d.text((x,yy),line,font=f,fill=color,anchor=anchor)
   self.svg.append(f'<text x="{x}" y="{yy}" font-family="Arial,sans-serif" font-size="{size}" font-weight="{"bold" if bold else "normal"}" fill="{color}" dominant-baseline="central" text-anchor="{"middle" if center else "start"}">{html.escape(line)}</text>')
 def rect(self,x,y,w,h,fill='#F3F6F8',stroke='#586A7C'):
  self.d.rounded_rectangle((x,y,x+w,y+h),radius=12,fill=fill,outline=stroke,width=2)
  self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
 def box(self,key,x,y,w,h,title,body='',pending=False,entity=False):
  self.boxes[key]=(x,y,w,h);self.rect(x,y,w,h,'#FFF6E7' if pending else '#EFF4F7')
  if entity:
   self.text(x+18,y+34,title,27,True)
   self.d.line((x+10,y+63,x+w-10,y+63),fill='#CBD4DE',width=2);self.svg.append(f'<path d="M{x+10} {y+63}H{x+w-10}" stroke="#CBD4DE"/>')
   self.text(x+18,y+92,body,26)
  else:
   self.text(x+w/2,y+37,title,30,True,center=True)
   if body:self.text(x+w/2,y+83,body,27,center=True)
 def pt(self,key,side='b'):
  x,y,w,h=self.boxes[key];return {'t':(x+w/2,y),'b':(x+w/2,y+h),'l':(x,y+h/2),'r':(x+w,y+h/2)}[side]
 def line(self,points,label=None,at=None,dashed=False):
  color='#876426' if dashed else '#4C6074'
  if not dashed:self.d.line(points,fill=color,width=3,joint='curve')
  else:
   for (x1,y1),(x2,y2) in zip(points,points[1:]):
    dist=math.hypot(x2-x1,y2-y1)
    for t in range(0,int(dist),20):
     u=min(t+11,dist);self.d.line((x1+(x2-x1)*t/dist,y1+(y2-y1)*t/dist,x1+(x2-x1)*u/dist,y1+(y2-y1)*u/dist),fill=color,width=3)
  a,b=points[-2:];ang=math.atan2(b[1]-a[1],b[0]-a[0]);pts=[b,(b[0]-14*math.cos(ang-.45),b[1]-14*math.sin(ang-.45)),(b[0]-14*math.cos(ang+.45),b[1]-14*math.sin(ang+.45))];self.d.polygon(pts,fill=color)
  self.svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="3"'+(' stroke-dasharray="11 9"' if dashed else '')+'/>');self.svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in pts)+f'" fill="{color}"/>')
  if label and at:
   f=ImageFont.truetype(FONT,24);bounds=self.d.textbbox((0,0),label,font=f);ww=bounds[2]-bounds[0]+18;hh=32
   x,y=at;self.d.rectangle((x-ww/2,y-hh/2,x+ww/2,y+hh/2),fill='white');self.svg.append(f'<rect x="{x-ww/2}" y="{y-hh/2}" width="{ww}" height="{hh}" fill="white"/>');self.text(x,y,label,24,center=True)
 def edge(self,a,b,label='',at=None,dashed=False,sa='b',sb='t',via=[]):self.line([self.pt(a,sa),*via,self.pt(b,sb)],label,at,dashed)
 def save(self):
  self.im.save(OUT/(self.name+'.png'));(OUT/(self.name+'.svg')).write_text('\n'.join(self.svg+['</svg>']))

# Architecture with explicit device and cloud boundaries
D=Diagram('architecture',1500,1320)
D.text(30,35,'DEVICE AND BROWSER',27,True)
D.box('app',20,80,450,170,'Android app','Expo and React Native\nNative SMS and sensors')
D.box('web',525,80,450,170,'Website and staff portal','Next.js on Vercel\nUser and role based screens')
D.box('vault',20,330,450,165,'Private phone vault','Encrypted notes and plans\nLocal key in SecureStore')
D.edge('app','vault','local writes',(245,292))
D.box('auth',525,330,450,165,'Supabase Auth','Google and phone sign in\nTokens and staff MFA')
D.edge('app','auth','sign in',(430,280),sa='b',sb='t',via=[(245,280),(497,280),(497,310),(750,310)])
D.edge('web','auth','sign in',(750,292))
D.text(820,565,'SHARED SUPABASE BACKEND',27,True)
D.box('sql',20,625,690,185,'PostgreSQL and PostGIS','RPC authorization and row policies\nCases workforce journeys and SOS\nGeography matching and outbox')
D.box('storage',800,625,675,185,'Private Storage','Support and incident attachments\nPermission checked file access')
D.edge('auth','sql','signed in requests',(510,550),via=[(750,545),(365,545)])
D.edge('sql','storage','grants',(755,680),sa='r',sb='l')
D.box('edge',20,920,690,165,'Edge Functions and worker','Deno TypeScript\nDelivery jobs and signed callbacks')
D.edge('sql','edge','outbox and status',(365,866))
D.box('twilio',800,900,675,145,'Twilio SMS','Provider submission and callbacks')
D.box('push',800,1120,675,145,'Expo Push and Android FCM','Setup pending and push disabled',pending=True)
D.edge('edge','twilio','SMS',(755,1050),sa='r',sb='l',via=[(755,1002),(755,972)])
D.edge('edge','push','planned channel',(570,1160),dashed=True,via=[(365,1192)],sb='l')
D.text(30,1295,'Cloud authority stays in backend rules. The private vault is not a staff database.',26)
D.save()

# DFD context uses labelled information, not just component connectivity
D=Diagram('data-flow-overview',1500,1340)
D.box('user',20,30,470,150,'Woman using Victim Voice','App or website')
D.box('staff',1010,30,470,150,'Authorized staff','Assigned support and oversight')
D.box('api',490,335,520,175,'1 Shared access checks','Auth session plus RPC and RLS\nRole scope consent and expiry')
D.edge('user','api','chosen request or message',(360,250),via=[(255,250),(750,250)])
D.edge('staff','api','case work and replies',(1130,250),via=[(1245,250),(750,250)])
D.box('db',20,680,470,200,'D1 Application database','Cases and conversations\nAssignments and audit\nTemporary journey point')
D.box('files',1010,680,470,200,'D2 Private files','Selected evidence only\nAuthenticated download')
D.edge('api','db','allowed reads and writes',(345,588),via=[(750,580),(255,580)])
D.edge('api','files','upload or checked viewing',(1150,588),via=[(750,580),(1245,580)])
D.box('reply',490,1030,520,165,'2 Visible results','Messages status and access results\nPolling while view is open')
D.edge('db','reply','scoped case data',(365,950),via=[(255,950),(750,950)])
D.edge('files','reply','permitted media bytes',(1160,950),via=[(1245,950),(750,950)])
D.text(25,1265,'User and staff receive results through their existing screens.',27)
D.text(25,1310,'Private journal data stays on the phone unless the user deliberately shares it.',27)
D.save()

D=Diagram('data-flow-sos',1500,1390)
D.box('start',500,20,500,150,'User chooses contact SMS','Or a valid motion check in expires')
D.box('local',500,265,500,160,'1 Durable local request','Incident ID and recipient attempt IDs')
D.edge('start','local','selected contacts',(750,213))
D.box('sim',15,540,630,170,'2 Android SIM attempt','Requires permission and default SIM\nCan work without internet')
D.box('backend',855,540,630,170,'3 Authenticated backend request','Consent and channel availability\nStores incident and contact status')
D.edge('local','sim','try SIM first',(330,475),via=[(750,475),(330,475)])
D.edge('local','backend','cloud enabled and signed in',(1170,475),via=[(750,475),(1170,475)])
D.box('status',15,870,630,175,'4 Reconcile per contact result','Unknown or partial means no blind retry\nSafe failure may allow fallback')
D.edge('sim','status','native result',(330,790))
D.box('outbox',855,870,630,175,'D1 Outbox and worker','Unique bounded delivery jobs\nTwilio relay only when allowed')
D.edge('backend','outbox','validated job',(1170,790))
D.edge('status','outbox','safe fallback',(750,958),sa='r',sb='l')
D.box('twilio',855,1170,630,145,'5 Twilio and signed callback','Accepted delivered failed or unknown')
D.edge('outbox','twilio','provider call',(1170,1105))
D.box('screen',15,1170,630,145,'User sees actual status','Handoff is not a human response')
D.edge('status','screen','recorded progress',(330,1105))
D.edge('twilio','screen','status',(750,1242),sa='l',sb='r')
D.save()

# Database diagrams: edges are parent to child; field markers show selected keys.
def ent(D,k,x,y,title,body,h=205,w=650):D.box(k,x,y,w,h,title,body,entity=True)
D=Diagram('database-support',1500,1420)
ent(D,'case',420,15,'support_requests','PK id\nFK user_id  > auth.users\nFK scope_id > vv_operating_scopes',h=205)
ent(D,'comments',15,350,'comments','PK id\nFK request_id\nFK author_id > auth.users',w=460)
ent(D,'assign',520,350,'vv_case_assignments','PK FK request_id and user_id\nuser_id > auth.users\naccepted_at and expires_at',w=460)
ent(D,'evidence',1025,350,'vv_case_evidence','PK id and FK request_id\nFK uploader_id > auth.users\nstorage_path and sha256',w=460)
for key in ['comments','assign','evidence']:
 x=D.pt(key,'t')[0];D.edge('case',key,'1 to many',(x,298),via=[(745,275),(x,275)])
ent(D,'notes',15,705,'vv_case_notes','PK id and FK request_id\nFK author_id > auth.users\nInternal content',w=460)
ent(D,'events',520,705,'vv_case_events','PK id and FK request_id\nFK actor_id > auth.users\nAction and created_at',w=460)
ent(D,'grants',1025,705,'vv_evidence_grants','PK FK evidence_id and worker_id\nworker_id > auth.users\nexpires_at',w=460)
D.edge('case','notes','1 to many',(145,625),sa='l',via=[(0,117),(0,640),(245,640)])
D.edge('case','events','1 to many',(755,630),sa='b',via=[(995,250),(995,640),(750,640)])
D.edge('evidence','grants','1 to many',(1255,632))
ent(D,'leases',1025,1080,'vv_evidence_leases','PK FK evidence_id and user_id\nuser_id > auth.users\nexpires_at',w=460)
D.edge('evidence','leases','1 to many',(1010,1000),sa='l',via=[(1005,452),(1005,1020),(1255,1020)])
D.text(20,1140,'Storage object bytes are separate from evidence metadata.',27)
D.text(20,1190,'storage_path is an application mapping, not a database FK.',27)
D.text(20,1330,'Solid arrows are selected foreign keys from parent to child. PK = primary key; FK = foreign key.',25)
D.text(20,1380,'Other Auth relationships are shown as fields to keep lines readable. Non key fields are abbreviated.',25)
D.save()

D=Diagram('database-workforce',1500,1390)
ent(D,'scope',830,20,'vv_operating_scopes','PK id\nFK parent_id > same table\nname and kind',w=650)
ent(D,'user',20,20,'auth.users','PK id\nSupabase account identity',w=650)
ent(D,'profile',20,350,'vv_staff_profiles','PK FK user_id > auth.users\ndisplay_name and organisation',w=650)
ent(D,'member',830,350,'vv_staff_memberships','PK FK user_id and scope_id\nuser_id > vv_staff_profiles\nrole enabled and expires_at',w=650)
D.edge('user','profile','1 to zero or one',(345,280))
D.edge('scope','member','1 to many',(1155,280))
D.edge('profile','member','1 to many',(750,450),sa='r',sb='l')
ent(D,'invite',20,685,'vv_staff_invites','PK id and FK scope_id\nFK account_id > auth.users\ntoken_hash and expires_at',w=650)
ent(D,'volunteer',830,685,'vv_volunteer_applications','PK FK user_id > auth.users\nFK scope_id and reviewer IDs\nstatus and field_status',w=650)
D.edge('scope','volunteer','1 to many',(1320,600),sa='r',via=[(1495,122),(1495,625),(1155,625)])
ent(D,'root',20,1020,'admin_users','PK FK user_id > auth.users\nDatabase controlled superadmin',w=650)
ent(D,'audit',830,1020,'vv_governance_audit','PK id and FK scope_id\nFK actor_id > auth.users\nFK request_id and event_id',w=650)
D.text(20,1280,'Invites applications memberships and audits each reference their operating scope.',26)
D.text(20,1330,'Selected FK edges shown. Reviewer sponsor and approver IDs also reference auth.users.',26)
D.save()

D=Diagram('database-sos',1500,1430)
ent(D,'region',20,15,'vv_sos_regions','PK id\nboundary and verified_at',w=650)
ent(D,'agency',830,15,'vv_sos_agencies','PK id and FK region_id\nboundary and enabled',w=650)
D.edge('region','agency','1 to many',(750,115),sa='r',sb='l')
ent(D,'event',20,350,'vv_sos_events','PK id and FK region_id\nFK user_id > auth.users\nposition status and expires_at',w=650)
ent(D,'responder',830,350,'vv_sos_responders','PK FK user_id > auth.users\nFK region_id and agency_id\nduty_until and position_at',w=650)
D.edge('region','event','1 to many',(345,280));D.edge('agency','responder','1 to many',(1155,280))
ent(D,'recipient',20,690,'vv_sos_recipients','PK FK event_id plus contact_id\nphone snapshot and state\ncontact_id has no contacts FK',w=650)
ent(D,'offer',830,690,'vv_sos_offers','PK FK event_id and responder_id\nresponder_id > auth.users\ndispatched_by and access_until',w=650)
D.edge('event','recipient','1 to many',(345,620))
D.edge('responder','offer','same user ID not an FK',(1155,620),dashed=True)
ent(D,'jobs',20,1030,'vv_sos_jobs','PK id and FK event_id\ncontact_id and recipient_id\nkind and state',w=650)
ent(D,'devices',830,1030,'vv_sos_devices','PK FK user_id plus token\nuser_id > auth.users\nupdated_at',w=650)
D.edge('event','jobs','1 to many',(140,950),sa='l',via=[(0,452),(0,965),(345,965)])
D.edge('event','offer','1 to many',(750,620),sa='r',via=[(750,452),(750,630),(1155,630)])
D.text(20,1320,'Solid arrows show selected FKs. Gold dashed lines show logical joins rather than declared FKs.',25)
D.text(20,1370,'Auth edges and the responder region edge are abbreviated. Jobs do not FK link to contact snapshots.',25)
D.save()

D=Diagram('database-journeys-and-incident-media',1500,1550)
ent(D,'auth',420,10,'auth.users','PK id',w=660,h=145)
ent(D,'contacts',15,280,'vv_contacts','PK id\nFK user_id > auth.users\nname and phone',w=460)
ent(D,'journey',520,280,'vv_journey_live','PK id\nFK user_id UNIQUE > auth.users\ntoken_hash and expires_at',w=460)
ent(D,'plan',1025,280,'vv_safety_plans','PK FK user_id > auth.users\nSchema foundation table\nCurrent app plan stays local',w=460)
for k,label in [('contacts','1 to many'),('journey','1 to zero or one'),('plan','1 to zero or one')]:
 x=D.pt(k,'t')[0];D.edge('auth',k,label,(x,225),via=[(750,200),(x,200)])
ent(D,'event',20,620,'vv_sos_events','PK id\nFK user_id > auth.users',w=650,h=170)
ent(D,'chat',830,620,'vv_incident_messages','PK id and FK event_id\nFK author_id > auth.users\ncontent and created_at',w=650,h=205)
D.edge('event','chat','1 to many',(750,702),sa='r',sb='l')
ent(D,'file',20,920,'vv_incident_evidence','PK id\nFK request_id > vv_sos_events\nstorage_path and ready',w=650)
D.edge('event','file','1 to many',(345,860))
ent(D,'grants',830,920,'vv_incident_evidence_grants','PK FK evidence_id and user_id\nuser_id > auth.users',w=650)
D.edge('file','grants','1 to many',(750,1020),sa='r',sb='l')
ent(D,'lease',830,1250,'vv_incident_evidence_leases','PK FK evidence_id and user_id\nuser_id > auth.users\nexpires_at',w=650)
D.edge('file','lease','1 to many',(750,1190),sa='b',sb='l',via=[(345,1190),(750,1190),(750,1352)])
D.text(20,1310,'Incident evidence request_id references SOS events,',26)
D.text(20,1355,'not ordinary support_requests.',26)
D.text(20,1510,'These are selected schema tables. Encrypted private notes have no cloud journal table in this app.',25)
D.save()
print('Generated seven diagram PNGs and editable SVGs')
