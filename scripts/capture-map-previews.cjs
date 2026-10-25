'use strict';
// Capture five public OSM views for the local prototype. No API keys or generated map artwork.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Giry/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const output = path.resolve(__dirname, '../prototype/assets');
const places = [
  { id:'forest', name:'서울숲 방문자센터', address:'서울 성동구 뚝섬로 273 · 방문자센터', lat:37.5431392, lng:127.0418716, coordinateSourceURL:'https://www.openstreetmap.org/way/871884992' },
  { id:'station', name:'뚝섬역 8번 출구', address:'서울 성동구 아차산로 · 지하철 8번 출입구', lat:37.5474725, lng:127.0463171, coordinateSourceURL:'https://www.openstreetmap.org/node/3408545514' },
  { id:'seongsu', name:'성수연방', address:'서울 성동구 성수이로14길 14', lat:37.5414046, lng:127.0569119, coordinateSourceURL:'https://www.openstreetmap.org/node/13946959303', coordinateNote:'성수연방 주소의 입점 식당 POI로 확인한 건물 위치', addressSourceURL:'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=6fe583ec-1fe1-4c59-a5d8-83074b54852e' },
  { id:'mangwon', name:'망원한강공원 · 안내센터', address:'서울 마포구 마포나루길 467 · 망원안내센터', lat:37.5524392, lng:126.8997902, coordinateSourceURL:'https://www.openstreetmap.org/way/344056731', coordinateNote:'샘플 정모의 집결 위치인 망원안내센터 표시' },
  { id:'pangyo', name:'판교역', address:'경기 성남시 분당구 판교역로 · 경기 판교역', lat:37.3943732, lng:127.1111517, coordinateSourceURL:'https://www.openstreetmap.org/node/5927786493' }
];
(async () => {
  fs.mkdirSync(path.join(output, 'maps'), { recursive:true });
  const browser = await chromium.launch({ headless:true });
  const metadata = {};
  try {
    const context = await browser.newContext({ viewport:{width:960,height:560}, locale:'ko-KR' });
    const page = await context.newPage();
    for (const place of places) {
      const dx = .0044, dy = .002;
      const params = new URLSearchParams({ bbox:[place.lng-dx,place.lat-dy,place.lng+dx,place.lat+dy].join(','), layer:'mapnik', marker:[place.lat,place.lng].join(',') });
      const captureURL = 'https://www.openstreetmap.org/export/embed.html?' + params;
      const response = await page.goto(captureURL, { waitUntil:'networkidle', timeout:45000 });
      if (!response?.ok()) throw new Error(place.id + ' map response ' + response?.status());
      await page.waitForFunction(() => {
        const tiles = [...document.querySelectorAll('.leaflet-tile')];
        const leaflet = tiles.length >= 4 && tiles.every(img => img.complete && img.naturalWidth > 0) && document.querySelector('.leaflet-marker-icon');
        const maplibre = document.querySelector('.maplibregl-canvas') && document.querySelector('.maplibregl-marker');
        return Boolean(leaflet || maplibre);
      });
      await page.waitForTimeout(1000);
      await page.evaluate(({name}) => {
        const label = document.createElement('div');
        label.textContent = '📍 ' + name;
        label.style.cssText = 'position:absolute;top:18px;left:50%;transform:translateX(-50%);z-index:9999;background:white;padding:12px 20px;border:1px solid #e2e5e8;border-radius:12px;box-shadow:0 4px 16px #0002;font:600 20px/1.3 Arial,sans-serif;white-space:nowrap;color:#21362d';
        document.body.append(label);
      }, place);
      const attribution = await page.locator('.leaflet-control-attribution,.maplibregl-ctrl-attrib-inner').innerText();
      if (!/OpenStreetMap|오픈스트리트맵/.test(attribution)) throw new Error(place.id + ' attribution missing');
      await page.screenshot({ path:path.join(output,'maps',place.id+'.png') });
      metadata[place.id] = {
        ...place, image:'./assets/maps/'+place.id+'.png', sourceURL:'https://www.openstreetmap.org/?mlat='+place.lat+'&mlon='+place.lng+'#map=17/'+place.lat+'/'+place.lng,
        captureURL, attribution:'© OpenStreetMap contributors', attributionURL:'https://www.openstreetmap.org/copyright', license:'ODbL 1.0', capturedDate:'2026-10-26', kind:'public-map-screenshot', width:960, height:560
      };
      process.stdout.write('Captured '+place.id+': '+attribution+'\n');
    }
    fs.writeFileSync(path.join(output,'place-previews.json'),JSON.stringify(metadata,null,2));
    fs.writeFileSync(path.join(output,'map-previews.js'),'window.PLACE_PREVIEWS = '+JSON.stringify(metadata,null,2)+';\n');
    fs.writeFileSync(path.join(output,'maps','README.md'),'# 목적지 지도 미리보기\n\nOpenStreetMap 공개 지도에서 실제 타일과 목적지 마커를 캡처한 PNG입니다. 상단 장소명만 화면에 추가했으며 지도 데이터, 마커 위치, 하단 출처 표시는 보존했습니다.\n\n© OpenStreetMap contributors. 지도 데이터: ODbL 1.0.\nhttps://www.openstreetmap.org/copyright\n\n각 장소의 캡처 URL, 좌표 확인 원문, 주소, 날짜는 ../place-previews.json에 기록되어 있습니다. 정적 목적지 미리보기이며 실시간 교통 및 경로를 나타내지 않습니다.\n');
  } finally { await browser.close(); }
})().catch(error => { process.stderr.write(error.stack+'\n'); process.exitCode=1; });
