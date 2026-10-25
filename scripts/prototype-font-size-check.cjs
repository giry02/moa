'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Giry/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const origin='http://127.0.0.1:7261',root='E:/AI_Project/somoim/artifacts/',key='moyeobom-chat-appearance-v1';
const checks=[],errors=[],measurements=[];
const pass=name=>{checks.push(name);process.stdout.write('PASS '+name+'\n');};
async function enter(p,url=origin+'/index.html'){
  await p.goto(url);await p.locator('#mobile-nav [data-page="chats"]').click();await p.locator('[data-room="group:walk"]').first().click();
}
async function settings(p){await p.locator('.chat-more-button').click();await p.locator('[data-chat-font-action="open"]').click();await p.locator('#chat-font-range').waitFor();}
async function metrics(p){return p.evaluate(()=>{
 const font=s=>getComputedStyle(document.querySelector(s)).fontSize;
 return{bubble:font('.message-bubble'),preview:document.querySelector('.chat-font-preview')?font('.chat-font-preview'):null,composer:font('#message-input'),body:font('body'),value:document.querySelector('#chat-font-range')?.value,overflow:document.documentElement.scrollWidth>innerWidth,variable:getComputedStyle(document.documentElement).getPropertyValue('--chat-message-font-size').trim()};
});}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await enter(p);assert.equal((await metrics(p)).bubble,'13px');
 await p.locator('[data-action="emoji"]').tap();await p.locator('[data-sticker-choice="bunny-cheer"]').tap();await p.locator('#message-input').fill('이번 주 일요일에 만나요.');
 await settings(p);const slider=p.locator('#chat-font-range');
 assert.equal(await slider.getAttribute('min'),'12');assert.equal(await slider.getAttribute('max'),'22');assert.equal(await slider.getAttribute('step'),'1');
 await slider.press('End');let m=await metrics(p);assert.equal(m.bubble,'22px');assert.equal(m.preview,'22px');assert.equal(m.composer,'16px');assert.equal(m.body,'16px');
 await slider.press('ArrowLeft');await slider.press('ArrowLeft');await slider.press('ArrowLeft');m=await metrics(p);assert.equal(m.value,'19');assert.equal(m.bubble,'19px');assert.equal(m.preview,'19px');
 assert.deepEqual(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),{version:1,size:19});
 await p.locator('#toast').waitFor({state:'hidden'});await p.screenshot({path:root+'prototype-mobile-chat-font-settings.png'});
 await p.locator('[data-chat-font-action="close"]').click();assert.equal(await p.locator('#message-input').inputValue(),'이번 주 일요일에 만나요.');assert.equal(await p.evaluate(()=>window.Moyobom.state.selectedSticker),'bunny-cheer');
 measurements.push({name:'mobile390-live',...m});pass('키보드 range 변경·실시간 말풍선/미리보기 일치·본문 한정·작성내용/선택스티커 보존');
 await p.reload();await p.locator('#mobile-nav [data-page="chats"]').click();await p.locator('[data-room="group:walk"]').first().click();assert.equal((await metrics(p)).bubble,'19px');await settings(p);assert.equal(await p.locator('#chat-font-range').inputValue(),'19');await p.locator('#chat-font-range').press('End');await p.locator('[data-chat-font-action="close"]').click();
 const storage=await context.storageState();pass('새로고침 후 설정 저장 및 복원');
 const forced=await browser.newContext({viewport:{width:1440,height:844},locale:'ko-KR',storageState:storage}),fp=await forced.newPage();fp.on('pageerror',e=>errors.push(e.message));
 await enter(fp,origin+'/mobile.html');const fm=await metrics(fp);assert.equal(fm.bubble,'22px');assert.equal(fm.composer,'16px');assert.equal(fm.overflow,false);measurements.push({name:'forced430',...fm});await forced.close();
 const desktop=await browser.newContext({viewport:{width:1440,height:844},locale:'ko-KR',storageState:storage}),dp=await desktop.newPage();dp.on('pageerror',e=>errors.push(e.message));await dp.goto(origin+'/index.html');await dp.locator('#side-nav [data-page="chats"]').click();await dp.locator('[data-room="group:walk"]').first().click();const dm=await metrics(dp);assert.equal(dm.bubble,'13px');assert.equal(dm.composer,'14px');assert.equal(dm.body,'16px');measurements.push({name:'desktop-stored22',...dm});await desktop.close();
 await p.setViewportSize({width:360,height:740});assert.equal((await metrics(p)).bubble,'22px');assert.equal((await metrics(p)).overflow,false);await p.locator('#message-input').fill('확대해도 입력할 수 있어요.');assert.equal(await p.locator('#message-input').inputValue(),'확대해도 입력할 수 있어요.');
 const layout=await p.evaluate(()=>{const s=document.querySelector('#message-stream').getBoundingClientRect(),c=document.querySelector('.composer').getBoundingClientRect();return{streamRight:s.right,composerBottom:c.bottom,viewportHeight:innerHeight,lastTimes:[...document.querySelectorAll('.message-time')].slice(-3).map(x=>x.getBoundingClientRect().right)};});assert.ok(Math.abs(layout.composerBottom-layout.viewportHeight)<1);assert.ok(layout.lastTimes.every(x=>x<=layout.streamRight+1));measurements.push({name:'mobile360-max22',...(await metrics(p)),...layout});
 await p.locator('.chat-header [data-action="group-home"]').click();await p.locator('.group-context-nav [data-context-tab="게시판"]').click();await p.locator('[data-community-action="post"]').first().click();assert.equal(await p.locator('.cm-prose').first().evaluate(e=>getComputedStyle(e).fontSize),'14px');await p.getByRole('button',{name:'닫기',exact:true}).first().click();await p.locator('.group-context-header [data-page="mygroups"]').click();assert.ok(await p.locator('#mobile-nav').isVisible());assert.ok(await p.locator('.app-header').isVisible());pass('저장된 큰 글자 강제모바일 적용·데스크톱/게시판 기본 유지·360px 넘침없음·입력/뒤로 정상');
 await p.locator('#mobile-nav [data-page="chats"]').click();await p.locator('[data-room="group:walk"]').first().click();await settings(p);await p.locator('[data-chat-font-action="reset"]').click();assert.equal((await metrics(p)).bubble,'13px');assert.equal((await metrics(p)).preview,'13px');assert.equal(await p.locator('#chat-font-range').inputValue(),'13');assert.deepEqual(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),{version:1,size:13});await p.reload();await p.locator('#mobile-nav [data-page="chats"]').click();await p.locator('[data-room="group:walk"]').first().click();assert.equal((await metrics(p)).bubble,'13px');pass('기본 크기 즉시복구 및 새로고침 유지');
 assert.deepEqual(errors,[]);fs.writeFileSync(root+'prototype-chat-font-qa.json',JSON.stringify({ok:true,range:{min:12,max:22,default:13},checks,measurements,errors},null,2));await context.close();
 }finally{await browser.close();}})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
