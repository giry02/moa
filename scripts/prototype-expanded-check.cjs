'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Giry/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const baseURL = process.argv.find(arg => /^https?:/.test(arg)) || 'http://127.0.0.1:7261/';
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.slice(7) || 'community';
const artifacts = path.resolve(__dirname, '../artifacts');
const checks = [], errors = [], limitations = ['이번 확장판 파일 선택은 브라우저 파일 접근 제한으로 자동 검증하지 않음. 다른 전송 방법으로 우회하지 않음.'];
fs.mkdirSync(artifacts, {recursive:true});
const pass = name => {checks.push(name);process.stdout.write('PASS '+name+'\n');};
function capture(page) {page.on('pageerror', e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});}
async function nav(page,name) {await page.locator(((await page.viewportSize()).width>880?'#side-nav':'#mobile-nav')+' [data-page="'+name+'"]').click();}
async function overflow(page,label) {const value=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(value.content<=value.width+1,label+JSON.stringify(value));}
async function group(page,id='walk',tab='홈') {await nav(page,'mygroups');await page.locator('[data-open-group="'+id+'"]').click();if(tab!=='홈')await page.locator('[data-group-tab="'+tab+'"]').click();}
async function closeModal(page) {await page.getByRole('button',{name:'닫기',exact:true}).first().click();}
async function community(page) {
  await page.goto(baseURL);await page.locator('.cm-explore-tabs').waitFor();
  assert.equal(await page.locator('.group-card').count(),3);
  await page.locator('#group-search').fill('없는테스트모임');assert.equal(await page.locator('.group-card').count(),0);
  await page.locator('#group-search').fill('');
  await page.getByRole('tab',{name:'내 관심사'}).click();assert.equal(await page.locator('.group-card').count(),2);
  await page.getByRole('tab',{name:'내 근처'}).click();await page.locator('#area-filter').selectOption('서울 마포구');assert.equal(await page.locator('.group-card').count(),2);
  await page.reload();assert.equal(await page.locator('#area-filter').inputValue(),'서울 마포구');
  await overflow(page,'390 탐색');pass('내 근처·내 관심사·검색·지역 저장');
  await group(page);
  const sample = page.locator('[data-community-action="post"][data-community-value="post-welcome"]').first();await sample.click();
  await page.locator('.cm-image-grid img').first().scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.cm-image-grid img')?.naturalWidth>0);
  await page.locator('[data-community-action="view-image"]').first().click();await page.waitForFunction(()=>document.querySelector('.cm-lightbox')?.naturalWidth>0);
  await page.getByRole('button',{name:'게시글로 돌아가기',exact:true}).click();await closeModal(page);
  pass('포함된 게시글 이미지 표시·확대·게시글 복귀');
  await page.locator('[data-group-tab="게시판"]').click();await page.locator('[data-community-action="compose"]').click();
  const title='QA 이야기 <em>함께</em>', comment='QA 댓글 <img src=x onerror="window.__xss=1">';
  await page.locator('#cm-post-title').fill(title);await page.locator('#cm-post-body').fill('작은 산책 이야기를 나눠요.\n다음 정모를 기다립니다.');
  await page.locator('button[form="cm-post-form"]').click();assert.equal(await page.locator('.cm-post-detail h1').innerText(),title);assert.equal(await page.locator('.cm-post-detail h1 em').count(),0);
  const postId=await page.evaluate(()=>window.MoyobomCommunity.getPosts().find(p=>p.title.startsWith('QA 이야기')).id);
  await page.locator('#cm-comment-text').fill(comment);await page.getByRole('button',{name:'댓글 등록',exact:true}).click();
  assert.equal(await page.locator('.cm-comment .cm-prose').last().innerText(),comment);assert.equal(await page.evaluate(()=>window.__xss),undefined);
  await closeModal(page);await page.reload();await group(page,'walk','게시판');await page.locator('[data-community-action="post"][data-community-value="'+postId+'"]').click();
  assert.equal(await page.locator('.cm-comment .cm-prose').last().innerText(),comment);
  await page.locator('[data-community-action="pin-post"]').click();await page.locator('[data-group-tab="홈"]').click();assert.ok((await page.locator('.cm-home-notice').innerText()).includes(title));
  pass('글·댓글 작성·escaping·공지 고정·새로고침 저장');
  await page.locator('[data-community-action="manage"]').first().click();
  await page.locator('#cm-group-desc').fill('QA 모임 소개를 저장했어요.');await page.locator('#cm-group-tags').fill('초보 환영, 함께 걷기, 동네 친구');
  await page.locator('input[name="bg"][value="#e3eaf0"]').check();await page.locator('button[form="cm-manage-form"]').click();
  assert.equal(await page.evaluate(()=>window.Moyobom.group().desc),'QA 모임 소개를 저장했어요.');
  await page.reload();await group(page);assert.equal(await page.evaluate(()=>window.Moyobom.group().bg),'#e3eaf0');
  await overflow(page,'390 모임 홈');pass('모임 소개·태그·커버색 관리·저장');
  await nav(page,'my');await page.locator('[data-community-action="edit-profile"]').click();await page.locator('#cm-profile-name').fill('QA 산책친구');await page.locator('#cm-profile-bio').fill('함께 천천히 걸어요.');
  await page.locator('[data-community-action="representative"]').first().click();await page.locator('button[form="cm-profile-form"]').click();
  assert.match(await page.locator('.cm-my-profile').innerText(),/QA 산책친구/);
  await page.reload();await nav(page,'my');assert.match(await page.locator('.cm-my-profile').innerText(),/QA 산책친구/);
  await page.locator('[data-community-action="edit-profile"]').click();
  while(await page.locator('[data-community-action="remove-draft-image"]').count())await page.locator('[data-community-action="remove-draft-image"]').first().click();
  await page.locator('button[form="cm-profile-form"]').click();assert.equal(await page.locator('.cm-my-profile .cm-avatar img').count(),0);
  await page.setViewportSize({width:360,height:800});await overflow(page,'360 마이');
  pass('포함된 프로필 대표사진 선택·삭제·닉네임·소개 저장·360px');
}
async function openChat(page) {await nav(page,'chats');await page.locator('[data-room="group:walk"]').first().click();}
async function generateSummary(page,{person=null,range='unread'}={}) {
  if(!await page.locator('.summary-panel').count())await page.locator('[data-action="toggle-summary"]').click();
  await page.locator('[data-summary-target="'+(person?'person':'all')+'"]').click();
  if(person)await page.locator('#summary-person').selectOption(person);
  await page.locator('#summary-range').selectOption(range);
  await page.locator('[data-action="generate-summary"]').click();
  await page.waitForFunction(()=>window.Moyobom.state.summaryStatus==='ready');
}
async function closeSummary(page) {if(await page.locator('.summary-panel').count())await page.getByRole('button',{name:'요약 닫기',exact:true}).click();}
async function chat(page) {
  await page.goto(baseURL);await openChat(page);
  let snapshot=await page.evaluate(()=>{const a=window.Moyobom,m=a.chatMessages();return{total:m.length,unread:m.filter(x=>x.at>a.state.unreadSnapshot).length};});
  assert.ok(snapshot.total>=400);assert.equal(await page.locator('.message').count(),snapshot.total);
  assert.ok((await page.locator('.unread-summary-banner').innerText()).includes('구간 '+snapshot.unread+'개'));
  await page.locator('[data-action="bulk-unread"]').click();
  assert.match(await page.locator('.unread-summary-banner').innerText(),/구간 300개/);
  await generateSummary(page);
  let result=await page.evaluate(()=>{const a=window.Moyobom,s=a.state,m=a.chatMessages();return{count:s.summaryCount,expected:m.filter(x=>x.at>s.unreadSnapshot&&x.at<=s.summaryCutoff&&x.text.trim()).length,items:s.summaryResult};});
  assert.equal(result.count,result.expected);assert.equal(result.count,300);
  assert.ok(result.items.some(x=>x.sourceIds.includes('final-schedule')&&/10시 30|10:30/.test(x.text)));
  assert.ok(!result.items.some(x=>x.sourceIds.includes('m9')),'옛 10:00 일정이 최신 변경과 함께 확정으로 노출됨');
  pass('공용방 실제 원문 400개 이상·안읽음 300개 배너·요약건수·최신 일정변경 근거');
  for(const range of ['today','week']) {
    await generateSummary(page,{person:'junho',range});
    const checked=await page.evaluate(()=>{const a=window.Moyobom,s=a.state,m=a.chatMessages(),start=Date.parse(s.summaryRange==='today'?'2026-10-25T00:00:00+09:00':'2026-10-19T00:00:00+09:00');return{count:s.summaryCount,expected:m.filter(x=>x.senderId==='junho'&&x.at>=start&&x.at<=s.summaryCutoff&&x.text.trim()).length,valid:s.summaryResult.every(i=>i.sourceIds.every(id=>m.some(x=>x.id===id&&x.senderId==='junho'&&x.at>=start&&x.at<=s.summaryCutoff)))};});
    assert.equal(checked.count,checked.expected);assert.ok(checked.valid);
  }
  const source=await page.locator('.source-button').first().getAttribute('data-source');await page.locator('.source-button').first().click();assert.ok(await page.locator('#msg-'+source).evaluate(el=>el.classList.contains('highlighted')));await closeSummary(page);await page.locator('#jump-latest').click();
  pass('특정인·오늘/최근7일 필터 건수 및 모든 출처 작성자·기간 일치');
  await page.locator('[data-reply-message="m1"]').click();assert.match(await page.locator('#reply-preview').innerText(),/민지에게 답장/);
  await page.locator('#message-input').fill('QA 과거 원문에 답장');await page.locator('#message-input').press('Enter');
  assert.match(await page.locator('.message.self').last().locator('.reply-card').innerText(),/민지에게 답장/);
  await page.locator('.message.self').last().locator('.reply-card').click();assert.ok(await page.locator('#msg-m1').evaluate(el=>el.classList.contains('highlighted')));await page.locator('#jump-latest').click();
  assert.ok(await page.locator('#message-stream').evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<2));
  await page.locator('#message-input').fill('@준');await page.locator('[data-choose-mention="junho"]').click();assert.match(await page.locator('#mention-chips').innerText(),/@준호/);
  await page.locator('#message-input').fill('QA 태그와 이모지');await page.locator('[data-action="emoji"]').click();await page.locator('[data-select-emoji="👍"]').click();await page.locator('#message-input').press('Enter');
  assert.equal(await page.evaluate(()=>window.Moyobom.chatMessages().at(-1).mentions.includes('junho')),true);assert.match(await page.locator('.message.self').last().innerText(),/👍/);
  await page.locator('.message.self').last().locator('[data-reaction-picker]').click();await page.locator('[data-select-emoji="❤️"]').click();assert.match(await page.locator('.message.self').last().locator('.reaction-chip').innerText(),/❤️\s*1/);
  pass('수백개 중 과거 답장 원문 카드·점프·최신 복귀·@자동완성·이모지 전송/반응');
  const before=await page.evaluate(()=>window.Moyobom.state.notifications.length);await page.locator('[data-action="incoming"]').click();assert.equal(await page.evaluate(()=>window.Moyobom.state.notifications.length),before);
  await page.locator('[data-action="mention-me"]').click();assert.equal(await page.evaluate(()=>window.Moyobom.state.notifications.length),before+1);
  const notification=await page.evaluate(()=>window.Moyobom.state.notifications[0]);await page.locator('[data-action="inbox"]').click();await page.locator('[data-open-notification="'+notification.id+'"]').click();assert.ok(await page.locator('#msg-'+notification.messageId).evaluate(el=>el.classList.contains('highlighted')));
  await page.locator('[data-action="room-notifications"]:visible').first().click();await page.locator('#notification-mode').selectOption('off');await page.locator('[data-action="save-notifications"]').click();await page.locator('[data-action="mention-me"]').click();assert.equal(await page.evaluate(()=>window.Moyobom.state.notifications.length),before+1);
  pass('기본 멘션만 알림·알림함 원문 점프·채팅방 알림끄기');
  await page.locator('#room-select').selectOption('meetup:river-sunset');assert.equal(await page.evaluate(()=>window.Moyobom.state.page),'group');assert.equal(await page.locator('.message').count(),0);
  await page.locator('[data-meetup="forest-sunday"]').first().click();await page.waitForFunction(()=>document.querySelector('.map-preview img')?.naturalWidth===960);
  assert.match(await page.locator('.map-preview figcaption').innerText(),/OpenStreetMap/);assert.equal(await page.locator('.map-placeholder').count(),0);
  if(await page.locator('[data-attend="forest-sunday"]').getAttribute('aria-pressed')==='false')await page.locator('[data-attend="forest-sunday"]').click();await page.locator('.modal [data-room="meetup:forest-sunday"]').click();
  assert.equal(await page.evaluate(()=>window.Moyobom.getRoomId()),'meetup:forest-sunday');
  const subCount=await page.locator('.message').count();assert.ok(subCount>=80&&subCount<=150);assert.equal(await page.locator('#msg-final-schedule').count(),0);
  await page.locator('.message-photo').first().scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.message-photo')?.naturalWidth>0);
  await page.locator('[data-image-message]').first().click();await page.waitForFunction(()=>document.querySelector('.image-full')?.naturalWidth>0);await closeModal(page);
  await page.locator('#message-input').fill('QA_SUBROOM_ONLY');await page.locator('#message-input').press('Enter');await page.locator('#room-select').selectOption('group:walk');assert.ok(!(await page.locator('#message-stream').innerText()).includes('QA_SUBROOM_ONLY'));
  await page.locator('#room-select').selectOption('meetup:forest-sunday');assert.ok((await page.locator('#message-stream').innerText()).includes('QA_SUBROOM_ONLY'));
  pass('정모 미참석 입장차단·참석후 전용방120개·공용방 분리·포함 이미지·실제 지도');
  await generateSummary(page,{range:'today'});assert.ok(await page.evaluate(()=>{const a=window.Moyobom;return a.state.summaryResult.every(i=>i.sourceIds.every(id=>a.chatMessages().some(m=>m.id===id&&m.roomId==='meetup:forest-sunday')));}));
  await closeSummary(page);await page.locator('[data-action="room-notifications"]:visible').first().click();await page.locator('#notification-mode').selectOption('mentions');await page.locator('[data-action="save-notifications"]').click();await page.locator('[data-action="mention-me"]').click();
  const subNotification=await page.evaluate(()=>window.Moyobom.state.notifications[0]);
  await page.locator('.pinned-meetup').click();await page.locator('[data-attend="forest-sunday"]').click();assert.equal(await page.locator('.message').count(),0);assert.equal(await page.evaluate(()=>window.Moyobom.state.page),'group');
  await page.locator('[data-action="inbox"]').click();
  const denied=page.locator('[data-open-notification="'+subNotification.id+'"]');
  if(await denied.count()){assert.ok(!(await denied.innerText()).includes(subNotification.text));await denied.click();assert.equal(await page.locator('.message').count(),0);}
  pass('정모방 요약 출처격리·참석취소 즉시 접근종료·알림 원문 권한');
  await openChat(page);await page.locator('[data-post-message="final-schedule"]').click();assert.match(await page.locator('.cm-source-box').innerText(),/민지/);await page.locator('#cm-post-body').fill('QA 채팅에서 이어가는 글');await page.locator('button[form="cm-post-form"]').click();await page.locator('.cm-source').click();assert.ok(await page.locator('#msg-final-schedule').evaluate(el=>el.classList.contains('highlighted')));
  await page.reload();await openChat(page);await page.locator('#room-select').selectOption('meetup:forest-sunday');assert.equal(await page.locator('.message').count(),0);
  pass('채팅→게시글 원문 카드→채팅 점프·새로고침 권한 유지');
  await page.setViewportSize({width:390,height:844});await nav(page,'explore');await overflow(page,'390 탐색');await openChat(page);await overflow(page,'390 채팅');await generateSummary(page,{person:'minji',range:'week'});await overflow(page,'390 요약');
  await page.setViewportSize({width:360,height:800});await overflow(page,'360 요약');await closeSummary(page);await overflow(page,'360 채팅');
  pass('확장 채팅·요약 390/360px 가로 넘침 없음');
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:mode==='chat'?{width:1440,height:1000}:{width:390,height:844},locale:'ko-KR',timezoneId:'Asia/Seoul'});
  const page=await context.newPage();capture(page);
  try {
    if(mode==='community')await community(page);else if(mode==='chat')await chat(page);else throw new Error('Unknown mode '+mode);
    assert.deepEqual(errors,[]);pass('console·pageerror 없음');
    const failureFile=path.join(artifacts,'prototype-expanded-'+mode+'-failure.png');if(fs.existsSync(failureFile))fs.unlinkSync(failureFile);
    fs.writeFileSync(path.join(artifacts,'prototype-expanded-'+mode+'-qa.json'),JSON.stringify({ok:true,checks,errors,limitations},null,2));
  } catch(error) {
    await page.screenshot({path:path.join(artifacts,'prototype-expanded-'+mode+'-failure.png'),fullPage:true});
    fs.writeFileSync(path.join(artifacts,'prototype-expanded-'+mode+'-qa.json'),JSON.stringify({ok:false,checks,errors,limitations,failure:error.stack},null,2));throw error;
  } finally {await browser.close();}
})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
