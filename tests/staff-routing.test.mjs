import test from 'node:test';
import assert from 'node:assert/strict';
import {staffHomeForRole,legacyTeamDestination,canManagePersonnel,allowedLoginDestination,requestedLoginDestination,authenticatedLoginDestination,consumeLoginDestination,rememberLoginDestination} from '../lib/staff-routing.ts';

test('staff homes follow server roles and responder approval',()=>{
 assert.equal(staffHomeForRole('superadmin'),'/admin/team');
 assert.equal(staffHomeForRole('admin'),'/admin/team');
 assert.equal(staffHomeForRole('employee'),'/admin/dashboard');
 assert.equal(staffHomeForRole('volunteer','volunteer'),'/admin/emergency');
 assert.equal(staffHomeForRole('volunteer','police'),'/admin/emergency');
 for(const role of ['member','none','pending','Supervisor','owner',''])assert.equal(staffHomeForRole(role,'admin'),null);
 assert.equal(staffHomeForRole('volunteer','pending'),null);
 assert.equal(staffHomeForRole('volunteer',null),null);
});
test('legacy team links distinguish personnel management from enrollment',()=>{
 for(const role of ['superadmin','admin','employee']){assert.equal(legacyTeamDestination(role),'/admin/team');assert.equal(canManagePersonnel(role),true)}
 for(const role of ['member','volunteer','none',null,undefined]){assert.equal(legacyTeamDestination(role),'/join');assert.equal(canManagePersonnel(role||''),false)}
});
test('login destinations reject external URLs, path tricks and arbitrary staff pages',()=>{
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/admin/team?next=https://evil.example','/admin/emergency','/admin/team/../../','javascript:alert(1)','/join#secret','/admin/team/',' /join',null])assert.equal(allowedLoginDestination(value),null);
 assert.equal(requestedLoginDestination('?next=%2Fjoin'),'/join');
 assert.equal(requestedLoginDestination('?next=%2Fadmin%2Fteam'),'/admin/team');
 assert.equal(requestedLoginDestination('?next=%2F%2Fevil.example'),null);
 assert.equal(requestedLoginDestination('?next=%252Fjoin'),null);
});
test('pending invitees may finish staff sign-in only at join; staff-only login stays restricted',()=>{
 assert.equal(authenticatedLoginDestination('/join',true,null),'/join');
 assert.equal(authenticatedLoginDestination('/join',false,null),'/join');
 assert.equal(authenticatedLoginDestination(null,true,null),null);
 assert.equal(authenticatedLoginDestination('/admin/team',true,null),null);
 assert.equal(authenticatedLoginDestination(null,true,'/admin/dashboard'),'/admin/dashboard');
 assert.equal(authenticatedLoginDestination(null,true,'/admin/team'),'/admin/team');
 assert.equal(authenticatedLoginDestination(null,false,null),'/dashboard');
 assert.equal(authenticatedLoginDestination('https://evil.example',false,null),'/dashboard');
});
test('OAuth/phone intent survives once, clears stale intent and supports old team bookmarks',()=>{
 const store=new Map();
 globalThis.sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 globalThis.window={location:{search:'?next=%2Fjoin'}};
 rememberLoginDestination();
 assert.equal(consumeLoginDestination(),'/join');
 assert.equal(consumeLoginDestination(),null);
 sessionStorage.setItem('vv-login-destination','/team');
 assert.equal(consumeLoginDestination(),'/team');
 sessionStorage.setItem('vv-login-destination','https://evil.example');
 assert.equal(consumeLoginDestination(),null);
 sessionStorage.setItem('vv-login-destination','/admin/team');
 assert.equal(consumeLoginDestination('?next=%2Fjoin'),'/join');
 assert.equal(store.size,0);
 sessionStorage.setItem('vv-login-destination','/join');
 window.location.search='';rememberLoginDestination();
 assert.equal(store.size,0);
 delete globalThis.window;delete globalThis.sessionStorage;
});
