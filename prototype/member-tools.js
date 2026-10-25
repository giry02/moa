'use strict';

/* Member reading and discovery tools. Kept separate from membership and chat data. */
(() => {
  const api=window.Moyobom;if(!api)return;
  const KEY='moyeobom-member-tools-v1',MAX_CONDITIONS=10;
  const $=api.$,esc=api.esc;
  const times={any:'모든 시간',morning:'오전 06–12시',afternoon:'오후 12–18시',evening:'저녁 18–24시',night:'새벽 00–06시'};
  const weekdays={any:'모든 요일',weekend:'주말',weekdays:'평일','0':'일요일','1':'월요일','2':'화요일','3':'수요일','4':'목요일','5':'금요일','6':'토요일'};
  const defaults=()=>({version:1,saved:[],collections:[],conditions:[],notifications:[]});
  let data=defaults(),view='saved',collection='all',membership='all',activeCondition=null,storageWarning=false;
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    if(raw?.version===1){
      const collections=(Array.isArray(raw.collections)?raw.collections:[]).filter(x=>x&&typeof x.id==='string'&&/^collection-[\w-]+$/.test(x.id)&&typeof x.name==='string').slice(0,8).map(x=>({id:x.id,name:x.name.slice(0,24)}));
      const ids=new Set(collections.map(x=>x.id));
      data={version:1,collections,saved:(Array.isArray(raw.saved)?raw.saved:[]).filter(x=>x&&typeof x.id==='string').slice(0,300).map(x=>({id:x.id,collection:ids.has(x.collection)?x.collection:null,at:Number(x.at)||0})),conditions:(Array.isArray(raw.conditions)?raw.conditions:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.area==='string'&&typeof x.category==='string'&&Object.hasOwn(weekdays,x.weekday)&&Object.hasOwn(times,x.time)).slice(0,MAX_CONDITIONS).map(x=>({id:x.id,name:x.name.slice(0,40),area:x.area.slice(0,80),category:x.category.slice(0,100),weekday:x.weekday,time:x.time,enabled:x.enabled!==false,seen:Array.isArray(x.seen)?x.seen.filter(k=>typeof k==='string').slice(-500):[]})),notifications:(Array.isArray(raw.notifications)?raw.notifications:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.meetupId==='string'&&typeof x.conditionId==='string').slice(0,60).map(x=>({id:x.id,meetupId:x.meetupId,conditionId:x.conditionId,conditionName:String(x.conditionName||'저장한 조건').slice(0,40),read:x.read===true,at:Number(x.at)||0}))};
    }
  }catch{}
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const groupFor=m=>api.groups.find(g=>g.id===m.groupId);
  const placeFor=m=>api.places.find(p=>p.id===m.placeId);
  const allMeetups=()=>api.state.meetups.filter(m=>groupFor(m)&&Number.isFinite(api.meetupAt(m)));
  const unique=items=>[...new Set(items)];
  const areas=()=>unique(api.groups.map(g=>g.area));
  const categories=()=>unique(api.groups.map(g=>g.category));
  function meetupArea(m){const address=(placeFor(m)?.address||'').replace(/\s/g,'');return areas().find(a=>address.includes(a.replace(/\s/g,'')))||groupFor(m)?.area||'';}
  const kstParts=m=>{const d=new Date(api.meetupAt(m)+9*3600000);return{day:d.getUTCDay(),hour:d.getUTCHours()};};
  function matches(m,c){
    const g=groupFor(m);if(!g)return false;
    const {day,hour}=kstParts(m);
    return(c.area==='all'||meetupArea(m)===c.area)&&(c.category==='all'||g.category===c.category)&&(c.weekday==='any'||(c.weekday==='weekend'?day===0||day===6:c.weekday==='weekdays'?day>=1&&day<=5:day===Number(c.weekday)))&&(c.time==='any'||c.time==='morning'&&hour>=6&&hour<12||c.time==='afternoon'&&hour>=12&&hour<18||c.time==='evening'&&hour>=18||c.time==='night'&&hour<6);
  }
  const matchKey=m=>m.id+'|'+m.date+'|'+m.placeId;
  const matchList=c=>allMeetups().filter(m=>matches(m,c)).sort((a,b)=>api.meetupAt(a)-api.meetupAt(b));
  function notifyChange(){window.dispatchEvent(new CustomEvent('moyobom-member-tools-change',{detail:{saved:data.saved.length,unread:notificationCount()}}));}
  function persist(){
    try{localStorage.setItem(KEY,JSON.stringify(data));storageWarning=false;notifyChange();return true;}
    catch{if(!storageWarning)api.toast('저장 공간이 부족해 변경을 저장하지 못했어요.');storageWarning=true;return false;}
  }
  function commit(change){const before=JSON.stringify(data);change();if(persist())return true;data=JSON.parse(before);return false;}
  function syncMatches(){
    let added=0,changed=false;const before=JSON.stringify(data);
    for(const condition of data.conditions){
      const current=matchList(condition),seen=new Set(condition.seen);
      for(const m of current){const key=matchKey(m);if(seen.has(key))continue;seen.add(key);changed=true;
        if(condition.enabled){data.notifications.unshift({id:uid('match'),meetupId:m.id,conditionId:condition.id,conditionName:condition.name,read:false,at:Date.now()});added++;}
      }
      condition.seen=[...seen].slice(-500);
    }
    data.notifications=data.notifications.slice(0,60);
    if(changed&&!persist()){data=JSON.parse(before);return 0;}
    return added;
  }
  const notificationCount=()=>data.notifications.filter(n=>!n.read&&allMeetups().some(m=>m.id===n.meetupId)).length;
  const isSaved=id=>data.saved.some(x=>x.id===id);
  const bookmarkIcon=()=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>';
  function saveButton(id,compact=false){const saved=isSaved(id),m=allMeetups().find(x=>x.id===id);return `<button type="button" class="mt-save-button ${saved?'is-saved':''} ${compact?'is-compact':''}" data-member-action="toggle-save" data-member-id="${esc(id)}" aria-pressed="${saved}" aria-label="${esc(m?.title||'정모')} ${saved?'저장 해제':'저장'}">${bookmarkIcon()}<span>${saved?'저장됨':'정모 저장'}</span></button>`;}
  function refreshSaveButtons(){document.querySelectorAll('[data-member-action="toggle-save"]').forEach(button=>{const id=button.dataset.memberId,saved=isSaved(id),m=allMeetups().find(x=>x.id===id);button.classList.toggle('is-saved',saved);button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',(m?.title||'정모')+' '+(saved?'저장 해제':'저장'));const label=button.querySelector('span');if(label)label.textContent=saved?'저장됨':'정모 저장';});}
  function toggle(id){
    if(!allMeetups().some(m=>m.id===id))return false;
    const saved=isSaved(id);if(!commit(()=>{if(saved)data.saved=data.saved.filter(x=>x.id!==id);else data.saved.unshift({id,collection:null,at:Date.now()});}))return saved;
    refreshSaveButtons();if(api.state.page==='saved')api.render();api.toast(saved?'저장한 정모에서 뺐어요.':'나중에 볼 정모로 저장했어요.');return!saved;
  }
  function conditionText(c){return[c.area==='all'?'모든 지역':c.area,c.category==='all'?'모든 관심사':c.category.split(' / ')[0],weekdays[c.weekday],times[c.time]].join(' · ');}
  function card(m,withCollection=false){
    const g=groupFor(m),p=placeFor(m),saved=data.saved.find(x=>x.id===m.id),joined=api.state.joined.has(m.groupId);
    return `<article class="mt-meetup" data-member-meetup="${esc(m.id)}"><div class="mt-meetup-main"><button type="button" class="mt-meetup-open" data-meetup="${esc(m.id)}"><small>${esc(g.name)} <span class="mt-membership">${joined?'가입한 모임':'가입 후 참석'}</span></small><strong>${esc(m.title)}</strong><span>${api.icon('calendar')}${esc(api.dateLabel(api.meetupAt(m)))} · ${esc(api.time(api.meetupAt(m)))}</span><span>${api.icon('pin')}${esc(p?.name||meetupArea(m))}</span></button>${saveButton(m.id,true)}</div>${withCollection&&saved?`<label class="mt-collection-select"><span>모음</span><select data-member-collection="${esc(m.id)}" aria-label="${esc(m.title)} 모음"><option value="">기본 모음</option>${data.collections.map(c=>`<option value="${esc(c.id)}" ${saved.collection===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`:''}</article>`;
  }
  const empty=(title,text,action='new-condition',label='발견 조건 만들기')=>`<div class="mt-empty">${bookmarkIcon()}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action?`<button type="button" class="button soft" data-member-action="${action}">${esc(label)}</button>`:''}</div>`;
  function conditionCard(c){const count=matchList(c).length;return `<article class="mt-condition ${activeCondition===c.id?'is-active':''}"><div class="mt-condition-heading"><div><h3>${esc(c.name)}</h3><p>${esc(conditionText(c))}</p></div><label class="mt-alert-toggle"><input type="checkbox" data-member-condition-alert="${esc(c.id)}" ${c.enabled?'checked':''}><span>앱 내 알림</span></label></div><div class="mt-condition-actions"><button type="button" class="button small soft" data-member-action="condition-results" data-member-id="${esc(c.id)}">맞는 정모 ${count}개 보기</button><button type="button" class="button small ghost" data-member-action="edit-condition" data-member-id="${esc(c.id)}">수정</button><button type="button" class="button small ghost" data-member-action="delete-condition" data-member-id="${esc(c.id)}">삭제</button></div></article>`;}
  function savedContent(){
    const savedIds=new Set(data.saved.filter(x=>collection==='all'||x.collection===collection).map(x=>x.id));
    const list=allMeetups().filter(m=>savedIds.has(m.id)&&(membership==='all'||api.state.joined.has(m.groupId))).sort((a,b)=>api.meetupAt(a)-api.meetupAt(b));
    return `<div class="mt-collection-bar" aria-label="저장 모음"><button type="button" class="${collection==='all'?'active':''}" data-member-action="collection" data-member-id="all">전체 모음 <span>${data.saved.length}</span></button>${data.collections.map(c=>`<button type="button" class="${collection===c.id?'active':''}" data-member-action="collection" data-member-id="${esc(c.id)}">${esc(c.name)} <span>${data.saved.filter(x=>x.collection===c.id).length}</span></button>`).join('')}<button type="button" class="mt-add-collection" data-member-action="new-collection">+ 새 모음</button></div><div class="mt-section-line"><p>저장해 둔 정모 ${list.length}개</p><label><span class="sr-only">모임 가입 기준</span><select id="mt-membership-filter"><option value="all" ${membership==='all'?'selected':''}>모든 모임</option><option value="joined" ${membership==='joined'?'selected':''}>가입한 모임</option></select></label>${collection!=='all'?'<button type="button" class="button small ghost" data-member-action="delete-collection">모음 삭제</button>':''}</div>${list.length?`<div class="mt-meetup-list">${list.map(m=>card(m,true)).join('')}</div>`:empty('아껴 둔 정모를 모아 보세요','정모 카드의 저장 버튼을 누르면 이곳에서 다시 볼 수 있어요.')}<p class="mt-footnote">정모 저장은 참석 신청과 별개예요. 참석과 대화방 입장은 해당 모임의 가입·참석 조건을 따라요.</p>`;
  }
  function conditionsContent(){const selected=data.conditions.find(c=>c.id===activeCondition);return `<div class="mt-section-line"><p>지역부터 가능한 시간까지, 내 취향을 기억해요.</p><button type="button" class="button soft" data-member-action="new-condition">${api.icon('plus')}조건 만들기</button></div>${data.conditions.length?`<div class="mt-condition-list">${data.conditions.map(conditionCard).join('')}</div>`:empty('어떤 만남을 찾고 있나요?','지역·관심사·요일·시간을 저장하고 맞는 정모를 확인해 보세요.')} ${selected?`<section class="mt-matches" aria-label="발견 조건에 맞는 정모"><div class="mt-section-line"><h2>${esc(selected.name)}에 맞는 정모</h2><span>${matchList(selected).length}개</span></div>${matchList(selected).length?`<div class="mt-meetup-list">${matchList(selected).map(m=>card(m)).join('')}</div>`:empty('조건에 맞는 정모가 아직 없어요','조건을 조금 넓히거나 새 정모를 기다려 보세요.','edit-active','조건 수정')}</section>`:''}<p class="mt-footnote">실제 등록된 정모의 장소·모임 관심사·한국 시간 일정을 비교해요. 종료된 정모도 기록을 확인할 수 있어요.</p>`;}
  function notificationsContent(){const list=data.notifications.filter(n=>allMeetups().some(m=>m.id===n.meetupId));return `<div class="mt-section-line"><p>저장한 조건에 새로 맞는 정모예요.</p><button type="button" class="button small" data-member-action="read-all">모두 읽음</button></div><div class="mt-match-alerts">${list.length?list.map(n=>{const m=allMeetups().find(x=>x.id===n.meetupId);return `<article class="mt-match-alert ${n.read?'':'is-unread'}"><div><span>${n.read?'확인한 정모':'새 매칭'}</span><small>${esc(n.conditionName)}</small><button type="button" data-member-action="open-match" data-member-id="${esc(n.id)}"><strong>${esc(m.title)}</strong><p>${esc(api.dateLabel(api.meetupAt(m)))} · ${esc(api.time(api.meetupAt(m)))} · ${esc(placeFor(m)?.name||meetupArea(m))}</p></button></div>${saveButton(m.id,true)}</article>`;}).join(''):empty('새 매칭 소식을 기다리고 있어요','발견 조건을 저장하면 이후 새로 등록되거나 일정이 바뀌어 맞게 된 정모를 알려드려요.','new-condition','조건 만들기')}</div><p class="mt-footnote">앱 안의 매칭 알림이에요. 이 시안은 화면을 열 때 등록된 정모를 확인하며 기기 푸시를 발송하지 않아요.</p>`;}
  function renderPage(){
    return `<div class="mt-page"><div class="page-heading"><div><div class="eyebrow">MY PICKS</div><h1>저장 · 발견</h1><p>마음에 드는 정모와 나에게 맞는 만남을 모아요.</p></div></div><nav class="mt-tabs" aria-label="저장과 발견"><button type="button" data-member-action="view" data-member-id="saved" class="${view==='saved'?'active':''}" aria-current="${view==='saved'?'page':'false'}">저장한 정모 <span>${data.saved.length}</span></button><button type="button" data-member-action="view" data-member-id="conditions" class="${view==='conditions'?'active':''}" aria-current="${view==='conditions'?'page':'false'}">발견 조건 <span>${data.conditions.length}</span></button><button type="button" data-member-action="view" data-member-id="notifications" class="${view==='notifications'?'active':''}" aria-current="${view==='notifications'?'page':'false'}">새 매칭 ${notificationCount()?`<span class="mt-unread-count">${notificationCount()}</span>`:''}</button></nav>${view==='conditions'?conditionsContent():view==='notifications'?notificationsContent():savedContent()}</div>`;
  }
  function openConditionForm(id){
    const existing=data.conditions.find(c=>c.id===id);if(!existing&&data.conditions.length>=MAX_CONDITIONS){api.toast('발견 조건은 최대 10개까지 저장할 수 있어요.');return;}
    const c=existing||{name:'',area:areas().includes(api.state.area)?api.state.area:'all',category:categories().includes(api.state.category)?api.state.category:'all',weekday:'any',time:'any',enabled:true};
    api.state.modal={type:'member-condition',id:existing?.id||null};
    api.openModal(existing?'발견 조건 수정':'발견 조건 저장',`<form id="mt-condition-form" class="mt-form" data-condition-id="${esc(existing?.id||'')}"><label>조건 이름<input id="mt-condition-name" name="name" maxlength="40" value="${esc(c.name)}" placeholder="예: 성수 주말 오전 산책" required></label><div class="mt-form-grid"><label>만나는 지역<select name="area" id="mt-condition-area"><option value="all">모든 지역</option>${areas().map(x=>`<option value="${esc(x)}" ${c.area===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>관심사<select name="category" id="mt-condition-category"><option value="all">모든 관심사</option>${categories().map(x=>`<option value="${esc(x)}" ${c.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>요일<select name="weekday" id="mt-condition-weekday">${Object.entries(weekdays).map(([key,label])=>`<option value="${key}" ${c.weekday===key?'selected':''}>${label}</option>`).join('')}</select></label><label>시간대<select name="time" id="mt-condition-time">${Object.entries(times).map(([key,label])=>`<option value="${key}" ${c.time===key?'selected':''}>${label}</option>`).join('')}</select></label></div><label class="mt-form-checkbox"><input name="enabled" type="checkbox" ${c.enabled?'checked':''}><span>새로 맞는 정모를 앱 안에서 알려주세요</span></label><p class="mt-form-help">지금 등록된 정모부터 바로 비교해요. 조건을 저장한 뒤 추가되거나 일정이 바뀐 정모는 ‘새 매칭’에 모아요.</p><p class="mt-form-error" id="mt-condition-error" role="alert" hidden></p></form>`,`<button type="button" class="button" data-action="close-modal">취소</button><button type="submit" form="mt-condition-form" class="button primary">조건 저장</button>`);
  }
  function openCollectionForm(){if(data.collections.length>=8){api.toast('모음은 최대 8개까지 만들 수 있어요.');return;}api.state.modal={type:'member-collection'};api.openModal('새 모음',`<form id="mt-collection-form" class="mt-form"><label>모음 이름<input name="name" maxlength="24" placeholder="예: 가 보고 싶은 산책" required></label><p class="mt-form-help">저장한 정모를 모음별로 나눠 볼 수 있어요.</p><p id="mt-collection-error" class="mt-form-error" role="alert" hidden></p></form>`,`<button type="button" class="button" data-action="close-modal">취소</button><button type="submit" form="mt-collection-form" class="button primary">만들기</button>`);}
  function afterRender(){
    syncMatches();
    if(api.state.page==='explore'&&!$('.mt-explore-actions'))$('.page-heading')?.insertAdjacentHTML('afterend',`<div class="mt-explore-actions"><button type="button" class="button small" data-member-action="new-condition">${bookmarkIcon()}이 조건으로 정모 찾기</button><button type="button" class="mt-saved-link" data-member-action="open-saved">저장 · 발견${notificationCount()?`<span class="mt-unread-count">${notificationCount()}</span>`:''}${api.icon('arrow')}</button></div>`);
    document.querySelectorAll('.meetup-card-shell').forEach(shell=>{const id=shell.querySelector('[data-meetup]')?.dataset.meetup;if(id&&!shell.querySelector('[data-member-action="toggle-save"]'))shell.insertAdjacentHTML('beforeend',`<div class="mt-bookmark-row">${saveButton(id,true)}</div>`);});
    refreshSaveButtons();
    if(api.state.page==='saved'){const mount=$('.mt-page');if(mount){const count=$('.mt-tabs [data-member-id="notifications"]');if(count)count.innerHTML='새 매칭'+(notificationCount()?` <span class="mt-unread-count">${notificationCount()}</span>`:'');}}
  }
  function afterModal(){if(api.state.modal?.type!=='meetup'||$('.modal .mt-detail-save'))return;const id=api.state.modal.id;if(!allMeetups().some(m=>m.id===id))return;$('.modal .meetup-modal-title')?.insertAdjacentHTML('afterend',`<div class="mt-detail-save">${saveButton(id)}</div>`);}
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-member-action]');if(!button)return;event.preventDefault();const id=button.dataset.memberId;
    switch(button.dataset.memberAction){
      case 'toggle-save':toggle(id);break;
      case 'open-saved':view='saved';api.changePage('saved');break;
      case 'new-condition':openConditionForm();break;
      case 'edit-condition':openConditionForm(id);break;
      case 'edit-active':openConditionForm(activeCondition);break;
      case 'view':if(['saved','conditions','notifications'].includes(id)){view=id;api.render();}break;
      case 'condition-results':activeCondition=id;view='conditions';api.render();$('.mt-matches')?.scrollIntoView({behavior:'smooth',block:'start'});break;
      case 'delete-condition':if(commit(()=>{data.conditions=data.conditions.filter(c=>c.id!==id);data.notifications=data.notifications.filter(n=>n.conditionId!==id);})){if(activeCondition===id)activeCondition=null;api.render();api.toast('발견 조건을 삭제했어요.');}break;
      case 'collection':if(id==='all'||data.collections.some(c=>c.id===id)){collection=id;view='saved';api.render();}break;
      case 'new-collection':openCollectionForm();break;
      case 'delete-collection':if(collection!=='all'&&commit(()=>{data.collections=data.collections.filter(c=>c.id!==collection);data.saved.forEach(x=>{if(x.collection===collection)x.collection=null;});})){collection='all';api.render();api.toast('모음만 삭제했어요. 정모는 전체 모음에 남아 있어요.');}break;
      case 'read-all':if(commit(()=>data.notifications.forEach(n=>n.read=true)))api.render();break;
      case 'open-match':{const n=data.notifications.find(x=>x.id===id);if(n&&commit(()=>n.read=true)){api.render();const opener=document.createElement('button');opener.type='button';opener.hidden=true;opener.dataset.meetup=n.meetupId;document.body.append(opener);opener.click();opener.remove();}break;}
    }
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='mt-membership-filter'){membership=el.value==='joined'?'joined':'all';api.render();}
    if(el.dataset.memberCollection){const id=el.dataset.memberCollection,value=el.value;if(value&&!data.collections.some(c=>c.id===value))return;if(commit(()=>{const saved=data.saved.find(x=>x.id===id);if(saved)saved.collection=value||null;}))api.render();}
    if(el.dataset.memberConditionAlert){const id=el.dataset.memberConditionAlert;if(commit(()=>{const c=data.conditions.find(x=>x.id===id);if(c){c.enabled=el.checked;c.seen=unique([...c.seen,...matchList(c).map(matchKey)]).slice(-500);}}))api.render();}
  });
  document.addEventListener('submit',event=>{
    const form=event.target;if(!['mt-condition-form','mt-collection-form'].includes(form.id))return;event.preventDefault();
    const name=form.elements.name.value.trim();if(!name)return;
    if(form.id==='mt-collection-form'){
      if(data.collections.some(c=>c.name===name)){const error=$('#mt-collection-error');error.hidden=false;error.textContent='같은 이름의 모음이 있어요.';return;}
      const id=uid('collection');if(data.collections.length<8&&commit(()=>data.collections.push({id,name:name.slice(0,24)}))){collection=id;view='saved';api.closeModal();api.changePage('saved');api.toast('새 모음을 만들었어요.');}return;
    }
    const existing=data.conditions.find(c=>c.id===form.dataset.conditionId),id=existing?.id||uid('condition');
    if(!existing&&data.conditions.length>=MAX_CONDITIONS)return;
    const c={id,name:name.slice(0,40),area:form.elements.area.value,category:form.elements.category.value,weekday:form.elements.weekday.value,time:form.elements.time.value,enabled:form.elements.enabled.checked,seen:[]};
    if(!(c.area==='all'||areas().includes(c.area))||!(c.category==='all'||categories().includes(c.category))||!Object.hasOwn(weekdays,c.weekday)||!Object.hasOwn(times,c.time))return;
    c.seen=matchList(c).map(matchKey);
    if(commit(()=>{if(existing)data.conditions=data.conditions.map(x=>x.id===id?c:x);else data.conditions.push(c);})){activeCondition=id;view='conditions';api.closeModal();api.changePage('saved');api.toast(`조건을 저장했어요. 맞는 정모 ${matchList(c).length}개를 확인해 보세요.`);}
  });
  window.MoyobomMemberTools={isSaved,toggle,get conditions(){return structuredClone(data.conditions);},get saved(){return structuredClone(data.saved);},get collections(){return structuredClone(data.collections);},getMatches(id){const c=data.conditions.find(x=>x.id===id);return c?structuredClone(matchList(c)):[];},refreshMatches(){const added=syncMatches();if(api.state.page==='saved')api.render();return added;},notificationCount,openConditions(){view='conditions';api.changePage('saved');},openSaved(){view='saved';api.changePage('saved');}};
  api.registerExtension('member-tools',{init(){syncMatches();},renderPage(page){if(page==='saved'){syncMatches();return renderPage();}},afterRender,afterModal});
})();
