'use strict';

/* Original vector characters made for this prototype; no third-party sticker art. */
(() => {
  const ink='#514d47', cream='#fff9e7', mint='#adc9b6', coral='#ef9b91';
  const entries=[
    ['bunny-hi','안녕!','안녕!', 'wave'],
    ['bunny-love','좋아해','마음 전해요','love'],
    ['bunny-cheer','할 수 있어','응원해요!','cheer'],
    ['bunny-thanks','고마워','고마워요','thanks'],
    ['bunny-laugh','하하하','하하하!','laugh'],
    ['bunny-tears','훌쩍','훌쩍…','tears'],
    ['bunny-sleep','잘 자','좋은 꿈 꿔요','sleep'],
    ['bunny-coffee','커피 한 잔','커피 한 잔?','coffee'],
    ['bunny-okay','좋아요','좋아요!','okay'],
    ['bunny-nope','잠깐만','잠깐만요','nope']
  ];
  function art(label,pose) {
    const smiling=['laugh','cheer','thanks','sleep'].includes(pose);
    const eyes=smiling?`<path d="M87 106q7-9 14 0m35 0q7-9 14 0" fill="none"/>`:`<ellipse cx="96" cy="105" rx="3.8" ry="5.4" fill="${ink}"/><ellipse cx="143" cy="105" rx="3.8" ry="5.4" fill="${ink}"/>`;
    const mouth=pose==='laugh'?`<path d="M110 120q10 23 21 0Z" fill="#df9f92"/>`:pose==='tears'?`<path d="M111 127q9-9 18 0" fill="none"/>`:`<path d="M112 119q8 10 16 0" fill="none"/>`;
    const ornament={
      wave:`<path d="M65 147Q28 113 45 96q17-11 27 30" fill="${cream}"/><path d="M28 91l-8-7m15-2-2-11m15 5 4-10" fill="none" stroke="${mint}"/>`,
      love:`<path d="M120 164c-38-26-40-44-24-50 12-4 20 7 24 12 5-5 13-16 25-12 16 6 14 24-25 50Z" fill="${coral}" stroke="none"/><ellipse cx="91" cy="151" rx="13" ry="9" fill="${cream}"/><ellipse cx="149" cy="151" rx="13" ry="9" fill="${cream}"/>`,
      cheer:`<path d="M65 146Q32 112 47 99q14-10 28 26m100 21q33-34 18-47-14-10-28 26" fill="${cream}"/><path d="m40 66 4-10 5 10 11 2-9 7 2 11-9-6-10 6 2-11-8-7Zm147 10 4-10 5 10 11 2-9 7 2 11-9-6-10 6 2-11-8-7Z" fill="#edc46b" stroke="none"/>`,
      thanks:`<ellipse cx="111" cy="153" rx="14" ry="10" transform="rotate(-25 111 153)" fill="${cream}"/><ellipse cx="130" cy="153" rx="14" ry="10" transform="rotate(25 130 153)" fill="${cream}"/><path d="m43 111 9 4m-7 6 8-1m136-9-9 4m7 6-8-1" stroke="${coral}"/>`,
      laugh:`<path d="M65 150q-15-14-24-1m134 1q15-14 24-1" fill="none"/><path d="M40 126q-8-7-2-16m161 16q8-7 2-16" fill="none" stroke="${mint}"/>`,
      tears:`<path d="M87 115q-13 20 0 20 13 0 0-20m66 0q-13 20 0 20 13 0 0-20" fill="#a7cddd" stroke="none"/><ellipse cx="85" cy="157" rx="13" ry="10" fill="${cream}"/><ellipse cx="155" cy="157" rx="13" ry="10" fill="${cream}"/>`,
      sleep:`<path d="M174 51q-7 23 16 24-26 15-31-10-2-9 15-14Z" fill="#edcc75" stroke="none"/><text x="187" y="111" font-size="18" fill="${mint}" stroke="none" font-weight="700">z</text><text x="202" y="91" font-size="24" fill="${mint}" stroke="none" font-weight="700">z</text><path d="M66 168q54 25 108 0v25H66Z" fill="#d8e5d8" stroke="none"/>`,
      coffee:`<path d="M94 145h46v29q-22 18-46 0Z" fill="#d5b99d"/><path d="M140 148q26-3 16 17-5 8-16 6m-34-33q-7-9 0-16m14 16q-7-9 0-16" fill="none"/><ellipse cx="87" cy="161" rx="12" ry="9" fill="${cream}"/>`,
      okay:`<path d="M167 166V102" fill="none"/><rect x="165" y="94" width="48" height="42" rx="9" fill="${mint}" stroke="none"/><path d="m176 114 9 9 16-20" fill="none" stroke="#fff" stroke-width="5"/><ellipse cx="162" cy="155" rx="14" ry="10" fill="${cream}"/>`,
      nope:`<ellipse cx="64" cy="144" rx="14" ry="20" transform="rotate(-20 64 144)" fill="${cream}"/><ellipse cx="176" cy="144" rx="14" ry="20" transform="rotate(20 176 144)" fill="${cream}"/><path d="M36 112v-10m8 12v-10m150 8v-10m8 12v-10" stroke="${coral}" fill="none"/>`
    }[pose];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="120" cy="185" rx="61" ry="8" fill="#c9d4c5" opacity=".34" stroke="none"/><ellipse cx="120" cy="153" rx="49" ry="39" fill="${cream}"/><ellipse cx="87" cy="59" rx="15" ry="39" transform="rotate(-13 87 59)" fill="${cream}"/><ellipse cx="147" cy="61" rx="16" ry="39" transform="rotate(18 147 61)" fill="${cream}"/><path d="M83 34q-4 24 7 44m61-42q3 22-9 42" stroke="#edcfc2" stroke-width="8"/><path d="M63 106c0-36 28-48 57-48s57 12 57 48c0 35-25 45-57 45s-57-10-57-45Z" fill="${cream}"/><ellipse cx="80" cy="119" rx="11" ry="6" fill="${coral}" opacity=".56" stroke="none"/><ellipse cx="160" cy="119" rx="11" ry="6" fill="${coral}" opacity=".56" stroke="none"/>${eyes}${mouth}<path d="m94 143 26 10 26-10-9 19-17-9-17 9Z" fill="${mint}" stroke="none"/>${ornament}<ellipse cx="95" cy="186" rx="18" ry="9" fill="${cream}"/><ellipse cx="145" cy="186" rx="18" ry="9" fill="${cream}"/></g><text x="120" y="224" text-anchor="middle" font-family="Arial,'Malgun Gothic',sans-serif" font-size="20" font-weight="700" fill="${ink}">${label}</text></svg>`;
  }
  const stickers=entries.map(([id,name,label,pose])=>{const svg=art(label,pose);return Object.freeze({id,name,label,pack:'bunny',svg,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});});
  window.MoyobomStickers=Object.freeze({packName:'포근 토끼의 하루',stickers:Object.freeze(stickers),get:id=>stickers.find(s=>s.id===id)||null});
})();
