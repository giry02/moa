'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Giry/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:7261/';
const artifacts = path.resolve(__dirname, '../artifacts');
const checks = [], errors = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = name => { checks.push(name); process.stdout.write('PASS ' + name + '\n'); };
function capture(page) { page.on('pageerror', e => errors.push(e.message)); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); }); }
async function nav(page, name) { await page.locator(((await page.viewportSize()).width > 880 ? '#side-nav' : '#mobile-nav') + ' [data-page="' + name + '"]').click(); }
async function openChat(page, id) { await nav(page, 'chats'); await page.locator('[data-chat="' + id + '"]').click(); }
async function noOverflow(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
async function selectSummary(page, person) {
  await page.locator('[data-action="toggle-summary"]').click();
  await page.locator('[data-summary-target="person"]').click();
  await page.locator('#summary-person').selectOption(person);
  await page.locator('#summary-range').selectOption('today');
  await page.locator('[data-action="generate-summary"]').click();
  await page.locator('.summary-item').first().waitFor();
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    const page = await context.newPage(); capture(page); await page.goto(url);
    await page.locator('[data-action="new-group"]').click(); await noOverflow(page);
    const name = 'QA 새 모임 <em>함께</em>';
    await page.locator('#new-group-name').fill(name);
    await page.locator('#new-group-area').selectOption('서울 마포구');
    await page.locator('#new-group-category').selectOption('운동 / 스포츠');
    await page.locator('#new-group-description').fill('QA 신규 모임 저장 및 방별 메시지 확인');
    await page.locator('#new-group-capacity').fill('20');
    await page.locator('#new-group-mode').selectOption('approval');
    await page.locator('button[form="group-form"]').click();
    assert.equal(await page.locator('.detail-heading h1').innerText(), name);
    assert.equal(await page.locator('.detail-heading h1 em').count(), 0);
    await noOverflow(page);
    await page.locator('[data-action="members"]').click();
    assert.equal(await page.locator('.member-row').count(), 1);
    assert.match(await page.locator('.member-row').innerText(), /모임장/);
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await nav(page, 'mygroups');
    const card = page.locator('.group-card').filter({ hasText: name });
    assert.equal(await card.count(), 1);
    const id = await card.locator('[data-open-group]').getAttribute('data-open-group');
    await card.locator('[data-open-group]').click();
    await page.locator('[data-action="open-chat"]').click();
    assert.equal(await page.locator('.message').count(), 0);
    await page.locator('#message-input').fill('QA_CUSTOM_MESSAGE');
    await page.locator('#message-input').press('Enter');
    await page.reload(); await nav(page, 'mygroups');
    await page.locator('[data-open-group="' + id + '"]').click();
    assert.equal(await page.locator('.detail-heading h1').innerText(), name);
    await page.locator('[data-action="open-chat"]').click();
    assert.ok((await page.locator('#message-stream').innerText()).includes('QA_CUSTOM_MESSAGE'));
    await openChat(page, 'walk');
    assert.ok(!(await page.locator('#message-stream').innerText()).includes('QA_CUSTOM_MESSAGE'));
    pass('모임 생성·소개 escaping·내 모임·새 채팅방·새로고침 저장·360px overflow');

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZSsAAAAASUVORK5CYII=', 'base64');
    await page.locator('#image-file').setInputFiles({ name: 'qa-image.png', mimeType: 'image/png', buffer: png });
    await page.locator('#send-message').click();
    await page.locator('[data-image-message]').click();
    await page.waitForFunction(() => document.querySelector('.image-full')?.naturalWidth > 0);
    await noOverflow(page); await page.getByRole('button', { name: '닫기', exact: true }).click();
    pass('첨부 이미지 클릭 확대·닫기');

    await page.locator('[data-action="toggle-summary"]').click();
    await page.getByRole('button', { name: '요약 닫기' }).click();
    await page.locator('[data-action="toggle-summary"]').click();
    await page.waitForFunction(() => !document.querySelector('.summary-loading'));
    assert.ok(await page.locator('[data-action="generate-summary"]').isEnabled());
    await page.locator('.summary-scrim').evaluate(el => el.click());
    assert.equal(await page.locator('.summary-panel').count(), 0);
    pass('요약 생성 중 닫기·재열기 및 backdrop 닫기');
    await context.close();

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    const dp = await desktop.newPage(); capture(dp); await dp.goto(url);
    await dp.screenshot({ path: path.join(artifacts, 'prototype-desktop-explore.png'), fullPage: true });
    await openChat(dp, 'walk'); await selectSummary(dp, 'minji');
    await dp.locator('.source-button').first().click(); await wait(3600);
    await dp.screenshot({ path: path.join(artifacts, 'prototype-desktop-chat.png'), fullPage: true });
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', isMobile: true, hasTouch: true });
    const mp = await mobile.newPage(); capture(mp); await mp.goto(url);
    await mp.screenshot({ path: path.join(artifacts, 'prototype-mobile-explore.png'), fullPage: true });
    await openChat(mp, 'walk'); await selectSummary(mp, 'junho'); await noOverflow(mp);
    await mp.screenshot({ path: path.join(artifacts, 'prototype-mobile-chat.png'), fullPage: true });
    await mp.getByRole('button', { name: '요약 닫기' }).click();
    await mp.screenshot({ path: path.join(artifacts, 'prototype-mobile-chat-room.png'), fullPage: true });
    await nav(mp, 'mygroups'); await mp.locator('[data-open-group="walk"]').click();
    await mp.locator('[data-group-tab="정모"]').click(); await mp.locator('[data-action="new-meetup"]').click();
    await mp.screenshot({ path: path.join(artifacts, 'prototype-mobile-meetup.png'), fullPage: true });
    await desktop.close(); await mobile.close();
    assert.deepEqual(errors, []);
    pass('최종 1440px·390px 깨끗한 스크린샷 및 console 오류 0');
    const failureFile = path.join(artifacts, 'prototype-qa-failure.png');
    if (fs.existsSync(failureFile)) fs.unlinkSync(failureFile);
    fs.writeFileSync(path.join(artifacts, 'prototype-final-qa.json'), JSON.stringify({ ok: true, checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
