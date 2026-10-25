'use strict';

/* Organizer workbench: local bookkeeping and explicit waiting-list simulation. */
(() => {
  const api=window.Moyobom;if(!api)return;
  const KEY='moyeobom-operations-v1';
  const $=api.$,esc=api.esc,icon=api.icon;
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const money=value=>new Intl.NumberFormat('ko-KR').format(Number(value)||0)+'원';
  const stamp=at=>new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(at));
  const button=(action,label,cls='',value='')=>`<button type="button" class="button ${cls}" data-operations-action="${action}" ${value?`data-operations-value="${esc(value)}"`:''}>${label}</button>`;
  const empty=text=>`<div class="op-empty">${icon('calendar')}<p>${esc(text)}</p></div>`;
  let data;
  try{data=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
  if(!data||data.version!==1)data={version:1,records:{},rosters:{},capacities:{},selectedGroup:null,selectedEvent:null,tab:'overview'};
  data.records||={};data.rosters||={};data.capacities||={};
  let syncing=false;
  const person=id=>api.members.find(m=>m.id===id);
  const joinedGroups=()=>api.groups.filter(g=>api.state.joined.has(g.id));
  const getEvent=id=>api.state.meetups.find(m=>m.id===id);
  const editable=m=>Boolean(m&&api.state.joined.has(m.groupId));
  function roster(m){return [...new Set([...(m.attendeeIds||[]).filter(id=>id!=='me'),...(api.state.attendance.has(m.id)?['me']:[])])].filter(id=>person(id));}
  function eligibleMembers(m){return api.members.filter(p=>!m.groupId.startsWith('custom-')||p.id==='me');}
  function record(id){return data.records[id]||={amount:0,note:'',ledger:{},waitlist:[],autoFill:true};}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch{api.toast('운영 기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');return false;}}
  function commit(change,core=false){
    const previous=JSON.stringify(data),previousEvents=core?structuredClone(api.state.meetups):null,previousAttendance=core?[...api.state.attendance]:null;
    change();
    if(!save()){data=JSON.parse(previous);if(core){api.state.meetups=previousEvents;api.state.attendance=new Set(previousAttendance);}return false;}
    if(core)api.persist();return true;
  }
  function setRoster(m,ids){
    const valid=[...new Set(ids)].filter(id=>person(id));
    m.attendeeIds=valid;m.count=valid.filter(id=>id!=='me').length;
    if(valid.includes('me')&&api.state.joined.has(m.groupId))api.state.attendance.add(m.id);else api.state.attendance.delete(m.id);
    data.rosters[m.id]=valid.filter(id=>id!=='me');
  }
  function applySaved(){
    for(const m of api.state.meetups){
      if(Array.isArray(data.rosters[m.id])){m.attendeeIds=[...new Set([...data.rosters[m.id].filter(id=>person(id)&&id!=='me'),...(api.state.attendance.has(m.id)?['me']:[])])];m.count=m.attendeeIds.filter(id=>id!=='me').length;}
      const cap=Number(data.capacities[m.id]);if(Number.isInteger(cap)&&cap>=2&&cap<=100)m.capacity=Math.max(cap,roster(m).length);
    }
  }
  function syncWaitlists(){
    if(syncing)return 0;syncing=true;let promoted=0,changed=false;
    const previous=JSON.stringify(data),previousEvents=structuredClone(api.state.meetups),previousAttendance=[...api.state.attendance];
    try{
      for(const m of api.state.meetups){
        const r=data.records[m.id];if(!r?.waitlist?.length)continue;
        if(!editable(m)){for(const w of r.waitlist)if(w.userId==='me'&&w.status==='waiting'){w.status='cancelled';w.endedAt=Date.now();changed=true;}continue;}
        if(r.autoFill===false)continue;
        const ids=roster(m);
        for(const w of r.waitlist.filter(w=>w.status==='waiting').sort((a,b)=>a.requestedAt-b.requestedAt)){
          if(ids.includes(w.userId)){w.status='promoted';w.endedAt=Date.now();changed=true;continue;}
          if(ids.length>=m.capacity)break;
          if(!eligibleMembers(m).some(p=>p.id===w.userId)){w.status='cancelled';w.endedAt=Date.now();changed=true;continue;}
          ids.push(w.userId);w.status='promoted';w.endedAt=Date.now();setRoster(m,ids);promoted++;changed=true;
        }
      }
      if(changed){if(save())api.persist();else{data=JSON.parse(previous);api.state.meetups=previousEvents;api.state.attendance=new Set(previousAttendance);promoted=0;}}
    }finally{syncing=false;}
    return promoted;
  }
  function selected(){
    const groups=joinedGroups();
    if(!groups.some(g=>g.id===data.selectedGroup))data.selectedGroup=groups.find(g=>g.id===api.state.groupId)?.id||groups[0]?.id||null;
    const events=api.state.meetups.filter(m=>m.groupId===data.selectedGroup).sort((a,b)=>api.meetupAt(a)-api.meetupAt(b));
    if(!events.some(m=>m.id===data.selectedEvent))data.selectedEvent=events.find(m=>api.meetupAt(m)>=Date.now())?.id||events[0]?.id||null;
    return {groups,group:groups.find(g=>g.id===data.selectedGroup),events,event:events.find(m=>m.id===data.selectedEvent)};
  }
  function totals(m){
    const r=record(m.id),ids=roster(m);let total=0,paid=0,checked=0;
    for(const id of ids){const row=r.ledger[id]||{},amount=Number.isFinite(row.amount)?row.amount:r.amount;total+=amount;if(row.paid)paid+=amount;if(row.checked)checked++;}
    return {total,paid,unpaid:total-paid,checked,count:ids.length};
  }
  function avatar(id){const p=person(id);return `<span class="op-avatar">${p?.photo?`<img src="${esc(p.photo)}" alt="">`:esc(p?.name?.slice(0,1)||'?')}</span>`;}
  function eventLabel(m){return api.dateLabel(api.meetupAt(m))+' · '+api.time(api.meetupAt(m));}
  function stats(m){const t=totals(m);return `<div class="op-stats"><div><span>참석 신청</span><strong>${t.count}<small> / ${m.capacity}명</small></strong></div><div><span>출석 확인</span><strong>${t.checked}<small>명</small></strong></div><div><span>납부 기록</span><strong>${money(t.paid)}</strong></div><div><span>미납 기록</span><strong>${money(t.unpaid)}</strong></div></div>`;}
  function overview(m){
    const r=record(m.id),p=api.places.find(p=>p.id===m.placeId),first=Math.max(api.meetupAt(m)+7*86400000,Date.now());
    return `<section class="op-panel"><div class="op-panel-heading"><h2>정모 운영</h2><span class="op-pill">${esc(eventLabel(m))}</span></div><h3>${esc(m.title)}</h3><p class="op-muted">${icon('pin')}${esc(p?.name||'장소 확인 필요')} · ${esc(m.meetingPoint||'집결 설명 없음')}</p><div class="op-inline">${button('event-detail','정모 상세 보기','',m.id)}${button('open-event-room','참석자 대화방','soft',m.id)}</div><p class="op-muted">대화방은 현재 이 정모에 참석 중인 모임 멤버만 들어갈 수 있어요.</p></section><section class="op-panel"><div class="op-panel-heading"><h2>매주 반복 정모 만들기</h2><span class="op-pill">운영 시간 줄이기</span></div><p class="op-muted">선택한 정모의 내용·장소·정원을 복사해 매주 같은 요일과 시간에 등록해요. 지난 일정은 건너뛰고 미래 일정만 만들어요.</p><form data-operations-form="repeat" data-operations-event="${esc(m.id)}" class="op-repeat-form"><label>추가할 정모 수<select name="weeks" aria-label="반복 정모 수">${[1,2,3,4].map(n=>`<option value="${n}">${n}개 · ${n}주</option>`).join('')}</select></label><button type="submit" class="button primary">반복 일정 등록</button></form><p class="op-hint">새 정모의 참석자는 0명으로 시작해요. 같은 원본·날짜의 일정은 중복 등록하지 않아요.</p><p class="op-error" data-operations-error role="alert" hidden></p></section><section class="op-panel"><h2>운영 메모</h2><form data-operations-form="settings" data-operations-event="${esc(m.id)}"><label>1인 기본 회비<input name="amount" type="number" min="0" max="10000000" step="1" value="${Number(r.amount)||0}" aria-label="1인 기본 회비"></label><label>정모 운영 메모<textarea name="note" maxlength="500" rows="3" placeholder="대관료, 준비물, 현장 확인 사항을 기록하세요.">${esc(r.note||'')}</textarea></label><button type="submit" class="button soft">회비 기준 · 메모 저장</button></form><p class="op-hint">회비는 수동 장부예요. 결제·계좌 이체·청구·환불은 처리하지 않아요. 기존에 개별 저장한 금액은 유지돼요.</p></section>`;
  }
  function ledger(m){
    const r=record(m.id),ids=roster(m),t=totals(m),cancelled=Object.keys(r.ledger).filter(id=>!ids.includes(id));
    return `<section class="op-panel"><div class="op-panel-heading"><div><h2>출석과 회비 원장</h2><p class="op-muted">기본 회비 ${money(r.amount)} · 실제 결제와 연결되지 않은 수동 기록</p></div>${button('export-event','CSV 내보내기','small',m.id)}</div>${ids.length?`<form data-operations-form="ledger" data-operations-event="${esc(m.id)}"><div class="op-ledger-head"><span>참석 멤버</span><span>출석</span><span>금액</span><span>납부 상태</span><span>메모</span></div>${ids.map(id=>{const row=r.ledger[id]||{},p=person(id);return `<div class="op-ledger-row"><div class="op-member">${avatar(id)}<strong>${esc(p.name)}${id==='me'?'<small>나</small>':''}</strong></div><label class="op-check"><input type="checkbox" name="checked_${esc(id)}" ${row.checked?'checked':''} aria-label="${esc(p.name)} 출석 확인"><span>출석</span></label><label class="op-amount"><span class="sr-only">${esc(p.name)} 회비 금액</span><input name="amount_${esc(id)}" type="number" min="0" max="10000000" step="1" value="${Number.isFinite(row.amount)?row.amount:r.amount}" required></label><label><span class="sr-only">${esc(p.name)} 납부 상태</span><select name="paid_${esc(id)}"><option value="unpaid" ${!row.paid?'selected':''}>미납</option><option value="paid" ${row.paid?'selected':''}>납부 완료</option></select></label><label class="op-ledger-note"><span class="sr-only">${esc(p.name)} 회비 메모</span><input name="note_${esc(id)}" maxlength="120" value="${esc(row.note||'')}" placeholder="입금일 · 특이 사항"></label></div>`;}).join('')}<div class="op-ledger-footer"><p>예정 ${money(t.total)} · 납부 ${money(t.paid)} · 미납 ${money(t.unpaid)}</p><button type="submit" class="button primary">출석 · 회비 저장</button></div><p class="op-error" data-operations-error role="alert" hidden></p></form>`:empty('참석 신청한 멤버가 생기면 출석과 회비를 기록할 수 있어요.')}<p class="op-hint">참석 취소한 멤버의 ${cancelled.length}개 기록은 보관하며 현재 합계에서 제외해요. CSV에는 취소 기록을 구분해 포함해요.</p></section>`;
  }
  function waiting(m){
    const r=record(m.id),ids=roster(m),queue=r.waitlist.filter(w=>w.status==='waiting').sort((a,b)=>a.requestedAt-b.requestedAt),candidates=eligibleMembers(m).filter(p=>!ids.includes(p.id)&&!queue.some(w=>w.userId===p.id)),full=ids.length>=m.capacity;
    return `<section class="op-panel"><div class="op-panel-heading"><h2>정원과 대기 관리</h2><span class="op-pill">참석 ${ids.length} / ${m.capacity} · 대기 ${queue.length}명</span></div><div class="op-demo-note">대기 신청과 승격을 이 브라우저에서 시연해요. 대표 멤버의 신청도 운영자가 대신 입력할 수 있으며, 실제 사람에게 신청이나 알림을 보내지 않아요.</div><form data-operations-form="capacity" data-operations-event="${esc(m.id)}" class="op-repeat-form"><label>정모 정원<input type="number" name="capacity" min="${Math.max(2,ids.length)}" max="100" step="1" value="${m.capacity}" required aria-label="정모 정원 변경"></label><button type="submit" class="button">정원 저장</button></form><p class="op-hint">현재 참석 인원보다 줄일 수 없어요. 정원을 참석 인원과 같게 설정하면 만석 대기 흐름을 확인할 수 있어요.</p><label class="op-auto"><input type="checkbox" data-operations-autofill="${esc(m.id)}" ${r.autoFill!==false?'checked':''}>취소로 자리가 나면 대기 순서대로 자동 승격 <span>로컬 시연</span></label><form data-operations-form="waitlist" data-operations-event="${esc(m.id)}" class="op-repeat-form"><label>대기 신청할 멤버<select name="member" aria-label="대기 신청 멤버" ${!candidates.length?'disabled':''}>${candidates.length?candidates.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${p.id==='me'?' · 나':''}</option>`).join(''):'<option>신청 가능한 멤버 없음</option>'}</select></label><button type="submit" class="button primary" ${!full||!candidates.length?'disabled':''}>대기 등록</button></form>${!full?`<p class="op-muted">현재 ${m.capacity-ids.length}자리 남아 있어요. 대기는 만석일 때 신청해요.</p>`:''}<div class="op-waitlist">${queue.length?queue.map((w,i)=>`<div class="op-wait-row"><span class="op-queue-number">${i+1}</span><div class="op-member">${avatar(w.userId)}<span><strong>${esc(person(w.userId)?.name||'멤버')}</strong><small>${stamp(w.requestedAt)} 신청</small></span></div>${button('remove-wait','대기 취소','small',w.id)}${r.autoFill===false&&ids.length<m.capacity?button('promote','승격','small soft',w.id):''}</div>`).join(''):empty('현재 대기 중인 멤버가 없어요.')}</div><h3 class="op-subheading">참석자 변경 시연</h3>${ids.length?ids.map(id=>`<div class="op-wait-row"><div class="op-member">${avatar(id)}<strong>${esc(person(id).name)}${id==='me'?' · 나':''}</strong></div>${button('remove-attendee','참석 취소','small',m.id+'|'+id)}</div>`).join(''):empty('등록된 참석자가 없어요.')}<p class="op-hint">참석 취소는 실제 데모 정모 명단과 대화방 접근에도 반영돼요. 자동 승격을 켰다면 다음 대기자가 자리를 이어받아요.</p>${r.waitlist.some(w=>w.status==='promoted')?`<div class="op-promotion-log"><h3>승격 기록</h3>${r.waitlist.filter(w=>w.status==='promoted').slice(-5).reverse().map(w=>`<p>${esc(person(w.userId)?.name||'멤버')} · ${stamp(w.endedAt||w.requestedAt)} 참석자로 승격</p>`).join('')}</div>`:''}<p class="op-error" data-operations-error role="alert" hidden></p></section>`;
  }
  function insights(group){
    const variants={walk:[1200,180,36,24],book:[860,136,28,18],racket:[1560,220,45,32]},[impressions,views,requests,joins]=variants[group.id]||[640,98,22,12];
    return `<section class="op-panel"><div class="op-panel-heading"><h2>모집 흐름 살펴보기</h2><span class="op-sample-label">샘플 데이터 · 최근 30일 예시</span></div><p class="op-muted">아래 수치는 기능 검토를 위한 가상 지표예요. 실제 방문·신청·가입 데이터나 현재 모임 인원과 연결되지 않아요.</p><div class="op-funnel">${[['모임 노출',impressions],['상세 조회',views],['가입 신청',requests],['가입 완료',joins]].map(([label,n],i)=>`<div><span>${label}</span><strong>${new Intl.NumberFormat('ko-KR').format(n)}<small>건</small></strong><div class="op-bar"><i style="width:${Math.max(12,n/impressions*100)}%"></i></div></div>`).join('')}</div><div class="op-rates"><p>노출 → 상세 조회 <strong>${(views/impressions*100).toFixed(1)}%</strong></p><p>상세 조회 → 가입 신청 <strong>${(requests/views*100).toFixed(1)}%</strong></p><p>가입 신청 → 가입 완료 <strong>${(joins/requests*100).toFixed(1)}%</strong></p></div><div class="op-insight-note"><h3>운영자가 확인할 항목</h3><p>대표 사진과 소개가 관심사에 맞는지, 가입 조건이 명확한지, 다음 정모가 등록되어 있는지 함께 확인해 보세요.</p></div></section>`;
  }
  function renderPage(){
    syncWaitlists();const s=selected();
    if(!s.groups.length)return `<div class="page-heading"><div><div class="eyebrow">ORGANIZER WORKSPACE</div><h1>모임 운영 노트</h1><p>가입한 모임의 정모와 운영 기록을 한곳에서 관리해요.</p></div></div>${empty('모임에 가입하거나 새 모임을 만들면 운영 기능을 체험할 수 있어요.')}<div class="op-inline">${button('explore','모임 둘러보기','primary')}</div>`;
    const m=s.event;
    return `<div class="page-heading op-heading"><div><div class="eyebrow">ORGANIZER WORKSPACE</div><h1>모임 운영 노트</h1><p>반복 일정, 출석, 회비와 대기를 한곳에서.</p></div>${button('group-home','모임으로 돌아가기','small')}</div><div class="op-demo-note">운영 기능 체험 · 이 데모에서는 가입한 모임을 운영할 수 있어요. 실제 서비스에서는 모임장·운영진 권한을 적용해요. 회비는 수동 기록이며 실제 결제를 처리하지 않아요.</div><div class="op-selectors"><label>운영할 모임<select data-operations-group aria-label="운영할 모임">${s.groups.map(g=>`<option value="${esc(g.id)}" ${g.id===s.group.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><label>정모 선택<select data-operations-event-select aria-label="운영할 정모" ${!m?'disabled':''}>${s.events.length?s.events.map(e=>`<option value="${esc(e.id)}" ${m?.id===e.id?'selected':''}>${esc(e.title)} · ${e.date.slice(5,10)}</option>`).join(''):'<option>등록된 정모 없음</option>'}</select></label></div>${m?`${stats(m)}<nav class="op-tabs" aria-label="운영 메뉴">${[['overview','정모 운영'],['ledger','출석 · 회비'],['waiting','대기 관리'],['insights','모집 분석']].map(([id,name])=>`<button type="button" data-operations-action="tab" data-operations-value="${id}" class="${data.tab===id?'active':''}" aria-pressed="${data.tab===id}">${name}</button>`).join('')}</nav>${data.tab==='ledger'?ledger(m):data.tab==='waiting'?waiting(m):data.tab==='insights'?insights(s.group):overview(m)}<div class="op-bottom-actions">${button('group-events','전체 정모 보기')}${button('export-group','이 모임 운영 기록 CSV','',s.group.id)}</div>`:empty('정모를 등록하면 반복 일정과 출석 · 회비 관리를 시작할 수 있어요.')+button('group-events','정모 등록하러 가기','primary')}`;
  }
  function showError(text){const el=$('[data-operations-error]');if(el){el.hidden=false;el.textContent=text;}else api.toast(text);}
  function addWait(m,userId){
    if(!editable(m)||!eligibleMembers(m).some(p=>p.id===userId))return false;
    const r=record(m.id);if(roster(m).includes(userId)){api.toast('이미 참석 중인 멤버예요.');return false;}
    if(roster(m).length<m.capacity){api.toast('아직 자리가 있어요. 정모에서 참석 신청을 해 주세요.');return false;}
    if(r.waitlist.some(w=>w.userId===userId&&w.status==='waiting')){api.toast('이미 대기 중이에요.');return false;}
    return commit(()=>r.waitlist.push({id:uid('wait'),userId,requestedAt:Date.now(),status:'waiting'}));
  }
  function csvCell(value){let s=String(value??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function exportCSV(events,label){
    const rows=[['정모','일시(KST)','멤버ID','이름','참석 상태','출석 확인','회비(원)','납부 상태','멤버 메모','정모 메모']];
    for(const m of events.filter(editable)){const r=record(m.id),active=roster(m),ids=[...new Set([...active,...Object.keys(r.ledger)])];for(const id of ids){const row=r.ledger[id]||{},amount=Number.isFinite(row.amount)?row.amount:r.amount;rows.push([m.title,m.date,id,person(id)?.name||id,active.includes(id)?'참석':'취소 · 합계 제외',row.checked?'출석':'미확인',amount,row.paid?'납부 완료':'미납',row.note||'',r.note||'']);}}
    if(rows.length===1){api.toast('내보낼 참석자나 장부 기록이 없어요.');return;}
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='모여봄-'+label+'-운영기록.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);api.toast('운영 기록 CSV를 내려받았어요.');
  }
  function afterModal(){
    if(api.state.modal?.type!=='meetup')return;
    const m=getEvent(api.state.modal.id);if(!m||!editable(m))return;
    syncWaitlists();const r=record(m.id),ids=roster(m),mine=r.waitlist.find(w=>w.userId==='me'&&w.status==='waiting'),full=ids.length>=m.capacity;
    const body=$('.modal-body');if(!body||body.querySelector('[data-operations-modal]'))return;
    const detail=$('.meetup-details');if(detail?.children[1])detail.children[1].innerHTML=icon('users')+`참석 ${ids.length} / ${m.capacity}명`;
    const faces=$('.meetup-attendees');if(faces)faces.innerHTML=ids.map(avatar).join('')+'<small>이 참석자만 대화방에 들어갈 수 있어요.</small>';
    const chat=$('[data-room="meetup:'+m.id+'"]',body);if(chat){chat.classList.toggle('primary',api.state.attendance.has(m.id));chat.innerHTML=icon('chat')+(api.state.attendance.has(m.id)?'정모 참석자 대화방 열기':'🔒 참석 신청 후 대화방 입장');}
    const attend=$('[data-attend="'+m.id+'"]',$('.modal'));
    if(attend)attend.innerHTML=icon(api.state.attendance.has(m.id)?'check':'plus')+(api.state.attendance.has(m.id)?'참석 취소':'참석하기');
    if(!api.state.attendance.has(m.id)&&(full||mine)&&attend){attend.removeAttribute('data-attend');attend.dataset.operationsAction=mine?'cancel-own-wait':'wait-me';attend.dataset.operationsValue=m.id;attend.textContent=mine?'대기 취소':'만석 · 대기 신청';}
    body.insertAdjacentHTML('beforeend',`<section class="op-modal-wait" data-operations-modal><h3>대기 신청 ${r.waitlist.filter(w=>w.status==='waiting').length}명</h3><p>${mine?'내 대기 순서 '+(r.waitlist.filter(w=>w.status==='waiting').indexOf(mine)+1)+'번 · 취소로 자리가 나면 순서대로 승격돼요.':full?'현재 만석이에요. 대기 신청을 하면 자리가 날 때 순서대로 참석자가 돼요.':'아직 자리가 있어요. 참석 버튼으로 신청할 수 있어요.'}</p><small>로컬 시연 · 실제 신청·알림·결제는 발생하지 않아요.</small></section>`);
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-operations-action]');if(!target)return;event.preventDefault();event.stopImmediatePropagation();
    const action=target.dataset.operationsAction,value=target.dataset.operationsValue,s=selected(),m=s.event;
    if(action==='explore')api.changePage('explore');
    if(action==='group-home'&&s.group)api.changePage('group',{groupId:s.group.id});
    if(action==='group-events'&&s.group)api.changePage('group',{groupId:s.group.id,tab:'정모'});
    if(action==='tab'){data.tab=['overview','ledger','waiting','insights'].includes(value)?value:'overview';save();api.render();}
    if(action==='event-detail'){const e=getEvent(value);if(editable(e)){api.state.groupId=e.groupId;api.closeModal();api.changePage('group',{groupId:e.groupId,tab:'정모'});document.querySelector('[data-meetup="'+e.id+'"]')?.click();}}
    if(action==='open-event-room'){const e=getEvent(value);if(editable(e)){if(!api.state.attendance.has(e.id)){api.toast('이 정모에 참석한 멤버만 대화방에 들어갈 수 있어요.');return;}api.openRoom({roomId:'meetup:'+e.id});}}
    if(action==='export-event'){const e=getEvent(value);if(editable(e))exportCSV([e],e.title);}
    if(action==='export-group'){if(api.state.joined.has(value))exportCSV(api.state.meetups.filter(e=>e.groupId===value),api.groups.find(g=>g.id===value)?.name||'모임');}
    if(action==='remove-attendee'){const [id,userId]=value.split('|'),e=getEvent(id);if(!editable(e))return;if(commit(()=>setRoster(e,roster(e).filter(id=>id!==userId)),true)){const promoted=syncWaitlists();api.render();api.toast('참석을 취소했어요.'+(promoted?` 대기자 ${promoted}명이 참석자로 승격됐어요.`:''));}}
    if(action==='remove-wait'){if(!editable(m))return;const w=record(m.id).waitlist.find(w=>w.id===value);if(w&&commit(()=>{w.status='cancelled';w.endedAt=Date.now();})){api.render();api.toast('대기를 취소했어요.');}}
    if(action==='promote'){if(!editable(m))return;const w=record(m.id).waitlist.find(w=>w.id===value&&w.status==='waiting');if(w&&roster(m).length<m.capacity&&commit(()=>{setRoster(m,[...roster(m),w.userId]);w.status='promoted';w.endedAt=Date.now();},true)){api.render();api.toast('대기 멤버를 참석자로 승격했어요.');}}
    if(action==='wait-me'){const e=getEvent(value);if(e&&addWait(e,'me')){api.closeModal();api.toast('대기 신청을 저장했어요.');}}
    if(action==='cancel-own-wait'){const e=getEvent(value);if(!editable(e))return;const w=record(e.id).waitlist.find(w=>w.userId==='me'&&w.status==='waiting');if(w&&commit(()=>{w.status='cancelled';w.endedAt=Date.now();})){api.closeModal();api.toast('대기 신청을 취소했어요.');}}
  },true);
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.matches('[data-operations-group]')){event.stopImmediatePropagation();if(!api.state.joined.has(input.value))return;data.selectedGroup=input.value;data.selectedEvent=null;save();api.render();}
    if(input.matches('[data-operations-event-select]')){event.stopImmediatePropagation();const m=getEvent(input.value);if(editable(m)&&m.groupId===data.selectedGroup){data.selectedEvent=m.id;save();api.render();}}
    if(input.matches('[data-operations-autofill]')){event.stopImmediatePropagation();const m=getEvent(input.dataset.operationsAutofill);if(editable(m)&&commit(()=>record(m.id).autoFill=input.checked)){const n=syncWaitlists();api.render();api.toast(n?`대기자 ${n}명이 참석자로 승격됐어요.`:'대기 자동 승격 설정을 저장했어요.');}}
  },true);
  document.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('[data-operations-form]'))return;event.preventDefault();event.stopImmediatePropagation();const m=getEvent(form.dataset.operationsEvent);if(!editable(m)){api.toast('가입한 모임의 정모만 운영할 수 있어요.');return;}
    const type=form.dataset.operationsForm,r=record(m.id);
    if(type==='repeat'){
      const weeks=Number(form.elements.weeks.value);if(!Number.isInteger(weeks)||weeks<1||weeks>4)return;
      let base=api.meetupAt(m);if(!Number.isFinite(base)){showError('원본 정모의 날짜를 확인해 주세요.');return;}if(base+7*86400000<=Date.now())base+=Math.floor((Date.now()-base)/(7*86400000))*7*86400000;
      const copies=[];let duplicate=0;
      for(let i=1;i<=weeks;i++){const date=new Date(base+i*7*86400000+9*3600000).toISOString().slice(0,16);if(api.state.meetups.some(e=>e.groupId===m.groupId&&e.date===date&&(e.repeatSourceId===m.id||e.title===m.title))){duplicate++;continue;}copies.push({...m,id:uid('ops-repeat'),date,attendeeIds:[],count:0,repeatSourceId:m.id});}
      if(!copies.length){showError('같은 날짜의 반복 정모가 이미 등록되어 있어요.');return;}
      if(commit(()=>api.state.meetups.push(...copies),true)){api.render();api.toast(`미래 정모 ${copies.length}개를 등록했어요.${duplicate?' 중복 '+duplicate+'개는 건너뛰었어요.':''}`);}
    }
    if(type==='settings'){
      const amount=Number(form.elements.amount.value);if(!Number.isInteger(amount)||amount<0||amount>10000000){showError('회비는 0원부터 1,000만원까지 정수로 입력해 주세요.');return;}
      if(commit(()=>{r.amount=amount;r.note=form.elements.note.value.trim().slice(0,500);})){api.render();api.toast('기본 회비와 운영 메모를 저장했어요.');}
    }
    if(type==='ledger'){
      const values={};for(const id of roster(m)){const amount=Number(form.elements['amount_'+id].value);if(!Number.isInteger(amount)||amount<0||amount>10000000){showError('각 멤버의 회비 금액을 확인해 주세요.');return;}values[id]={amount,checked:form.elements['checked_'+id].checked,paid:form.elements['paid_'+id].value==='paid',note:form.elements['note_'+id].value.trim().slice(0,120),updatedAt:Date.now()};}
      if(commit(()=>Object.assign(r.ledger,values))){api.render();api.toast('출석과 회비 기록을 저장했어요.');}
    }
    if(type==='capacity'){
      const capacity=Number(form.elements.capacity.value);if(!Number.isInteger(capacity)||capacity<Math.max(2,roster(m).length)||capacity>100){showError('정원은 현재 참석 인원 이상, 2~100명으로 입력해 주세요.');return;}
      if(commit(()=>{m.capacity=capacity;data.capacities[m.id]=capacity;},true)){syncWaitlists();api.render();api.toast('정모 정원을 저장했어요.');}
    }
    if(type==='waitlist'&&addWait(m,form.elements.member.value)){api.render();api.toast('대기 신청을 기록했어요.');}
  },true);
  api.registerExtension('operations',{init(){applySaved();syncWaitlists();},renderPage(page){if(page==='operations')return renderPage();},afterRender(){const n=syncWaitlists();if(n&&api.state.page==='operations')api.toast(`대기자 ${n}명이 참석자로 승격됐어요.`);},afterModal});
  window.MoyobomOperations={open(options={}){const input=typeof options==='string'?{groupId:options}:options;if(input.groupId&&api.state.joined.has(input.groupId)){data.selectedGroup=input.groupId;data.selectedEvent=input.eventId||null;}api.changePage('operations');},sync:syncWaitlists};
})();
