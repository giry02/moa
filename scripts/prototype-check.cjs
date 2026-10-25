/* Lightweight browser smoke check. Uses an existing Playwright install; installs nothing.
 * Usage: $env:PLAYWRIGHT_MODULE='path/to/playwright-core'; node scripts/prototype-check.cjs [url]
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const modulePath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/Giry/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core';
const { chromium } = require(modulePath);
const baseURL = process.argv[2] || 'http://127.0.0.1:7261/';
const artifacts = path.resolve(__dirname, '../artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const checks = [], errors = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function pass(name) { checks.push(name); process.stdout.write('PASS ' + name + '\n'); }
function capture(page) {
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
}
async function nav(page, name) {
  const prefix = (await page.viewportSize()).width > 880 ? '#side-nav' : '#mobile-nav';
  await page.locator(prefix + ' [data-page="' + name + '"]').click();
}
async function chat(page, id = 'walk') { await nav(page, 'chats'); await page.locator('[data-chat="' + id + '"]').click(); }
async function overflow(page, label) {
  const result = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(result.document <= result.viewport + 1, label + ': ' + JSON.stringify(result));
}
async function summary(page, person, range) {
  if (!await page.locator('.summary-panel').count()) await page.locator('[data-action="toggle-summary"]').click();
  await page.locator('[data-summary-target="person"]').click();
  await page.locator('#summary-person').selectOption(person);
  await page.locator('#summary-range').selectOption(range);
  await page.locator('[data-action="generate-summary"]').click();
  await page.waitForFunction(() => !document.querySelector('.summary-loading'));
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await context.newPage(); capture(page);
  try {
    assert.equal((await page.goto(baseURL)).status(), 200);
    await page.locator('.group-card').first().waitFor();
    await page.screenshot({ path: path.join(artifacts, 'prototype-desktop-explore.png'), fullPage: true });
    assert.equal(await page.locator('.group-card').count(), 6);
    await page.locator('#group-search').fill('배드민턴');
    assert.equal(await page.locator('.group-card').count(), 1);
    await page.locator('#group-search').fill('');
    await page.locator('#area-filter').selectOption('서울 성동구');
    assert.equal(await page.locator('.group-card').count(), 3);
    await page.locator('[data-category="인문학 / 책 / 글"]').click();
    assert.equal(await page.locator('.group-card').count(), 1);
    pass('모임 검색 및 지역·관심사 필터');

    await page.locator('[data-open-group="book"]').click();
    await page.locator('[data-action="join"]').click();
    assert.match(await page.locator('[data-action="join"]').innerText(), /가입 중/);
    await page.locator('[data-action="open-chat"]').click();
    const marker = 'QA_BOOK <img src=x onerror="window.__prototype_xss=1"> & text';
    await page.locator('#message-input').fill(marker);
    await page.locator('#message-input').press('Enter');
    assert.equal(await page.locator('.message.self .message-bubble').last().innerText(), marker);
    assert.equal(await page.evaluate(() => window.__prototype_xss), undefined);
    assert.equal(await page.locator('.message.self .message-bubble img').count(), 0);
    pass('모임 가입 및 채팅 전송·HTML escaping');

    await chat(page, 'walk');
    assert.ok(!(await page.locator('#message-stream').innerText()).includes('QA_BOOK'), '타 모임 메시지가 walk방에 섞임');
    await page.reload();
    await chat(page, 'book');
    assert.ok((await page.locator('#message-stream').innerText()).includes('QA_BOOK'), '새로고침 후 book방 메시지 누락');
    await chat(page, 'walk');
    assert.ok(!(await page.locator('#message-stream').innerText()).includes('QA_BOOK'), '새로고침 후 타 모임 메시지 노출');
    pass('채팅방 메시지 격리 및 새로고침 저장');

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZSsAAAAASUVORK5CYII=', 'base64');
    await page.locator('#image-file').setInputFiles({ name: 'qa-image.png', mimeType: 'image/png', buffer: png });
    await page.locator('#attachment-preview').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#attachment-preview img')?.naturalWidth > 0);
    await page.locator('#send-message').click();
    assert.equal(await page.locator('.message-photo').count(), 1);
    assert.ok(!await page.locator('#attachment-preview').isVisible());
    pass('실제 file input 이미지 선택·프리뷰·채팅 첨부');

    await page.locator('#message-stream').evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
    const before = await page.locator('#message-stream').evaluate(el => el.scrollTop);
    await page.locator('[data-action="incoming"]').click();
    assert.ok(Math.abs((await page.locator('#message-stream').evaluate(el => el.scrollTop)) - before) < 2);
    assert.match(await page.locator('#jump-latest').innerText(), /새 대화 1개/);
    await page.locator('#jump-latest').click();
    assert.ok(await page.locator('#message-stream').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight < 2));
    pass('과거 대화 위치 유지·새 대화 표시·최신 이동');

    await summary(page, 'minji', 'today');
    let sourceIds = await page.locator('.source-button').evaluateAll(nodes => nodes.map(n => n.dataset.source));
    assert.ok(sourceIds.length > 0);
    assert.ok(sourceIds.every(id => ['m9','m12','m17'].includes(id) || id.startsWith('incoming-')));
    assert.ok(!sourceIds.includes('m1') && !sourceIds.includes('m6'));
    await summary(page, 'minji', 'week');
    sourceIds = await page.locator('.source-button').evaluateAll(nodes => nodes.map(n => n.dataset.source));
    assert.ok(sourceIds.includes('m1'));
    const source = await page.locator('.source-button').first().getAttribute('data-source');
    await page.locator('.source-button').first().click();
    assert.ok(await page.locator('#msg-' + source).evaluate(el => el.classList.contains('highlighted')));
    await page.locator('#jump-latest').click();
    assert.equal(await page.locator('.message.highlighted').count(), 0);
    pass('특정인·기간 요약 필터 및 원문 이동·복귀');

    await page.getByRole('button', { name: '요약 닫기' }).click();
    const newMessage = 'QA_NEW_SUMMARY 새로 보낸 메시지도 현재 범위에 포함해 주세요.';
    await page.locator('#message-input').fill(newMessage);
    await page.locator('#message-input').press('Enter');
    await summary(page, 'me', 'today');
    assert.ok((await page.locator('#summary-results').innerText()).includes('QA_NEW_SUMMARY'));
    await page.screenshot({ path: path.join(artifacts, 'prototype-desktop-chat.png'), fullPage: true });
    pass('새 메시지 요약 포함 및 데스크톱 채팅 화면');

    await nav(page, 'mygroups');
    await page.locator('[data-open-group="walk"]').click();
    await page.locator('[data-group-tab="정모"]').click();
    await page.locator('[data-action="new-meetup"]').click();
    await page.locator('#meetup-title').fill('QA 주말 산책');
    await page.locator('#meetup-date').fill('2026-11-15T10:00');
    await page.locator('#place-search').fill('뚝섬');
    assert.equal(await page.locator('.place-result').count(), 1);
    await page.locator('[data-place-choice="station"]').click();
    await page.locator('#meetup-point').fill('8번 출구 표지판 앞');
    await page.locator('#meetup-description').fill('QA 등록·참석 흐름 확인');
    await page.getByRole('button', { name: '정모 등록', exact: true }).click();
    await page.locator('.meetup-card').filter({ hasText: 'QA 주말 산책' }).click();
    assert.match(await page.locator('.location-name').innerText(), /뚝섬역 8번 출구/);
    assert.ok(decodeURIComponent(await page.locator('.map-linkrow a').first().getAttribute('href')).includes('뚝섬역 8번 출구'));
    await page.locator('[data-attend]').click();
    assert.match(await page.locator('[data-attend]').innerText(), /참석하기/);
    await page.locator('[data-attend]').click();
    assert.match(await page.locator('[data-attend]').innerText(), /참석 취소/);
    await page.locator('[data-action="route"]').click();
    await page.locator('[data-action="location-deny"]').click();
    await page.locator('[data-action="location-manual"]').click();
    await page.locator('#route-start').selectOption('forest');
    await page.locator('[data-route-mode="transit"]').click();
    assert.match(await page.locator('.route-flow').innerText(), /서울숲 방문자센터/);
    assert.match(await page.locator('.route-flow').innerText(), /실제 경로 API를 호출하지/);
    pass('장소 검색·정모 등록·참석·지도 링크·위치 거부 대체 흐름');

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage(); capture(mobile); await mobile.goto(baseURL);
    await overflow(mobile, '390px 탐색');
    await mobile.screenshot({ path: path.join(artifacts, 'prototype-mobile-explore.png'), fullPage: true });
    await chat(mobile, 'walk');
    await overflow(mobile, '390px 채팅');
    await summary(mobile, 'junho', 'today');
    await overflow(mobile, '390px 요약');
    await mobile.screenshot({ path: path.join(artifacts, 'prototype-mobile-chat.png'), fullPage: true });
    await mobile.locator('.source-button').first().click();
    assert.equal(await mobile.locator('.summary-panel').count(), 0);
    await mobile.locator('#jump-latest').click();
    await mobile.setViewportSize({ width: 360, height: 800 });
    await overflow(mobile, '360px 채팅');
    await nav(mobile, 'explore'); await overflow(mobile, '360px 탐색');
    await mobile.locator('[data-open-group="walk"]').click(); await overflow(mobile, '360px 모임');
    await mobile.locator('[data-group-tab="정모"]').click();
    await mobile.locator('[data-action="new-meetup"]').click(); await overflow(mobile, '360px 정모 등록');
    await mobile.screenshot({ path: path.join(artifacts, 'prototype-mobile-meetup.png'), fullPage: true });
    await mobileContext.close();
    pass('390px 화면 및 360px 탐색·모임·채팅·요약·정모 overflow');

    const fileContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
    const filePage = await fileContext.newPage(); capture(filePage);
    await filePage.goto(pathToFileURL(path.resolve(__dirname, '../prototype/index.html')).href);
    await filePage.locator('.group-card').first().waitFor();
    assert.ok(await filePage.locator('.group-card').count() >= 6);
    await chat(filePage, 'walk');
    await filePage.locator('#message-input').fill('QA_FILE_PROTOCOL');
    await filePage.locator('#message-input').press('Enter');
    await filePage.reload(); await chat(filePage, 'walk');
    assert.ok((await filePage.locator('#message-stream').innerText()).includes('QA_FILE_PROTOCOL'));
    await fileContext.close();
    pass('file:// 직접 열기 렌더 및 로컬 메시지 저장');

    assert.deepEqual(errors, []); pass('브라우저 console 오류·pageerror 없음');
    fs.writeFileSync(path.join(artifacts, 'prototype-qa.json'), JSON.stringify({ ok: true, baseURL, checks, errors }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, 'prototype-qa-failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(artifacts, 'prototype-qa.json'), JSON.stringify({ ok: false, baseURL, checks, errors, failure: error.stack }, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
