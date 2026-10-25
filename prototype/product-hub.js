'use strict';
(() => {
  const api=window.Moyobom;if(!api)return;
  const {esc,icon}=api,KEY='moyeobom-product-extras-v1';
  let prefs={theme:'garden',promotions:{}};
  try {const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)prefs={...prefs,...saved};}catch{}
  prefs.promotions||={};
  const themes=[{id:'garden',name:'정원의 오후',color:'#8b9c72',background:'#eff2eb'},{id:'ocean',name:'바다의 편지',color:'#4b829c',background:'#e7f0f6'},{id:'peach',name:'복숭아빛 하루',color:'#bd7b71',background:'#f9ece7'}];
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs));return true;}catch{api.toast('변경은 적용됐지만 브라우저에 저장할 수 없어요.');return false;}};
  const shortcut=(page,symbol,title,desc)=>`<button type="button" class="hub-shortcut" data-page="${page}"><span>${icon(symbol)}</span><span><strong>${title}</strong><small>${desc}</small></span>${icon('arrow')}</button>`;
  function quickLinks(){return `<nav class="hub-shortcuts" aria-label="내 모임 편의 기능">${shortcut('calendar','calendar','통합 캘린더','여러 모임의 일정을 한눈에')}${shortcut('saved','book','보관함 · 조건 알림','저장한 정모와 맞춤 발견')}${shortcut('benefits','sparkles','편의 · 꾸미기','채팅 테마와 모집 도구')}</nav>`;}
  function applyTheme(){const theme=themes.find(t=>t.id===prefs.theme)||themes[0];document.body.dataset.chatTheme=theme.id;document.documentElement.style.setProperty('--hub-chat-bg',theme.background);}
  function promoModal(){
    const joined=api.groups.filter(g=>api.state.joined.has(g.id));
    if(!joined.length){api.toast('모임에 가입하면 모집 도구를 체험할 수 있어요.');return;}
    api.openModal('모집 부스트 · 카드 강조',`<p class="hub-info">무료 체험 화면이에요. 선택한 모임을 이 브라우저의 탐색 화면에 7일간 표시해요.</p><form id="hub-promotion-form"><label>대상 모임<select name="groupId">${joined.map(g=>`<option value="${esc(g.id)}" ${g.id===api.state.groupId?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><label>표시 방식<select name="kind"><option value="boost">부스트 · 별도 상단 카드</option><option value="highlight">강조 · 기존 카드 테두리</option></select></label><label>모집 한마디<input name="copy" maxlength="48" value="이번 주말, 새로운 취미 친구를 만나요" required></label><p class="hub-info">해당 모임의 지역·관심사 조건에 맞을 때만 보여요. 실제 광고·결제·노출 집계는 연결되지 않았어요.</p></form>`,`<button type="button" class="button" data-action="close-modal">닫기</button><button type="submit" form="hub-promotion-form" class="button primary">무료로 미리 적용</button>`);
  }
  function benefits(){
    return `<div class="page-heading"><div><div class="eyebrow">MORE WAYS TOGETHER</div><h1>편의 · 꾸미기</h1><p>여러 모임을 더 편하게, 우리 모임을 더 우리답게.</p></div></div><div class="hub-info">프로토타입에서는 모든 기능을 무료로 체험해요. 구독·결제는 연결되지 않았어요.</div>${quickLinks()}<section class="hub-panel"><div class="section-heading"><h2>나의 채팅 테마</h2><span class="pill">이 앱에서만 적용</span></div><div class="hub-theme-grid">${themes.map(t=>`<button type="button" class="hub-theme ${prefs.theme===t.id?'selected':''}" data-hub-theme="${t.id}" aria-pressed="${prefs.theme===t.id}"><span class="hub-theme-preview" style="background:${t.background};--theme-color:${t.color}"><i>이번 주말에 만나요 🌿</i><b>좋아요!</b></span><strong>${t.name}</strong><small>${prefs.theme===t.id?'사용 중':'이 테마 사용'}</small></button>`).join('')}</div><p class="hub-info">글자 크기는 모바일 채팅방의 ⋯ → 채팅 글자 크기에서 바로 조절할 수 있어요.</p></section><section class="hub-panel"><div class="section-heading"><h2>표현을 더 풍성하게</h2><span class="pill">4팩 · 34종</span></div><p>토끼·고양이·곰·오리 이모티콘을 채팅방의 웃는 얼굴 버튼에서 골라 보세요.</p><div class="hub-pack-preview">${(window.MoyobomStickers?.packs||[]).map(p=>{const s=window.MoyobomStickers.get(p.coverId);return `<div>${s?`<img src="${esc(s.src)}" alt="${esc(p.name)}">`:''}<span>${esc(p.shortName||p.name)}</span></div>`;}).join('')}</div></section><section class="hub-panel"><div class="section-heading"><h2>모임 운영 도구</h2><span class="pill">운영자 체험</span></div><p>반복 정모, 대기자, 출석 확인과 회비 장부를 모임별로 관리해요.</p><div class="hub-actions"><button type="button" class="button primary" data-page="operations">${icon('users')}운영 도구 열기</button><button type="button" class="button" data-hub-action="promotion">${icon('sparkles')}모집 부스트 · 카드 강조</button></div><div class="hub-promotion-list">${Object.entries(prefs.promotions).filter(([,p])=>p.until>Date.now()).map(([id,p])=>`<div><span><strong>${esc(api.groups.find(g=>g.id===id)?.name||'모임')}</strong><small>${p.kind==='boost'?'상단 부스트':'카드 강조'} 체험 · ${new Date(p.until).toLocaleDateString('ko-KR')}까지</small></span><button type="button" class="button small" data-hub-cancel="${esc(id)}">체험 해제</button></div>`).join('')}</div></section>`;
  }
  function paintPromotions(){
    const results=api.$('#explore-results');if(!results)return;
    api.$$('.hub-sponsored').forEach(el=>el.remove());
    for(const [id,p] of Object.entries(prefs.promotions)){
      const g=api.groups.find(g=>g.id===id);if(!g||p.until<=Date.now())continue;
      const card=results.querySelector(`[data-open-group="${CSS.escape(id)}"]`);if(!card)continue;
      if(p.kind==='highlight'){const shell=card.closest('.group-card')||card;shell.classList.add('hub-highlight');if(!shell.querySelector('.hub-ad-label'))shell.insertAdjacentHTML('afterbegin','<span class="hub-ad-label">강조 체험</span>');}
      else {results.insertAdjacentHTML('beforebegin',`<aside class="hub-sponsored"><span class="hub-ad-label">광고 · 부스트 체험</span><button type="button" data-open-group="${esc(id)}"><span style="background:${esc(g.bg)}">${g.emoji}</span><span><strong>${esc(g.name)}</strong><small>${esc(p.copy)}</small><em>${esc(g.area)} · ${esc(g.category)}</em></span>${icon('arrow')}</button></aside>`);}
    }
  }
  let exploreObserver;
  function afterRender(){
    exploreObserver?.disconnect();
    applyTheme();
    if(['mygroups','my'].includes(api.state.page)&&!api.$('.hub-shortcuts'))api.$('.page-heading')?.insertAdjacentHTML('afterend',quickLinks());
    if(api.state.page==='explore'){
      const heading=api.$('.page-heading');if(heading&&!heading.querySelector('[data-page="calendar"]'))heading.insertAdjacentHTML('beforeend',`<button type="button" class="button" data-page="calendar">${icon('calendar')}전체 일정</button>`);
      paintPromotions();
      const results=api.$('#explore-results');if(results){exploreObserver=new MutationObserver(paintPromotions);exploreObserver.observe(results,{childList:true});}
    }
    if(api.state.page==='group'&&api.state.joined.has(api.state.groupId)){
      const target=api.state.groupTab==='홈'?api.$('.cm-home-foot'):api.state.groupTab==='정모'?api.$('.detail-body .section-heading'):null;
      if(target&&!target.querySelector('[data-hub-operations]'))target.insertAdjacentHTML('beforeend',`<button type="button" class="button small" data-hub-operations="${esc(api.state.groupId)}">모임 운영</button>`);
    }
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-hub-theme],[data-hub-action],[data-hub-cancel],[data-hub-operations]');if(!target)return;
    if(target.dataset.hubOperations)window.MoyobomOperations?.open({groupId:target.dataset.hubOperations});
    if(target.dataset.hubTheme){prefs.theme=target.dataset.hubTheme;save();api.render();api.toast('나의 채팅 테마를 적용했어요.');}
    if(target.dataset.hubAction==='promotion')promoModal();
    if(target.dataset.hubCancel){delete prefs.promotions[target.dataset.hubCancel];save();api.render();}
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='hub-promotion-form')return;event.preventDefault();
    const form=event.target,groupId=form.elements.groupId.value;if(!api.state.joined.has(groupId))return;
    prefs.promotions[groupId]={kind:form.elements.kind.value,copy:form.elements.copy.value.trim().slice(0,48),until:Date.now()+7*86400000};
    save();api.changePage('explore');api.toast('7일간의 모집 표시 체험을 적용했어요.');
  });
  document.addEventListener('input',event=>{if(event.target.closest('.search-field,.search-box'))queueMicrotask(paintPromotions);});
  document.addEventListener('change',event=>{if(event.target.id==='area-filter')queueMicrotask(paintPromotions);});
  document.addEventListener('click',event=>{if(event.target.closest('[data-category]'))queueMicrotask(paintPromotions);});
  api.registerExtension('product-extras',{renderPage(page){if(page==='benefits')return benefits();},afterRender});
})();
