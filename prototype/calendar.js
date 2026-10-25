'use strict';

/* Shared calendar. Core owns meetups/attendance; this extension only stores view preferences. */
(() => {
  const api=window.Moyobom;
  if(!api||window.MoyobomCalendar)return;
  const KEY='moyeobom-calendar-v1',KST=9*60*60*1000,DEFAULT_DURATION=120;
  const filters=['all','joined','attending'];
  const esc=api.esc;
  const clock=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});
  const longDate=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'});
  let saved={};
  try {saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};} catch {}
  const validMonth=value=>typeof value==='string'&&/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value);
  const dateKey=at=>new Date(at+KST).toISOString().slice(0,10);
  const monthKey=at=>dateKey(at).slice(0,7);
  const todayKey=()=>dateKey(Date.now());
  function parseKST(value){
    if(typeof value!=='string')return NaN;
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))return Date.parse(value+(value.length===16?':00':'')+'+09:00');
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return Date.parse(value);
    return NaN;
  }
  function events(){
    return api.state.meetups.map(meetup=>{
      const start=parseKST(meetup.date),explicitEnd=parseKST(meetup.endDate);
      const duration=Number(meetup.durationMinutes);
      const knownDuration=Number.isFinite(duration)&&duration>0&&duration<=10080;
      const assumedEnd=!(explicitEnd>start)&&!knownDuration;
      const end=explicitEnd>start?explicitEnd:start+(knownDuration?duration:DEFAULT_DURATION)*60000;
      const group=api.groups.find(g=>g.id===meetup.groupId);
      const place=api.places.find(p=>p.id===meetup.placeId);
      return {id:meetup.id,meetup,group,place,start,end,assumedEnd,date:dateKey(Number.isFinite(start)?start:0),joined:api.state.joined.has(meetup.groupId),attending:api.state.joined.has(meetup.groupId)&&api.state.attendance.has(meetup.id)};
    }).filter(event=>event.group&&Number.isFinite(event.start)&&Number.isFinite(event.end)).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
  }
  function initialMonth(){
    const all=events(),next=all.find(e=>e.start>=parseKST(todayKey()+'T00:00'));
    return next?monthKey(next.start):all.length?monthKey(all.at(-1).start):todayKey().slice(0,7);
  }
  const view={
    month:validMonth(saved.month)?saved.month:initialMonth(),
    filter:filters.includes(saved.filter)?saved.filter:'all',
    groupId:typeof saved.groupId==='string'&&api.groups.some(g=>g.id===saved.groupId)?saved.groupId:'all',
    date:typeof saved.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.date)?saved.date:''
  };
  if(view.date&&!view.date.startsWith(view.month+'-'))view.date='';
  function save(){try {localStorage.setItem(KEY,JSON.stringify({version:1,...view}));}catch {api.toast('캘린더는 적용됐어요. 이 브라우저에서는 보기 설정을 저장할 수 없어요.');}}
  function filtered(all=events()){
    return all.filter(e=>(view.filter==='all'||(view.filter==='joined'?e.joined:e.attending))&&(view.groupId==='all'||e.group.id===view.groupId));
  }
  function conflicts(all=events().filter(e=>e.attending)){
    const pairs=[];
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      if(all[i].start<all[j].end&&all[j].start<all[i].end)pairs.push({first:all[i].id,second:all[j].id,minutes:Math.ceil((Math.min(all[i].end,all[j].end)-Math.max(all[i].start,all[j].start))/60000),assumedEnd:all[i].assumedEnd||all[j].assumedEnd});
    }
    return pairs;
  }
  function shiftMonth(delta){
    const [year,month]=view.month.split('-').map(Number),shifted=new Date(Date.UTC(year,month-1+delta,1));
    const next=shifted.toISOString().slice(0,7);
    if(!validMonth(next))return;
    view.month=next;view.date='';
  }
  function monthTitle(){const [year,month]=view.month.split('-').map(Number);return `${year}년 ${month}월`;}
  function monthMarkup(visible){
    const [year,month]=view.month.split('-').map(Number),first=Date.UTC(year,month-1,1),offset=new Date(first).getUTCDay();
    const byDate=new Map();for(const event of visible){if(!byDate.has(event.date))byDate.set(event.date,[]);byDate.get(event.date).push(event);}
    const cells=Array.from({length:42},(_,index)=>{
      const at=first+(index-offset)*86400000,key=new Date(at).toISOString().slice(0,10),items=byDate.get(key)||[],inside=key.startsWith(view.month+'-'),today=key===todayKey(),selected=key===view.date;
      const label=`${Number(key.slice(5,7))}월 ${Number(key.slice(8))}일${today?', 오늘':''}, 정모 ${items.length}개${selected?', 선택됨':''}`;
      return `<td class="${inside?'':'cal-outside'} ${index%7===0?'cal-sunday':index%7===6?'cal-saturday':''}"><button type="button" class="cal-day ${today?'is-today':''} ${selected?'is-selected':''}" data-calendar-day="${key}" data-calendar-focus="day-${key}" aria-label="${esc(label)}" aria-pressed="${selected}"><time datetime="${key}">${Number(key.slice(8))}</time><span class="cal-day-events" aria-hidden="true">${items.slice(0,2).map(e=>`<span class="cal-day-event ${e.attending?'is-attending':''}">${esc(e.meetup.title)}</span>`).join('')}${items.length>2?`<span class="cal-day-extra">+${items.length-2}개</span>`:''}</span><span class="cal-day-dots" aria-hidden="true">${items.slice(0,3).map(e=>`<i class="${e.attending?'is-attending':''}"></i>`).join('')}${items.length>3?'<b>+</b>':''}</span></button></td>`;
    });
    return `<div class="cal-month"><div class="cal-month-heading"><h2 id="calendar-month-title">${monthTitle()}</h2><div class="cal-month-navigation"><button type="button" class="cal-icon-button" data-calendar-action="prev" data-calendar-focus="prev" aria-label="이전 달">${api.icon('back')}</button><button type="button" class="cal-today-button" data-calendar-action="today" data-calendar-focus="today">오늘</button><button type="button" class="cal-icon-button" data-calendar-action="next" data-calendar-focus="next" aria-label="다음 달">${api.icon('arrow')}</button></div></div><table class="cal-month-table" aria-labelledby="calendar-month-title"><thead><tr>${['일','월','화','수','목','금','토'].map((day,i)=>`<th scope="col" class="${i===0?'cal-sunday':i===6?'cal-saturday':''}">${day}</th>`).join('')}</tr></thead><tbody>${Array.from({length:6},(_,row)=>`<tr>${cells.slice(row*7,row*7+7).join('')}</tr>`).join('')}</tbody></table><div class="cal-legend"><span><i></i>정모</span><span><i class="is-attending"></i>참석 중</span><span>날짜를 누르면 해당 일정만 보여요</span></div></div>`;
  }
  function eventCard(event,pairs,all){
    const related=pairs.filter(pair=>pair.first===event.id||pair.second===event.id);
    const conflictText=related.map(pair=>{const other=all.find(e=>e.id===(pair.first===event.id?pair.second:pair.first));return `‘${other?.meetup.title||'다른 정모'}’와 ${pair.minutes}분 겹쳐요${pair.assumedEnd?' · 종료 미정 정모는 2시간 가정':''}`;});
    const day=event.date.slice(8),weekday=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'short'}).format(new Date(event.start));
    return `<article class="cal-event-card ${event.attending?'is-attending':''} ${related.length?'has-conflict':''}" data-calendar-event="${esc(event.id)}"><div class="cal-event-day"><strong>${Number(day)}</strong><span>${weekday}</span></div><div class="cal-event-body"><div class="cal-event-labels"><button type="button" class="cal-group-link" data-open-group="${esc(event.group.id)}">${esc(event.group.name)}</button>${event.attending?'<span class="cal-status">참석 중</span>':event.joined?'<span class="cal-status is-joined">내 모임</span>':''}${related.length?'<span class="cal-status is-conflict">일정 겹침</span>':''}</div><button type="button" class="cal-event-title" data-meetup="${esc(event.id)}">${esc(event.meetup.title)}</button><p class="cal-event-time">${clock.format(new Date(event.start))}–${clock.format(new Date(event.end))}<span>${event.assumedEnd?'종료 미정 · 2시간 가정':'예정 시간'}</span></p><p class="cal-event-location">${api.icon('pin')}${esc(event.place?.name||'장소 미정')}</p>${conflictText.length?`<p class="cal-conflict-detail">${conflictText.map(esc).join('<br>')}</p>`:''}<div class="cal-event-actions"><button type="button" class="button" data-meetup="${esc(event.id)}">정모 상세 ${api.icon('arrow')}</button><button type="button" class="button ${event.attending?'soft':''}" data-room="meetup:${esc(event.id)}">${api.icon(event.attending?'chat':'lock')}${event.attending?'참석자 대화방':'참석 후 대화방'}</button></div></div></article>`;
  }
  function agendaMarkup(visible,pairs,all){
    const monthEvents=visible.filter(e=>monthKey(e.start)===view.month),shown=view.date?monthEvents.filter(e=>e.date===view.date):monthEvents;
    const title=view.date?longDate.format(new Date(parseKST(view.date+'T12:00'))):`${Number(view.month.slice(5))}월 전체 일정`;
    const empty=view.date?'이날 예정된 정모가 없어요.':visible.length?'이달에는 예정된 정모가 없어요.':'조건에 맞는 정모가 없어요.';
    return `<section class="cal-agenda" aria-labelledby="calendar-agenda-title"><div class="cal-agenda-heading"><h2 id="calendar-agenda-title">${esc(title)} <span>${shown.length}개</span></h2>${view.date?'<button type="button" data-calendar-action="all-month" class="cal-text-button" data-calendar-focus="all-month">월 전체 보기</button>':''}</div><p class="cal-results-status" role="status">${view.filter==='all'?'모든 모임':view.filter==='joined'?'가입한 모임':'참석 중인 정모'}${view.groupId!=='all'?' · '+esc(api.groups.find(g=>g.id===view.groupId)?.name||'선택한 모임'):''} · ${shown.length}개 일정</p><div class="cal-event-list">${shown.length?shown.map(e=>eventCard(e,pairs,all)).join(''):`<div class="cal-empty">${api.icon('calendar')}<h3>${empty}</h3><p>${view.date?'월 전체 일정을 보거나 다른 날짜를 선택해 보세요.':'다른 달이나 필터에서 새로운 약속을 찾아보세요.'}</p>${view.date?'<button type="button" class="button" data-calendar-action="all-month">월 전체 보기</button>':visible.length?'<button type="button" class="button" data-calendar-action="next-event">정모가 있는 달로 이동</button>':'<button type="button" class="button" data-calendar-action="reset">모든 모임 일정 보기</button>'}</div>`}</div></section>`;
  }
  function renderPage(){
    const all=events(),visible=filtered(all),attending=all.filter(e=>e.attending),pairs=conflicts(attending);
    return `<section id="moyo-calendar" class="calendar-page"><div class="page-heading cal-page-heading"><div><div class="eyebrow">OUR PLANS</div><h1>통합 캘린더</h1><p>여러 모임의 정모를 한 번에 확인해요.</p></div><button type="button" class="button cal-export-button" data-calendar-action="export" data-calendar-focus="export" ${attending.length?'':'disabled'}>${api.icon('calendar')}참석 일정 .ics</button></div><div class="cal-filters"><div class="cal-filter-tabs" role="group" aria-label="일정 범위">${[['all','전체 모임'],['joined','내 모임'],['attending','참석 중']].map(([id,label])=>`<button type="button" class="${view.filter===id?'active':''}" data-calendar-filter="${id}" data-calendar-focus="filter-${id}" aria-pressed="${view.filter===id}">${label}</button>`).join('')}</div><label class="cal-group-select"><span class="sr-only">일정을 볼 모임</span><select id="calendar-group-filter" data-calendar-focus="group" aria-label="일정을 볼 모임"><option value="all">모든 모임</option>${api.groups.map(group=>`<option value="${esc(group.id)}" ${view.groupId===group.id?'selected':''}>${esc(group.name)}</option>`).join('')}</select></label></div><div class="cal-attendance-status ${pairs.length?'has-conflict':''}"><span>${api.icon(pairs.length?'calendar':'check')}내 참석 정모 <strong>${attending.length}개</strong> · ${pairs.length?`겹치는 일정 ${pairs.length}쌍`:'겹치는 일정 없음'}</span><small>참석 일정 파일에는 현재 필터와 관계없이 ${attending.length}개 정모가 포함돼요.</small></div><div class="cal-layout">${monthMarkup(visible)}${agendaMarkup(visible,pairs,all)}</div><p class="cal-footnote">한국 표준시(KST) 기준 · 종료 시각이 없는 정모는 일정 겹침 확인과 캘린더 내보내기에 <strong>2시간</strong>을 가정해요. 정확한 종료 시간은 정모에서 확인해 주세요.</p></section>`;
  }
  function refresh(focusKey){
    if(api.state.page!=='calendar')return;
    const root=document.getElementById('moyo-calendar');if(!root)return;
    root.outerHTML=renderPage();
    if(focusKey)document.querySelector(`[data-calendar-focus="${CSS.escape(focusKey)}"]`)?.focus({preventScroll:true});
  }
  function icsText(value){return String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function utcStamp(at){return new Date(at).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}
  function foldLine(value){
    const chunks=[];let part='',bytes=0;
    for(const character of value){const length=new TextEncoder().encode(character).length;if(bytes+length>75){chunks.push(part);part=' ';bytes=1;}part+=character;bytes+=length;}
    chunks.push(part);return chunks.join('\r\n');
  }
  function buildIcs(list=events().filter(e=>e.attending),generatedAt=Date.now()){
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Moyobom//Gathering Calendar//KO','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:모여봄 참석 정모','X-WR-TIMEZONE:Asia/Seoul'];
    for(const event of list){
      const description=[event.group.name,event.meetup.description,event.meetup.meetingPoint?'집결: '+event.meetup.meetingPoint:'',event.assumedEnd?'종료 시각 미정: 시작 후 2시간을 가정한 일정입니다. 정확한 종료 시간은 정모에서 확인해 주세요.':''].filter(Boolean).join('\n');
      lines.push('BEGIN:VEVENT','UID:moyobom-'+encodeURIComponent(event.id)+'@prototype.moyobom.local','DTSTAMP:'+utcStamp(generatedAt),'DTSTART:'+utcStamp(event.start),'DTEND:'+utcStamp(event.end),'SUMMARY:'+icsText(event.meetup.title),'DESCRIPTION:'+icsText(description),'LOCATION:'+icsText([event.place?.name,event.place?.address].filter(Boolean).join(', ')),'TRANSP:OPAQUE');
      if(event.assumedEnd)lines.push('X-MOYOBOM-ESTIMATED-END:TRUE');
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
  }
  function exportIcs(){
    const list=events().filter(e=>e.attending);
    if(!list.length){api.toast('참석 중인 정모가 없어요. 정모 상세에서 참석해 주세요.');return;}
    const blob=new Blob([buildIcs(list)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='moyobom-attending-'+todayKey()+'.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    api.toast(`참석 정모 ${list.length}개를 저장했어요. 캘린더 앱에서 .ics 파일을 가져오세요.`);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('#moyo-calendar button');if(!button)return;
    const action=button.dataset.calendarAction,filter=button.dataset.calendarFilter,day=button.dataset.calendarDay;
    if(filter&&filters.includes(filter)){view.filter=filter;view.date='';}
    else if(day){view.month=day.slice(0,7);view.date=view.date===day?'':day;}
    else if(action==='export'){exportIcs();return;}
    else if(action==='prev')shiftMonth(-1);
    else if(action==='next')shiftMonth(1);
    else if(action==='today'){view.month=todayKey().slice(0,7);view.date=todayKey();}
    else if(action==='all-month')view.date='';
    else if(action==='reset'){view.filter='all';view.groupId='all';view.date='';view.month=initialMonth();}
    else if(action==='next-event'){
      const all=filtered(),after=all.find(e=>monthKey(e.start)>view.month),next=after||all[0];if(next){view.month=monthKey(next.start);view.date='';}
    }else return;
    save();refresh(button.dataset.calendarFocus);
  });
  document.addEventListener('change',event=>{
    if(event.target.id!=='calendar-group-filter')return;
    view.groupId=event.target.value==='all'||api.groups.some(g=>g.id===event.target.value)?event.target.value:'all';view.date='';save();refresh('group');
  });
  document.addEventListener('keydown',event=>{
    const button=event.target.closest('#moyo-calendar [data-calendar-day]');if(!button||event.altKey||event.metaKey||event.ctrlKey)return;
    const deltas={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(!Object.hasOwn(deltas,event.key))return;
    event.preventDefault();const at=Date.parse(button.dataset.calendarDay+'T12:00:00Z')+deltas[event.key]*86400000,key=new Date(at).toISOString().slice(0,10);
    if(!validMonth(key.slice(0,7)))return;
    view.month=key.slice(0,7);view.date=key;save();refresh('day-'+key);
  });
  api.registerExtension('unified-calendar',{
    renderPage(page){if(page==='calendar')return renderPage();},
    afterModal(){
      if(api.state.page!=='calendar')return;
      // Wait for core's document click listener to commit attendance before refreshing.
      document.querySelectorAll('#modal-root [data-attend]').forEach(button=>button.addEventListener('click',()=>setTimeout(()=>refresh(),0),{once:true}));
    }
  });
  window.MoyobomCalendar={open:()=>api.changePage('calendar'),getEvents:events,getConflicts:()=>conflicts(),buildIcs,exportIcs};
})();
