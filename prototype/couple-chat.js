'use strict';

/* A quiet space for two, using the existing room, messages and chat controls. */
(() => {
  const api=window.Moyobom;
  if(!api||window.MoyobomCoupleChat)return;
  const ROOM='group:couple',KEY='moyeobom-couple-view-v1';
  let noteHidden=false;
  try {noteHidden=JSON.parse(localStorage.getItem(KEY)||'{}')?.noteHidden===true;} catch {}
  const esc=api.esc;
  const active=()=>api.state.page==='chat'&&api.getRoomId()===ROOM;
  const person=id=>api.members.some(member=>member.id===id)?api.member(id):{id,name:id==='jisoo'?'지수':'이호형',photo:''};
  const media=value=>typeof value==='string'&&(/^(blob:|\.\/assets\/|assets\/)/.test(value)||/^data:image\/(png|jpeg|webp|gif);/.test(value))?value:'';
  const messages=()=>api.state.messages.filter(message=>(message.roomId||'group:'+message.groupId)===ROOM).sort((a,b)=>a.at-b.at);
  const photos=()=>active()?api.chatMessages().filter(message=>media(message.photo)):[];
  function portrait(id,extra=''){
    const member=person(id),photo=media(member.photo);
    return `<span class="cp-portrait ${extra}">${photo?`<img src="${esc(photo)}" alt="${esc(member.name)}">`:esc(member.name.slice(0,1))}</span>`;
  }
  function pair(extra=''){return `<span class="cp-pair ${extra}">${portrait('jisoo')}${portrait('hohyung')}</span>`;}
  function save(){try {localStorage.setItem(KEY,JSON.stringify({version:1,noteHidden}));}catch {}}
  function keepReading(change){
    const stream=document.getElementById('message-stream');if(!stream){change();return;}
    const near=stream.scrollHeight-stream.scrollTop-stream.clientHeight<80,top=stream.getBoundingClientRect().top;
    const anchor=near?null:[...stream.querySelectorAll('.message')].find(node=>node.getBoundingClientRect().bottom>top+6),offset=anchor?anchor.getBoundingClientRect().top-top:0;
    change();
    if(near)stream.scrollTop=stream.scrollHeight;
    else if(anchor?.isConnected)stream.scrollTop+=anchor.getBoundingClientRect().top-stream.getBoundingClientRect().top-offset;
  }
  function noteMarkup(){
    return `<aside class="cp-love-note" id="couple-love-note" aria-label="우리의 한마디">${pair('cp-note-pair')}<button type="button" class="cp-note-copy" data-couple-action="story" aria-label="우리 이야기 보기"><strong>함께한 일상 <span aria-hidden="true">›</span></strong><span>사소한 얘기도, 좋은 순간도 여기.</span></button><button type="button" class="cp-photos-button" data-couple-action="photos" aria-label="함께한 사진 모아보기">${api.icon('image')}<span>사진</span></button><button type="button" class="cp-note-close" data-couple-action="hide-note" aria-label="상단 메모 닫기">${api.icon('close')}</button></aside>`;
  }
  function updateNote(){
    if(!active())return;
    keepReading(()=>{
      const existing=document.getElementById('couple-love-note');
      if(noteHidden){existing?.remove();return;}
      if(existing)existing.outerHTML=noteMarkup();
      else document.querySelector('.chat-header')?.insertAdjacentHTML('afterend',noteMarkup());
    });
  }
  function entryMarkup(){
    const all=messages(),latest=all.at(-1),cursor=api.state.readByRoom?.[ROOM]??0,count=all.filter(message=>message.at>cursor).length;
    const text=latest?.stickerId&&!latest.stickerCaption?'이모티콘을 보냈어요.':latest?.text||(latest?.photo?'사진을 보냈어요.':'오늘의 이야기를 나눠 보세요.');
    return `<button type="button" class="cp-chat-entry" data-couple-action="open" data-couple-entry="${ROOM}">${pair('cp-entry-pair')}<span class="cp-entry-copy"><span class="cp-entry-title">지수와 이호형 <i aria-hidden="true">♥</i></span><span class="cp-entry-preview">${esc(text)}</span></span><span class="cp-entry-meta">${latest?`<time>${esc(api.time(latest.at))}</time>`:''}${count?`<span class="cp-unread" aria-label="읽지 않은 대화 ${count}개">${count>999?'999+':count}</span>`:'<span class="cp-entry-heart" aria-hidden="true">♡</span>'}</span></button>`;
  }
  function decorate(){
    const couple=active();document.body.classList.toggle('couple-chat-active',couple);
    if(api.state.page==='chats'&&api.members.some(member=>member.id==='hohyung')&&!document.querySelector('[data-couple-entry]'))document.querySelector('.page-heading')?.insertAdjacentHTML('afterend',entryMarkup());
    if(!couple)return;
    const header=document.querySelector('.chat-header'),title=header?.querySelector('.chat-title-button');if(!header)return;
    header.querySelector('.room-self-avatar')?.remove();
    if(!header.querySelector('.cp-header-people'))header.querySelector(':scope > button')?.insertAdjacentHTML('afterend',`<button type="button" class="cp-header-people" data-couple-action="people" aria-label="지수와 이호형 프로필 보기">${pair()}</button>`);
    if(title){title.innerHTML='지수 <span class="cp-title-heart" aria-hidden="true">♥</span> 이호형<span class="chat-title-chevron" aria-hidden="true">⌄</span>';title.setAttribute('aria-label','지수와 이호형 대화방 더보기');}
    const subtitle=header.querySelector('.chat-heading p');if(subtitle)subtitle.textContent='오늘도 네 편';
    const back=header.querySelector('[data-action="group-home"]');if(back)back.setAttribute('aria-label','채팅 목록으로');
    const room=document.querySelector('.chat-room');if(room)room.setAttribute('aria-label','지수와 이호형의 대화');
    updateNote();
  }
  function people(){
    if(!active())return;
    api.state.modal={type:'couple-people',roomId:ROOM};
    api.openModal('지수와 이호형',`<div class="cp-people">${['jisoo','hohyung'].map(id=>`<button type="button" class="cp-person" data-profile-member="${id}">${portrait(id)}<span><strong>${esc(person(id).name)}</strong><small>프로필 보기</small></span>${api.icon('arrow')}</button>`).join('')}</div>`);
  }
  function gallery(){
    if(!active())return;
    const all=photos().slice().reverse();api.state.modal={type:'couple-photos',roomId:ROOM};
    api.openModal('함께한 순간',all.length?`<p class="cp-gallery-heading">대화 속에 남긴 사진 ${all.length}장</p><div class="cp-gallery">${all.map(message=>`<button type="button" data-couple-action="photo" data-couple-message="${esc(message.id)}"><img src="${esc(media(message.photo))}" alt="${esc(person(message.senderId).name)}님이 보낸 사진" loading="lazy"><span>${esc(api.dateLabel(message.at))}</span></button>`).join('')}</div>`:`<div class="cp-gallery-empty">${api.icon('image')}<h3>함께한 순간을 남겨볼까요?</h3><p>대화에 보낸 사진을 여기에 모아둘게요.</p><button type="button" class="button" data-couple-action="attach">사진 보내기</button></div>`,'',true);
  }
  function showPhoto(id){
    if(!active())return;const message=photos().find(message=>message.id===id);if(!message)return;
    api.state.modal={type:'couple-photo',roomId:ROOM};
    api.openModal('함께한 순간',`<img class="image-full cp-photo-full" src="${esc(media(message.photo))}" alt="${esc(person(message.senderId).name)}님이 보낸 사진"><p class="cp-photo-caption">${esc(person(message.senderId).name)} · ${esc(api.dateLabel(message.at))}</p>`,`<button type="button" class="button" data-couple-action="source" data-couple-message="${esc(message.id)}">대화에서 보기 ${api.icon('arrow')}</button>`,true);
  }
  function highlights(){return Array.isArray(window.MoyobomCoupleStory?.highlights)?window.MoyobomCoupleStory.highlights.filter(item=>item&&typeof item.id==='string'&&typeof item.title==='string'&&typeof item.roomId==='string'&&typeof item.messageId==='string'):[];}
  function story(){
    if(!active())return;const moments=highlights();api.state.modal={type:'couple-story',roomId:ROOM};
    api.openModal('우리 이야기',`<div class="cp-story-intro">${pair()}<p>함께 걷던 날부터, 서로의 하루가 되기까지.</p></div>${moments.length?`<ol class="cp-story-timeline">${moments.map(item=>{const date=typeof item.date==='string'?item.date:'',at=Date.parse(date.length===10?date+'T12:00:00+09:00':date),label=Number.isFinite(at)?api.dateLabel(at):date;return `<li data-couple-highlight="${esc(item.id)}"><button type="button" data-couple-action="milestone" data-couple-highlight-id="${esc(item.id)}"><time datetime="${esc(date)}">${esc(label)}</time><h3>${esc(item.title)}</h3>${item.description?`<p>${esc(item.description)}</p>`:''}<span>그날의 대화 ${api.icon('arrow')}</span></button></li>`;}).join('')}</ol>`:'<div class="cp-gallery-empty"><h3>우리의 순간들을 모으고 있어요.</h3></div>'}`,'',true);
  }
  function afterModal(){
    if(!active()||api.state.modal?.type!=='chat-more')return;
    const content=document.querySelector('.chat-more-content');if(!content||content.querySelector('[data-couple-more]'))return;
    content.querySelector('#chat-more-room-select')?.closest('.chat-more-section')?.remove();
    content.querySelector('[data-action="incoming"]')?.closest('.chat-more-section')?.remove();
    const members=content.querySelector('[data-action="members"]');
    if(members){members.removeAttribute('data-action');members.removeAttribute('data-chat-command');members.dataset.coupleAction='people';members.innerHTML=api.icon('users')+'지수와 이호형';}
    content.insertAdjacentHTML('beforeend',`<div class="chat-more-section cp-more" data-couple-more><button type="button" class="button" data-couple-action="story">${api.icon('heart')}우리 이야기</button><button type="button" class="button" data-couple-action="photos">${api.icon('image')}함께한 사진 모아보기</button><button type="button" class="button" data-couple-action="toggle-note">${api.icon('heart')}${noteHidden?'상단 메모 다시 보기':'상단 메모 접기'}</button></div>`);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-couple-action]');if(!button)return;
    const action=button.dataset.coupleAction;
    if(action==='open'){api.openRoom({roomId:ROOM});return;}
    if(!active())return;
    if(action==='people')people();
    if(action==='story')story();
    if(action==='milestone'){const moment=highlights().find(item=>item.id===button.dataset.coupleHighlightId);if(moment)api.jumpToMessage(moment.roomId,moment.messageId);}
    if(action==='photos')gallery();
    if(action==='photo')showPhoto(button.dataset.coupleMessage);
    if(action==='source')api.jumpToMessage(ROOM,button.dataset.coupleMessage);
    if(action==='hide-note'){noteHidden=true;save();updateNote();}
    if(action==='toggle-note'){noteHidden=!noteHidden;save();api.closeModal();updateNote();}
    if(action==='attach'){api.closeModal();document.querySelector('[data-action="attach"]')?.click();}
  });
  api.registerExtension('couple-chat',{afterRender:decorate,afterModal});
  window.MoyobomCoupleChat={open:()=>api.openRoom({roomId:ROOM})};
  if(new URLSearchParams(location.search).get('room')==='couple')api.openRoom({roomId:ROOM});
})();
