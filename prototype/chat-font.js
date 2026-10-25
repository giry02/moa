'use strict';

/* Local reading preferences, scoped to mobile chat messages. */
(() => {
  const api=window.Moyobom;
  if(!api)return;
  const KEY='moyeobom-chat-appearance-v1',MIN=12,MAX=22,DEFAULT=16;
  let size=DEFAULT,opened=false;
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved?.version===1&&Number.isInteger(saved.size)&&saved.size>=MIN&&saved.size<=MAX)size=saved.size;
  } catch {}
  const $=api.$;
  const mobile=()=>document.body.classList.contains('mobile-chat-active');
  function save(){
    try {localStorage.setItem(KEY,JSON.stringify({version:1,size}));}
    catch {api.toast('글자 크기는 적용됐어요. 이 브라우저에서는 설정을 저장할 수 없어요.');}
  }
  function keepReading(change){
    const stream=$('#message-stream');
    if(!stream){change();return;}
    const near=stream.scrollHeight-stream.scrollTop-stream.clientHeight<80;
    const top=stream.getBoundingClientRect().top;
    const anchor=near?null:[...stream.children].find(node=>node.matches('.message')&&node.getBoundingClientRect().bottom>top+8);
    const offset=anchor?anchor.getBoundingClientRect().top-top:0;
    change();
    if(near)stream.scrollTop=stream.scrollHeight;
    else if(anchor?.isConnected)stream.scrollTop+=anchor.getBoundingClientRect().top-top-offset;
  }
  function updateSize(value){
    const number=Number(value);
    if(!Number.isFinite(number))return;
    keepReading(()=>{
      size=Math.max(MIN,Math.min(MAX,Math.round(number)));
      api.state.chatMessageFontSize=size;
      document.documentElement.style.setProperty('--chat-message-font-size',size+'px');
      const slider=$('#chat-font-range'),output=$('#chat-font-value');
      if(slider){slider.value=String(size);slider.setAttribute('aria-valuetext',size+'픽셀');}
      if(output)output.textContent=size+'px'+(size===DEFAULT?' · 기본':'');
      const badge=$('[data-chat-font-badge]');if(badge)badge.textContent=size+'px';
    });
  }
  function panelMarkup(){
    return `<div class="chat-font-heading"><label for="chat-font-range">채팅 글자 크기 <output id="chat-font-value" for="chat-font-range">${size}px${size===DEFAULT?' · 기본':''}</output></label><button type="button" class="icon-button" data-chat-font-action="close" aria-label="글자 크기 조절 닫기">${api.icon('close')}</button></div><div class="chat-font-slider"><button type="button" data-chat-font-action="smaller" aria-label="채팅 글자 작게">가</button><input id="chat-font-range" type="range" min="${MIN}" max="${MAX}" step="1" value="${size}" aria-label="채팅 글자 크기" aria-valuetext="${size}픽셀"><button type="button" data-chat-font-action="larger" aria-label="채팅 글자 크게">가</button></div><p class="chat-font-preview">반가워요! 다음 모임에서 만나요.</p><div class="chat-font-footer"><span>내 채팅 메시지에만 적용돼요</span><button type="button" data-chat-font-action="reset">기본 크기</button></div>`;
  }
  function close(focus=false){
    opened=false;
    keepReading(()=>{const panel=$('#chat-font-panel');if(panel)panel.hidden=true;document.body.classList.remove('chat-font-adjusting');});
    if(focus)$('.chat-more-button')?.focus({preventScroll:true});
  }
  function open(){
    if(!mobile()||api.state.page!=='chat')return;
    api.closeModal();
    $('[data-action="sticker-close"]')?.click();
    $('#message-input')?.blur();
    if($('#mention-popup')){$('#mention-popup').hidden=true;api.state.mentionQuery=null;}
    if($('#emoji-popup'))$('#emoji-popup').hidden=true;
    const panel=$('#chat-font-panel');if(!panel)return;
    opened=true;
    keepReading(()=>{panel.innerHTML=panelMarkup();panel.hidden=false;document.body.classList.add('chat-font-adjusting');});
    $('#chat-font-range')?.focus({preventScroll:true});
  }
  api.registerExtension('chat-reading-size',{
    init(){updateSize(size);},
    afterRender(){
      opened=false;document.body.classList.remove('chat-font-adjusting');
      if(api.state.page!=='chat')return;
      const wrap=$('.chat-stream-wrap');
      if(wrap&&!$('#chat-font-panel'))wrap.insertAdjacentHTML('beforeend','<section id="chat-font-panel" class="chat-font-panel" aria-label="채팅 글자 크기 조절" hidden></section>');
    },
    afterModal(){
      if(api.state.modal?.type!=='chat-more'||!mobile())return;
      const content=$('.chat-more-content');if(!content||content.querySelector('[data-chat-font-action="open"]'))return;
      content.insertAdjacentHTML('afterbegin',`<div class="chat-more-section"><button type="button" class="chat-font-entry" data-chat-font-action="open"><span class="chat-font-symbol" aria-hidden="true">가<span>가</span></span><span><strong>채팅 글자 크기</strong><small>대화를 보면서 바로 조절</small></span><span data-chat-font-badge>${size}px</span>${api.icon('arrow')}</button></div>`);
    }
  });
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-chat-font-action]');if(!control)return;
    event.preventDefault();event.stopPropagation();
    switch(control.dataset.chatFontAction){
      case 'open':open();break;
      case 'close':close(true);break;
      case 'smaller':updateSize(size-1);save();break;
      case 'larger':updateSize(size+1);save();break;
      case 'reset':updateSize(DEFAULT);save();break;
    }
  },true);
  document.addEventListener('input',event=>{if(event.target.id==='chat-font-range')updateSize(event.target.value);});
  document.addEventListener('change',event=>{if(event.target.id==='chat-font-range'){updateSize(event.target.value);save();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){event.preventDefault();close(true);}});
  window.addEventListener('resize',()=>{if(opened&&!mobile())close();},{passive:true});
})();
