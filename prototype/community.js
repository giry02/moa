'use strict';

/* Community extension. The core owns navigation, chat, meetings and its own storage. */
(() => {
  const api = window.Moyobom;
  if (!api) return;
  let draft = null;
  let activePost = null;
  let activeProfile = null;
  let photoBusy = false;
  const KEY = 'moyeobom-community-v2';
  const MAX_FILE = 8 * 1024 * 1024;
  const $ = api.$, esc = api.esc, icon = api.icon;
  const uid = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const btn = (action, label, cls = '', value = '') => `<button type="button" class="button ${cls}" data-community-action="${action}" ${value ? `data-community-value="${esc(value)}"` : ''}>${label}</button>`;
  const empty = text => `<div class="cm-empty">${icon('book')}<p>${esc(text)}</p></div>`;
  const colors = ['#e8eee3', '#e3eaf0', '#efe7da', '#f3e3df', '#e6e7ef', '#e0ece7'];
  const categories = [...new Set(api.groups.map(g => g.category))];
  const areas = [...new Set(api.groups.map(g => g.area))];
  const stamp = at => new Intl.DateTimeFormat('ko-KR', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Seoul'}).format(at);
  function seed() {
    return {version:2, groups:{}, profiles:{}, posts:[
      {id:'post-welcome',groupId:'walk',authorId:'minji',category:'공지',pinned:true,title:'처음 오신 분들, 이렇게 함께해요',body:'반가워요! 편안한 신발과 가벼운 마음만 준비해 주세요.\n\n정모는 정모 탭에서 참석 신청을 눌러 주세요. 늦거나 장소를 못 찾겠다면 채팅방에 알려 주세요. 서로의 속도를 맞추며 함께 걸어요.\n\n첨부 사진은 산책 분위기를 보여 주는 예시 사진이에요.',images:[{id:'sample-walk',name:'산책 분위기 예시 사진',data:'assets/photos/walk.jpg'}],createdAt:Date.parse('2026-10-21T10:00:00+09:00'),sources:[]},
      {id:'post-weekend',groupId:'walk',authorId:'jisoo',category:'자유',pinned:false,title:'이번 주말, 함께 가고 싶은 곳',body:'서울숲 단풍이 예쁘게 물들기 시작했어요. 산책 후 들르기 좋은 카페도 추천받아요!\n가 보고 싶은 곳을 댓글로 남겨 주세요.',images:[],createdAt:Date.parse('2026-10-24T18:10:00+09:00'),sources:[]},
      {id:'post-memory',groupId:'walk',authorId:'junho',category:'후기',pinned:false,title:'지난 모임의 작은 기록',body:'처음 만났는데도 오랜 친구처럼 편안했던 오후였어요. 다음 산책에도 돗자리를 챙겨 갈게요. 함께해 주셔서 고마워요.',images:[],createdAt:Date.parse('2026-10-24T20:00:00+09:00'),sources:[]},
      {id:'post-book',groupId:'book',authorId:'jisoo',category:'후기',pinned:false,title:'한 문장으로 시작한 저녁',body:'각자 가져온 문장을 읽으며 마음에 남은 이야기를 나눴어요. 완독하지 않아도 이야기는 충분했답니다. 다음 만남에도 편하게 와 주세요.\n\n첨부 사진은 책과 커피의 분위기를 보여 주는 예시 사진이에요.',images:[{id:'sample-book',name:'책과 커피 분위기 예시 사진',data:'assets/photos/book.jpg'}],createdAt:Date.parse('2026-10-24T21:00:00+09:00'),sources:[]}
    ],comments:[{id:'comment-seed',postId:'post-weekend',authorId:'hyun',text:'따뜻한 커피 한 잔도 좋아요. 기대됩니다!',images:[],createdAt:Date.parse('2026-10-24T19:00:00+09:00')}],preferences:{tab:'near',area:'서울 성동구',interests:['아웃도어 / 여행','인문학 / 책 / 글']}};
  }
  let data;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    data = saved && saved.version === 2 && Array.isArray(saved.posts) && Array.isArray(saved.comments) ? saved : seed();
  } catch { data = seed(); }
  data.groups ||= {}; data.profiles ||= {}; data.preferences ||= seed().preferences;
  if(!data.samplePhotosVersion) {
    const welcome=data.posts.find(p=>p.id==='post-welcome');
    if(welcome&&!welcome.images?.length) {welcome.images=seed().posts[0].images;welcome.body+='\n\n첨부 사진은 산책 분위기를 보여 주는 예시 사진이에요.';}
    if(!data.posts.some(p=>p.id==='post-book'))data.posts.push(seed().posts.find(p=>p.id==='post-book'));
    data.samplePhotosVersion=1;
  }
  // Update only built-in sample portraits; keep members' uploaded photos and selection.
  Object.entries(data.profiles).forEach(([id, profile]) => {
    (profile.photos || []).forEach(photo => {
      if (photo.id === 'sample-' + id && /^(\.\/)?assets\/avatars\/[^/]+\.jpg$/.test(photo.data || '')) photo.data = 'assets/avatars/' + id + '.png';
    });
  });
  const getProfile = id => data.profiles[id] || {photos:[{id:'sample-'+id,name:'예시 프로필 사진',data:'assets/avatars/'+id+'.png'},...(id==='me'?[{id:'sample-my-walk',name:'산책 분위기 예시 사진',data:'assets/photos/walk.jpg'}]:[])],representativeId:'sample-'+id};
  const person = id => api.members.find(m => m.id === id) || api.members[0];
  const groupById = id => api.groups.find(g => g.id === id);
  const mine = () => person('me');
  function apply() {
    Object.entries(data.groups).forEach(([id, settings]) => { const g = groupById(id); if(g) Object.assign(g, settings); });
    api.members.forEach(m => {
      const p = getProfile(m.id);
      if(p.name) m.name = p.name;
      m.photo = p.photos?.find(photo => photo.id === p.representativeId)?.data || p.photos?.[0]?.data || '';
    });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); apply(); return true; }
    catch { api.toast('브라우저 저장 공간이 부족해요. 사진을 줄이거나 기존 사진을 삭제한 뒤 다시 저장해 주세요.'); return false; }
  }
  function commit(mutator) {
    const previous = JSON.stringify(data);
    mutator();
    if(save()) return true;
    data = JSON.parse(previous); apply(); return false;
  }
  const canManage = () => api.state.joined.has(api.state.groupId);
  function needMember() { if(canManage()) return true; api.toast('모임에 가입하면 글과 사진을 남길 수 있어요.'); return false; }
  function avatar(id, size = '', clickable = true) {
    const p = person(id);
    return `<${clickable ? 'button type="button"' : 'span'} class="cm-avatar ${size}" ${clickable ? `data-community-action="profile" data-community-value="${esc(id)}" aria-label="${esc(p.name)} 프로필 보기"` : ''} style="--cm-avatar-bg:${p.bg};--cm-avatar-fg:${p.fg}">${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)} 프로필 사진">` : esc(p.name.slice(0,1))}</${clickable ? 'button' : 'span'}>`;
  }
  function imageGrid(images, context = '사진') {
    if(!images?.length) return '';
    return `<div class="cm-image-grid cm-images-${Math.min(images.length,3)}">${images.map((image,i) => `<button type="button" data-community-action="view-image" data-community-image="${esc(image.data)}" aria-label="${esc(context)} ${i+1} 크게 보기"><img src="${esc(image.data)}" alt="${esc(image.name || context)}" loading="lazy"></button>`).join('')}</div>`;
  }
  function postsFor(groupId) { return data.posts.filter(p => p.groupId === groupId).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.createdAt-a.createdAt); }
  function canReadSource(source) {
    const roomId=source.roomId||'';
    if(roomId.startsWith('meetup:')) {const id=roomId.slice(7),meeting=api.state.meetups.find(m=>m.id===id);return Boolean(meeting&&api.state.joined.has(meeting.groupId)&&api.state.attendance.has(id));}
    if(roomId.startsWith('group:'))return api.state.joined.has(roomId.slice(6));
    return false;
  }
  function sourceCard(source) {
    const allowed=canReadSource(source),privateMeeting=source.roomId?.startsWith('meetup:');
    return `<button type="button" class="cm-source ${allowed?'':'cm-source-locked'}" data-community-action="source" data-community-room="${esc(source.roomId)}" data-community-value="${esc(source.id)}">${allowed?`<strong>${esc(source.authorName || person(source.authorId).name)}</strong><span>${esc(source.text || '첨부 이미지가 있는 대화')}</span><small>채팅 원문 보기 ${icon('arrow')}</small>`:`<strong>${icon('lock')}${privateMeeting?'참석자 전용 대화':'모임 멤버 전용 대화'}</strong><span>${privateMeeting?'이 정모에 참석 중인 멤버만 원문을 볼 수 있어요.':'모임에 가입한 멤버만 원문을 볼 수 있어요.'}</span><small>원문 접근 권한 확인 ${icon('arrow')}</small>`}</button>`;
  }
  function postCard(p) {
    const comments = data.comments.filter(c => c.postId === p.id).length;
    return `<article class="cm-post-row"><button type="button" class="cm-post-open" data-community-action="post" data-community-value="${esc(p.id)}"><div class="cm-post-summary"><span class="cm-label ${p.pinned ? 'cm-pinned' : ''}">${p.pinned ? '📌 공지' : esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.body.slice(0,85))}${p.body.length > 85 ? '…' : ''}</p><small>${esc(person(p.authorId).name)} · ${stamp(p.createdAt)} · 댓글 ${comments}${p.sources?.length ? ' · 대화 원문 연결' : ''}</small></div>${p.images?.[0] ? `<img class="cm-post-thumb" src="${esc(p.images[0].data)}" alt="첨부 사진 ${p.images.length}장">` : ''}</button></article>`;
  }
  function board() {
    const posts = postsFor(api.state.groupId);
    return `<div class="cm-section-title"><div><span class="cm-kicker">OUR STORIES</span><h2>우리의 이야기 <small>${posts.length}</small></h2></div>${btn('compose', icon('plus')+'글쓰기', 'primary')}</div><p class="cm-muted">질문, 소식, 함께 남기고 싶은 순간을 나눠요.</p><div class="cm-post-list">${posts.length ? posts.map(postCard).join('') : empty('첫 번째 이야기를 남겨 보세요.')}</div>`;
  }
  function home(existing) {
    const members = api.state.groupId.startsWith('custom-') ? [mine()] : api.members;
    const pinned = postsFor(api.state.groupId).filter(p => p.pinned);
    return `<section class="cm-member-strip cm-friend-list" aria-label="함께하는 사람들"><div class="cm-member-heading"><h3>함께하는 사람들</h3><p class="cm-muted">멤버를 눌러 프로필과 함께한 활동을 확인해요.</p></div><div class="cm-people">${members.map(m => `<button type="button" class="cm-friend-row" data-community-action="profile" data-community-value="${esc(m.id)}" aria-label="${esc(m.name)} 프로필 보기">${avatar(m.id,'',false)}<span class="cm-friend-copy"><strong>${esc(m.name)}${m.id==='me'?'<span class="cm-self-badge">나</span>':''}</strong><small>${esc(m.id==='me'&&api.state.groupId.startsWith('custom-')?'모임장':m.role)}</small></span>${icon('arrow')}</button>`).join('')}</div></section>${pinned.length&&canManage() ? `<div class="cm-home-notice"><div class="cm-section-title"><h3>📌 모임 공지</h3>${btn('compose-notice','공지 쓰기','small')}</div>${pinned.slice(0,2).map(postCard).join('')}</div>` : ''}${existing}${canManage()?`<div class="cm-home-foot">${btn('compose','첫 인사 남기기', 'soft')}${btn('manage','모임 꾸미기 · 공지 관리', '')}</div>`:''}`;
  }
  function album() {
    const entries = postsFor(api.state.groupId).flatMap(post => (post.images || []).map(img => ({...img,post})));
    return `<div class="cm-section-title"><div><span class="cm-kicker">MOMENTS TOGETHER</span><h2>함께 남긴 장면 <small>${entries.length}</small></h2></div>${btn('compose','사진 올리기', 'primary')}</div><p class="cm-muted">게시글과 공지에 올린 사진을 모아 보여요. 사진을 누르면 해당 글을 열어요.</p>${entries.length ? `<div class="cm-album">${entries.map(img => `<button type="button" data-community-action="post" data-community-value="${esc(img.post.id)}"><img src="${esc(img.data)}" alt="${esc(img.post.title)}"><span>${esc(img.post.title)}</span></button>`).join('')}</div>` : empty('첫 사진을 올리고 모임의 추억을 채워 보세요.')}`;
  }
  function showModal(title, body, footer = '', wide = false, type = 'community') {
    api.state.modal = {type};
    api.openModal(title, body, footer, wide);
    $('.modal')?.classList.add('cm-modal');
  }
  function error(text) { const el = $('[data-community-error]'); if(el) {el.hidden = false;el.textContent = text;el.scrollIntoView({block:'nearest'});} else api.toast(text); }
  function showPost(id) {
    const p = data.posts.find(p => p.id === id); if(!p) return;
    if(!api.state.joined.has(p.groupId)) {api.toast('모임에 가입하면 게시글을 볼 수 있어요.');return;}
    activePost = id; draft = {kind:'comment',images:[],postId:id};
    const comments = data.comments.filter(c => c.postId === id);
    showModal('모임 게시판', `<article class="cm-post-detail"><span class="cm-label ${p.pinned ? 'cm-pinned' : ''}">${p.pinned ? '📌 공지' : esc(p.category)}</span><h1>${esc(p.title)}</h1><div class="cm-author">${avatar(p.authorId)}<div><strong>${esc(person(p.authorId).name)}</strong><small>${stamp(p.createdAt)}${p.updatedAt ? ' · 수정됨' : ''}</small></div></div><div class="cm-prose">${esc(p.body)}</div>${imageGrid(p.images)}${p.sources?.length ? `<div class="cm-source-box"><h3>${icon('link')}이 글에 연결된 대화</h3><p class="cm-muted">작성할 때 선택한 대화예요. 원문은 해당 채팅방에서 확인해요. 참석자 전용 대화는 현재 참석자에게만 표시해요.</p>${p.sources.map(sourceCard).join('')}</div>` : ''}<div class="cm-post-tools">${p.authorId==='me' ? btn('edit-post','수정','small',p.id)+btn('delete-post','삭제','small danger',p.id) : ''}${canManage() ? btn('pin-post',p.pinned?'공지 해제':'공지로 고정','small',p.id) : ''}</div></article><section class="cm-comments"><h3>댓글 <span>${comments.length}</span></h3>${comments.map(c => `<article class="cm-comment"><div class="cm-author">${avatar(c.authorId)}<div><strong>${esc(person(c.authorId).name)}</strong><small>${stamp(c.createdAt)}</small></div>${c.authorId==='me' ? btn('delete-comment','삭제','small ghost',c.id) : ''}</div><p class="cm-prose">${esc(c.text)}</p>${imageGrid(c.images,'댓글 사진')}</article>`).join('')}${comments.length ? '' : '<p class="cm-muted">따뜻한 첫 댓글을 남겨 주세요.</p>'}<form data-community-form="comment" class="cm-comment-form"><label for="cm-comment-text">댓글 쓰기</label><textarea id="cm-comment-text" name="text" maxlength="1000" placeholder="함께 나누고 싶은 이야기를 남겨 주세요." rows="3"></textarea><div data-community-preview></div><div class="cm-inline"><label class="button small cm-upload-label">${icon('image')}사진 첨부<input type="file" data-community-upload="comment" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label><small>최대 3장 · 장당 8MB</small><button type="submit" class="button primary small">댓글 등록</button></div><p class="cm-error" data-community-error role="alert" hidden></p></form></section>`, '', true, 'community-post');
  }
  function compose(postId = null, options = {}) {
    if(!needMember()) return;
    const p = data.posts.find(p => p.id === postId);
    draft = {kind:'post',id:p?.id,groupId:p?.groupId || options.groupId || api.state.groupId,images:structuredClone(p?.images || []),sources:structuredClone(p?.sources || options.sources || []),category:options.notice?'공지':p?.category || '자유'};
    showModal(p ? '게시글 수정' : options.sources?.length ? '대화를 이어 게시글 쓰기' : '새 이야기 남기기', `<form id="cm-post-form" data-community-form="post"><div class="cm-form-grid"><label>글 종류<select name="category">${['자유','공지','가입인사','정보','후기'].map(c => `<option ${draft.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label class="cm-checkbox"><input type="checkbox" name="pinned" ${(p?.pinned || options.notice)?'checked':''}>상단 공지로 고정</label></div><label for="cm-post-title">제목</label><input id="cm-post-title" name="title" required maxlength="80" value="${esc(p?.title || options.title || '')}" placeholder="이야기의 제목을 적어 주세요"><label for="cm-post-body">내용</label><textarea id="cm-post-body" name="body" rows="7" maxlength="5000" placeholder="함께 나누고 싶은 이야기를 적어 주세요">${esc(p?.body || options.body || '')}</textarea><label class="button cm-upload-label">${icon('image')}사진 여러 장 추가<input type="file" data-community-upload="post" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label><p class="cm-muted">최대 6장 · 장당 8MB. 사진은 크기를 줄여 이 브라우저에 저장해요.</p><div data-community-preview></div>${draft.sources.length ? `<div class="cm-source-box"><h3>${icon('link')}채팅 원문 ${draft.sources.length}개 연결됨</h3>${draft.sources.map(s => `<p class="cm-muted">${canReadSource(s)?esc(s.authorName || person(s.authorId).name)+': '+esc(s.text || '사진 메시지'):'참석자 · 멤버 전용 대화 · 현재 원문 접근 권한이 없어요'}</p>`).join('')}</div>` : ''}<p class="cm-error" data-community-error role="alert" hidden></p></form>`, `${btn('cancel','취소')}<button type="submit" form="cm-post-form" class="button primary">${p?'수정 저장':'게시글 등록'}</button>`, true, 'community-compose');
    renderPreview();
  }
  function renderPreview() {
    const el = $('[data-community-preview]'); if(!el || !draft) return;
    el.innerHTML = `${photoBusy ? '<p class="cm-muted" role="status">사진 크기를 줄이고 있어요…</p>' : ''}<div class="cm-photo-previews">${draft.images.map((img,i) => `<div><img src="${esc(img.data)}" alt="${esc(img.name || '선택한 사진')}"><button type="button" data-community-action="remove-draft-image" data-community-value="${i}" aria-label="사진 ${i+1} 제거">${icon('close')}</button><small>${esc(img.name || '선택한 사진')}</small></div>`).join('')}</div>`;
  }
  async function resize(file) {
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('JPG, PNG, WebP, GIF 사진을 선택해 주세요.');
    if(file.size > MAX_FILE) throw new Error(`${file.name}: 사진 한 장은 8MB 이하로 선택해 주세요.`);
    if(!file.size) throw new Error('빈 파일은 올릴 수 없어요.');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve,reject) => {const img = new Image();img.onload = () => resolve(img);img.onerror = () => reject(new Error('사진을 읽을 수 없어요. 다른 파일을 선택해 주세요.'));img.src = url;});
      if(!img.naturalWidth || !img.naturalHeight || img.naturalWidth*img.naturalHeight > 50000000) throw new Error('사진 해상도가 너무 커요. 크기를 줄여 다시 선택해 주세요.');
      const scale = Math.min(1,960/img.naturalWidth,960/img.naturalHeight);
      const canvas = document.createElement('canvas');canvas.width = Math.max(1,Math.round(img.naturalWidth*scale));canvas.height = Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx = canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      return {id:uid('photo'),name:file.name.slice(0,100),data:canvas.toDataURL('image/jpeg',0.74)};
    } finally {URL.revokeObjectURL(url);}
  }
  async function upload(input) {
    const kind = input.dataset.communityUpload, files = [...input.files];input.value='';
    if(!files.length) return;
    if(photoBusy) {api.toast('사진 처리 후 다시 선택해 주세요.');return;}
    const max = kind==='post'?6:kind==='comment'?3:kind==='cover'?1:6;
    const target = draft;
    if(!target) return;
    if(files.length>max||(kind!=='cover'&&target.images.length+files.length>max)) {error(`사진은 최대 ${max}장까지 올릴 수 있어요.`);return;}
    photoBusy=true;renderPreview();
    try {
      const images=[];for(const file of files) images.push(await resize(file));
      if(draft!==target) return;
      if(kind==='cover')target.images=images;else target.images.push(...images);renderPreview();
      if(kind==='cover') {const el=$('[data-community-cover-preview]');if(el)el.innerHTML=`<img src="${esc(images[0].data)}" alt="선택한 모임 커버">`;}
    } catch(e) {if(draft===target) error(e.message || '사진을 처리하지 못했어요.');}
    finally {photoBusy=false;if(draft===target)renderPreview();}
  }
  function manage() {
    if(!needMember()) return;
    const g=api.group(); draft={kind:'manage',groupId:g.id,images:g.coverImage?[{id:'cover',name:'현재 커버',data:g.coverImage}]:[]};
    const notices=postsFor(g.id).filter(p=>p.pinned);
    showModal('모임 꾸미기 · 관리', `<div class="cm-demo-note">검토용 화면에서는 가입한 모임을 꾸밀 수 있어요. 실제 서비스에서는 모임장·운영진 권한으로 제한해요.</div><form id="cm-manage-form" data-community-form="manage"><label for="cm-group-name">모임 이름</label><input id="cm-group-name" name="name" maxlength="60" required value="${esc(g.name)}"><label for="cm-group-desc">모임 소개</label><textarea id="cm-group-desc" name="desc" rows="5" maxlength="1500" required>${esc(g.desc)}</textarea><div class="cm-form-grid"><label>활동 지역<select name="area">${areas.map(a=>`<option ${g.area===a?'selected':''}>${a}</option>`).join('')}</select></label><label>대표 관심사<select name="category">${categories.map(c=>`<option ${g.category===c?'selected':''}>${c}</option>`).join('')}</select></label></div><label for="cm-group-tags">꾸미기 태그 <small>쉼표로 구분 · 최대 5개</small></label><input id="cm-group-tags" name="tags" maxlength="120" value="${esc(g.tags.join(', '))}" placeholder="초보 환영, 주말 오전"><label>커버 색상</label><div class="cm-palette">${colors.map(c=>`<label style="background:${c}"><input type="radio" name="bg" value="${c}" ${g.bg===c?'checked':''}><span class="sr-only">${c} 색상</span></label>`).join('')}<label class="cm-custom-color"><input type="color" name="customColor" value="${/^#[0-9a-f]{6}$/i.test(g.bg)?g.bg:colors[0]}" aria-label="직접 색상 선택"></label></div><label>모임 커버 이미지</label><div class="cm-cover-preview" data-community-cover-preview>${g.coverImage?`<img src="${esc(g.coverImage)}" alt="현재 모임 커버">`:'<span>사진으로 모임의 분위기를 전해요</span>'}</div><div class="cm-inline"><label class="button small cm-upload-label">${icon('image')}커버 선택<input type="file" data-community-upload="cover" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>${btn('clear-cover','커버 제거','small ghost')}</div><p class="cm-muted">새 사진을 고르면 현재 커버를 교체해요. 최대 8MB.</p><div data-community-preview></div><p class="cm-error" data-community-error role="alert" hidden></p></form><section class="cm-notice-manager"><div class="cm-section-title"><h3>고정한 공지 ${notices.length}개</h3>${btn('compose-notice','새 공지','small')}</div>${notices.length?notices.map(p=>`<div class="cm-notice-item"><button type="button" data-community-action="post" data-community-value="${esc(p.id)}">${esc(p.title)}</button>${btn('pin-post','고정 해제','small',p.id)}</div>`).join(''):'<p class="cm-muted">아직 고정한 공지가 없어요.</p>'}</section>`, `${btn('cancel','취소')}<button type="submit" form="cm-manage-form" class="button primary">변경 저장</button>`, true, 'community-manage');
    renderPreview();
  }
  function profile(id) {
    activeProfile=id;
    const p=person(id), details=getProfile(id);
    const own=id==='me', visiblePosts=data.posts.filter(post=>post.authorId===id&&api.state.joined.has(post.groupId));
    const sampleIds={minji:['forest-sunday','river-sunset'],junho:['forest-sunday'],jisoo:['forest-sunday','book-evening'],hyun:['forest-sunday']};
    const meetings=api.state.meetups.filter(m=>api.state.joined.has(m.groupId)&&(own?api.state.attendance.has(m.id):(sampleIds[id]||[]).includes(m.id)));
    showModal(own?'내 프로필':'멤버 프로필', `<div class="cm-profile-head">${avatar(id,'cm-avatar-xl',false)}<h1>${esc(p.name)}</h1><span class="pill">${esc(p.role)}</span><p class="cm-prose">${esc(details.bio || (own?'함께하는 취미가 일상이 되는 중이에요.':'새로운 사람들과 취미를 나누고 싶어요. 함께 만나요!'))}</p>${own?btn('edit-profile','프로필 · 사진 관리','soft'):''}</div>${details.photos?.length?`<h3>프로필 사진 <small>${details.photos.length}</small></h3>${imageGrid(details.photos,'프로필 사진')}`:''}<section class="cm-profile-section"><h3>작성한 글 <small>${visiblePosts.length}</small></h3>${visiblePosts.length?visiblePosts.map(postCard).join(''):empty('함께 가입한 모임에 작성한 글이 없어요.')}</section><section class="cm-profile-section"><h3>참여 정모 <small>${meetings.length}</small></h3>${own?'':'<p class="cm-muted">대표 멤버의 참여 예시예요. 함께 가입한 모임만 표시해요.</p>'}${meetings.length?meetings.map(m=>`<button type="button" class="cm-meeting-link" data-meetup="${esc(m.id)}"><strong>${esc(m.title)}</strong><span>${api.dateLabel(api.meetupAt(m))} · ${api.time(api.meetupAt(m))}</span>${icon('arrow')}</button>`).join(''):empty('참여 중인 정모가 없어요.')}</section>`, '', true, 'community-profile');
  }
  function editProfile() {
    const p=getProfile('me');draft={kind:'profile',images:structuredClone(p.photos||[]),representativeId:p.representativeId||p.photos?.[0]?.id||null};
    showModal('내 프로필 · 사진 관리', `<form id="cm-profile-form" data-community-form="profile"><label for="cm-profile-name">닉네임</label><input id="cm-profile-name" name="name" maxlength="20" required value="${esc(mine().name)}"><label for="cm-profile-bio">소개</label><textarea id="cm-profile-bio" name="bio" maxlength="300" rows="3" placeholder="좋아하는 활동과 나를 소개해 주세요">${esc(p.bio||'')}</textarea><label>프로필 사진</label><p class="cm-muted">최대 6장 · 장당 8MB. 사진 아래에서 대표 사진을 선택할 수 있어요.</p><label class="button cm-upload-label">${icon('image')}사진 추가<input type="file" data-community-upload="profile" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label><div data-community-preview></div><div data-community-representatives></div><p class="cm-error" data-community-error role="alert" hidden></p></form>`, `${btn('cancel','취소')}<button type="submit" form="cm-profile-form" class="button primary">프로필 저장</button>`, true, 'community-profile-edit');
    renderPreview();renderRepresentatives();
  }
  function renderRepresentatives() {
    const el=$('[data-community-representatives]');if(!el||draft?.kind!=='profile')return;
    if(!draft.images.some(p=>p.id===draft.representativeId))draft.representativeId=draft.images[0]?.id||null;
    el.innerHTML=draft.images.length?`<div class="cm-representatives">${draft.images.map((p,i)=>`<button type="button" class="${draft.representativeId===p.id?'selected':''}" data-community-action="representative" data-community-value="${esc(p.id)}"><img src="${esc(p.data)}" alt="프로필 사진 ${i+1}"><span>${draft.representativeId===p.id?'✓ 대표 사진':'대표로 선택'}</span></button>`).join('')}</div>`:'<p class="cm-muted">사진을 올리지 않으면 닉네임의 첫 글자로 표시해요.</p>';
  }
  function myPage() {
    const p=getProfile('me');
    return `<div class="page-heading"><div><div class="eyebrow">MY SPACE</div><h1>나의 모여봄</h1><p>내 취향과 함께 남긴 시간을 모아 봐요.</p></div></div><section class="cm-my-profile">${avatar('me','cm-avatar-xl')}<div><span class="cm-kicker">MY PROFILE</span><h2>${esc(mine().name)}</h2><p>${esc(p.bio||'함께하는 취미가 일상이 되는 중이에요.')}</p><span class="cm-muted">${esc(data.preferences.area)} · 프로필 사진 ${p.photos?.length||0}장</span></div>${btn('edit-profile','프로필 편집','soft')}</section><div class="profile-stats"><div class="profile-stat"><span>참여 모임</span><strong>${api.state.joined.size}</strong></div><div class="profile-stat"><span>관심 모임</span><strong>${api.state.likes.size}</strong></div><div class="profile-stat"><span>참석 정모</span><strong>${api.state.attendance.size}</strong></div></div><section class="cm-my-preferences"><div class="cm-section-title"><h2>나의 활동 지역과 관심사</h2>${btn('preferences','설정하기','small')}</div><p>${icon('pin')}${esc(data.preferences.area)}</p><div class="tag-row">${data.preferences.interests.map(c=>`<span class="tag">${esc(c)}</span>`).join('')}</div></section><section class="cm-profile-section"><div class="cm-section-title"><h2>내가 남긴 이야기</h2>${btn('profile','내 활동 모두 보기','small','me')}</div>${data.posts.filter(p=>p.authorId==='me'&&api.state.joined.has(p.groupId)).map(postCard).join('')||empty('모임에서 첫 이야기를 남겨 보세요.')}</section><div class="cm-demo-note">프로필 사진, 게시글, 댓글, 모임 꾸미기는 크기를 줄여 이 브라우저에 저장해요. 실제 서비스의 다른 기기와 공유되지 않아요. AI·지도·다자간 채팅은 예시 흐름이에요.</div><div class="cm-my-reset">${btn('reset-community','커뮤니티 데모 데이터 초기화','small danger')}</div>`;
  }
  function groupCard(g) {
    return `<article class="group-card"><button type="button" class="group-open" data-open-group="${esc(g.id)}"><div class="group-cover cm-group-cover" style="background:${g.bg};color:${g.fg}">${g.coverImage?`<img src="${esc(g.coverImage)}" alt="${esc(g.name)} 커버">`:`<span>${esc(g.word).replace(/\n/g,'<br>')}</span><b aria-hidden="true">${g.emoji}</b>`}</div><div class="group-info"><div class="group-category">${esc(g.category)}</div><h3>${esc(g.name)}</h3><div class="group-meta"><span>${icon('pin')}${esc(g.area)}</span><span>${icon('users')}${g.members}명</span></div><div class="tag-row">${g.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div></button><button type="button" class="like-button ${api.state.likes.has(g.id)?'liked':''}" data-like="${esc(g.id)}" aria-pressed="${api.state.likes.has(g.id)}" aria-label="${esc(g.name)} 관심 모임">${icon('heart')}</button></article>`;
  }
  function explorePage() {
    const pref=data.preferences;
    const area=pref.tab==='near'?pref.area:api.state.area;
    api.state.area=area;
    return `<div class="page-heading"><div><div class="eyebrow">FIND YOUR PEOPLE</div><h1>가까운 취향, 새로운 사이</h1><p>내 동네에서, 내가 좋아하는 일로 만나요.</p></div></div><div class="cm-explore-tabs" role="tablist" aria-label="모임 탐색 기준"><button type="button" role="tab" aria-selected="${pref.tab==='near'}" class="${pref.tab==='near'?'active':''}" data-community-action="explore-tab" data-community-value="near">${icon('pin')}내 근처</button><button type="button" role="tab" aria-selected="${pref.tab==='interest'}" class="${pref.tab==='interest'?'active':''}" data-community-action="explore-tab" data-community-value="interest">${icon('heart')}내 관심사</button></div><div class="filters"><label class="search-field">${icon('search')}<span class="sr-only">모임 검색</span><input id="group-search" data-community-search type="search" value="${esc(api.state.query)}" placeholder="모임 이름이나 취미를 검색하세요" autocomplete="off"></label><label><span class="sr-only">활동 지역</span><select id="area-filter" data-community-region class="select">${pref.tab==='interest'?`<option value="all" ${area==='all'?'selected':''}>모든 지역</option>`:''}${areas.map(a=>`<option value="${esc(a)}" ${area===a?'selected':''}>${esc(a)}</option>`).join('')}</select></label></div><div class="cm-explore-description"><p>${pref.tab==='near'?`${esc(pref.area)}에서 함께할 모임을 찾아요.`:'설정한 관심사에 맞는 모임을 모아 보여요.'}</p>${btn('preferences','지역 · 관심사 설정','small ghost')}</div><div class="category-list">${['전체',...categories].map(c=>`<button type="button" class="chip ${api.state.category===c?'active':''}" data-community-action="explore-category" data-community-value="${esc(c)}" aria-pressed="${api.state.category===c}">${c==='전체'?'전체':esc(c.split(' / ')[0])}</button>`).join('')}</div>${pref.tab==='interest'?`<div class="cm-interest-note">내 관심사: ${pref.interests.map(esc).join(' · ')||'아직 선택하지 않았어요'}</div>`:''}<div class="result-title"><strong>${pref.tab==='near'?'우리 동네 모임':'내 취향의 모임'} <span id="result-count"></span></strong><span>${pref.tab==='near'?'선택한 행정구역 기준':'관심사 설정 기준'}</span></div><div class="group-grid" id="explore-results"></div>`;
  }
  function updateExplore() {
    const el=$('#explore-results');if(!el)return;
    const query=api.state.query.trim().toLowerCase(),pref=data.preferences;
    const found=api.groups.filter(g=>(api.state.area==='all'||g.area===api.state.area)&&(api.state.category==='전체'||g.category===api.state.category)&&(pref.tab!=='interest'||pref.interests.includes(g.category))&&(!query||[g.name,g.area,g.category,...g.tags].join(' ').toLowerCase().includes(query)));
    el.innerHTML=found.length?found.map(groupCard).join(''):`<div class="cm-empty">${icon('search')}<h3>조건에 맞는 모임이 없어요</h3><p>검색어를 바꾸거나 활동 지역과 관심사를 조정해 보세요.</p>${btn('clear-explore','검색 · 필터 초기화','small')}${btn('preferences','지역 · 관심사 설정','small soft')}</div>`;
    $('#result-count').textContent=found.length;
  }
  function preferences() {
    showModal('나의 활동 지역 · 관심사', `<form id="cm-preferences-form" data-community-form="preferences"><label for="cm-area">활동 지역</label><select id="cm-area" name="area">${areas.map(a=>`<option ${data.preferences.area===a?'selected':''}>${esc(a)}</option>`).join('')}</select><p class="cm-muted">내 근처 탭은 선택한 행정구역의 모임을 보여요. 현재 GPS 위치를 수집하지 않아요.</p><label>좋아하는 관심사</label><div class="cm-interest-options">${categories.map(c=>`<label><input type="checkbox" name="interest" value="${esc(c)}" ${data.preferences.interests.includes(c)?'checked':''}>${esc(c)}</label>`).join('')}</div><p class="cm-error" data-community-error role="alert" hidden></p></form>`, `${btn('cancel','취소')}<button type="submit" form="cm-preferences-form" class="button primary">설정 저장</button>`,false,'community-preferences');
  }
  function confirmAction(title,text,action,id) {showModal(title,`<p class="cm-prose">${esc(text)}</p>`,`${btn('cancel','취소')}${btn(action,'삭제하기','danger',id)}`,false,'community-confirm');}
  function afterRender() {
    if(api.state.page==='explore')updateExplore();
    if(api.state.page==='group') {
      const el=$('.detail-body'); if(!el)return;
      if(api.state.groupTab==='홈'&&!el.dataset.communityHome) {el.innerHTML=home(el.innerHTML);el.dataset.communityHome='true';}
      if(api.state.groupTab==='게시판')el.innerHTML=api.state.joined.has(api.state.groupId)?board():empty('모임에 가입하면 게시글을 읽고 이야기를 나눌 수 있어요.');
      if(api.state.groupTab==='사진첩')el.innerHTML=api.state.joined.has(api.state.groupId)?album():empty('모임에 가입하면 함께 남긴 사진을 볼 수 있어요.');
      const actions=$('.detail-actions');if(actions&&canManage()&&!actions.querySelector('[data-community-action="manage"]'))actions.insertAdjacentHTML('beforeend',btn('manage','모임 관리','small'));
    }
  }
  function afterModal() {
    if(api.state.modal?.type!=='members')return;
    const members=api.state.groupId.startsWith('custom-')?[mine()]:api.members;
    const el=$('.modal-body');if(el)el.innerHTML=`<p class="cm-muted">${esc(api.group().name)} · 멤버의 사진을 눌러 프로필과 활동을 확인해요.</p><div class="cm-member-list">${members.map(m=>`<button type="button" class="cm-member-button" data-community-action="profile" data-community-value="${esc(m.id)}">${avatar(m.id,'',false)}<span><strong>${esc(m.name)}</strong><small>${esc(m.role)}</small></span>${icon('arrow')}</button>`).join('')}</div><p class="cm-muted">대표 멤버 예시 · 실제 서비스에서는 전체 멤버를 조회해요.</p>`;
  }
  document.addEventListener('click', event => {
    const target=event.target.closest('[data-community-action]');if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();
    const action=target.dataset.communityAction,id=target.dataset.communityValue;
    if(action==='compose')compose();
    if(action==='compose-notice')compose(null,{notice:true});
    if(action==='post')showPost(id);
    if(action==='edit-post')compose(id);
    if(action==='delete-post')confirmAction('게시글을 삭제할까요?','글과 첨부 사진, 댓글이 함께 삭제돼요. 이 작업은 되돌릴 수 없어요.','confirm-delete-post',id);
    if(action==='confirm-delete-post') {const p=data.posts.find(p=>p.id===id);if(p?.authorId==='me'&&commit(()=>{data.posts=data.posts.filter(p=>p.id!==id);data.comments=data.comments.filter(c=>c.postId!==id);})){api.closeModal();api.render();api.toast('게시글을 삭제했어요.');}}
    if(action==='delete-comment') {if(commit(()=>{data.comments=data.comments.filter(c=>c.id!==id||c.authorId!=='me');}))showPost(activePost);}
    if(action==='pin-post') {const p=data.posts.find(p=>p.id===id);if(p&&canManage()&&commit(()=>{p.pinned=!p.pinned;if(p.pinned)p.category='공지';})){api.closeModal();api.render();api.toast(p.pinned?'상단 공지로 고정했어요.':'공지 고정을 해제했어요.');}}
    if(action==='cancel') {draft=null;api.closeModal();}
    if(action==='remove-draft-image'&&draft) {draft.images.splice(Number(id),1);renderPreview();renderRepresentatives();if(draft.kind==='manage')$('[data-community-cover-preview]').innerHTML='<span>커버 이미지를 선택해 주세요</span>';}
    if(action==='view-image') {const returnAction=api.state.modal?.type==='community-post'?btn('post','게시글로 돌아가기','',activePost):api.state.modal?.type==='community-profile'?btn('profile','프로필로 돌아가기','',activeProfile):btn('cancel','닫기');showModal('사진 보기',`<img class="cm-lightbox" src="${esc(target.dataset.communityImage)}" alt="첨부 사진 크게 보기">`,returnAction,true,'community-image');}
    if(action==='manage')manage();
    if(action==='clear-cover'&&draft) {draft.images=[];renderPreview();$('[data-community-cover-preview]').innerHTML='<span>커버 이미지를 선택해 주세요</span>';}
    if(action==='profile')profile(id);
    if(action==='edit-profile')editProfile();
    if(action==='representative'&&draft?.kind==='profile') {draft.representativeId=id;renderRepresentatives();}
    if(action==='source') {api.closeModal();api.jumpToMessage(target.dataset.communityRoom,id);}
    if(action==='preferences')preferences();
    if(action==='explore-tab') {if(commit(()=>{data.preferences.tab=id;})){api.state.category='전체';api.state.area=id==='near'?data.preferences.area:'all';api.render();}}
    if(action==='explore-category') {api.state.category=id;api.render();}
    if(action==='clear-explore') {api.state.query='';api.state.category='전체';if(data.preferences.tab==='interest')api.state.area='all';api.render();}
    if(action==='reset-community')confirmAction('커뮤니티 데이터를 초기화할까요?','직접 올린 사진, 게시글, 댓글, 프로필과 모임 꾸미기 설정을 이 브라우저에서 삭제해요.','confirm-reset-community','reset');
    if(action==='confirm-reset-community') {localStorage.removeItem(KEY);location.reload();}
  },true);
  document.addEventListener('change', event => {
    const input=event.target;
    if(input.matches('[data-community-upload]')) {event.stopImmediatePropagation();upload(input).then(renderRepresentatives);}
    if(input.matches('[data-community-region]')) {event.stopImmediatePropagation();api.state.area=input.value;if(data.preferences.tab==='near'){data.preferences.area=input.value;save();}api.render();}
    if(input.matches('[data-community-form="manage"] input[type="color"]')) {document.querySelectorAll('input[name="bg"]').forEach(i=>i.checked=false);}
  },true);
  document.addEventListener('input', event => {if(event.target.matches('[data-community-search]')) {event.stopImmediatePropagation();api.state.query=event.target.value;updateExplore();}},true);
  document.addEventListener('submit', event => {
    const form=event.target;if(!form.matches('[data-community-form]'))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(photoBusy) {error('사진 처리 중이에요. 잠시 후 다시 저장해 주세요.');return;}
    const kind=form.dataset.communityForm;
    if(kind==='post') {
      if(!draft||draft.kind!=='post')return;
      const title=form.elements.title.value.trim(),body=form.elements.body.value.trim();
      if(!title) {error('제목을 입력해 주세요.');return;}
      if(!body&&!draft.images.length&&!draft.sources.length) {error('내용이나 사진을 한 가지 이상 남겨 주세요.');return;}
      const id=draft.id||uid('post'), old=data.posts.find(p=>p.id===id);
      if(old&&old.authorId!=='me')return;
      const post={id,groupId:draft.groupId,authorId:'me',title,body,category:form.elements.category.value,pinned:form.elements.pinned.checked,images:structuredClone(draft.images),sources:structuredClone(draft.sources),createdAt:old?.createdAt||Date.now(),...(old?{updatedAt:Date.now()}:{})};
      if(commit(()=>{if(old)data.posts[data.posts.indexOf(old)]=post;else data.posts.push(post);})) {api.state.groupId=post.groupId;api.state.groupTab='게시판';api.state.page='group';api.render();showPost(id);api.toast(old?'게시글을 수정했어요.':'이야기를 게시했어요.');}
    }
    if(kind==='comment') {
      if(!draft||draft.kind!=='comment')return;
      const text=form.elements.text.value.trim();if(!text&&!draft.images.length){error('댓글이나 사진을 입력해 주세요.');return;}
      const comment={id:uid('comment'),postId:draft.postId,authorId:'me',text,images:structuredClone(draft.images),createdAt:Date.now()};
      if(commit(()=>data.comments.push(comment))){showPost(comment.postId);$('.cm-comments')?.scrollIntoView({block:'start'});api.toast('댓글을 남겼어요.');}
    }
    if(kind==='manage') {
      if(!draft||draft.kind!=='manage')return;
      const name=form.elements.name.value.trim(),desc=form.elements.desc.value.trim();if(!name||!desc){error('모임 이름과 소개를 입력해 주세요.');return;}
      const selected=form.querySelector('input[name="bg"]:checked');
      const bg=selected?.value||form.elements.customColor.value;
      const settings={name,desc,area:form.elements.area.value,category:form.elements.category.value,tags:form.elements.tags.value.split(',').map(t=>t.trim().replace(/^#+/, '')).filter(Boolean).slice(0,5).map(t=>t.slice(0,20)),bg,circle:bg,coverImage:draft.images[0]?.data||'',word:name.slice(0,16)};
      if(commit(()=>{data.groups[draft.groupId]=settings;})){api.persist();api.closeModal();api.render();api.toast('모임 홈과 목록에 변경 내용을 반영했어요.');}
    }
    if(kind==='profile') {
      if(!draft||draft.kind!=='profile')return;
      const name=form.elements.name.value.trim();if(!name){error('닉네임을 입력해 주세요.');return;}
      if(commit(()=>{data.profiles.me={name,bio:form.elements.bio.value.trim(),photos:structuredClone(draft.images),representativeId:draft.representativeId||draft.images[0]?.id||null};})){api.closeModal();api.render();api.toast('대표 사진과 프로필을 저장했어요.');}
    }
    if(kind==='preferences') {
      const interests=[...form.querySelectorAll('input[name="interest"]:checked')].map(i=>i.value);if(!interests.length){error('관심사를 한 가지 이상 선택해 주세요.');return;}
      if(commit(()=>{data.preferences.area=form.elements.area.value;data.preferences.interests=interests;})){api.state.area=data.preferences.tab==='near'?data.preferences.area:'all';api.state.category='전체';api.closeModal();api.render();api.toast('활동 지역과 관심사를 적용했어요.');}
    }
  },true);
  api.registerExtension('community',{init(){apply();},renderPage(page){if(page==='my')return myPage();if(page==='explore')return explorePage();},afterRender,afterModal});
  window.MoyobomCommunity={openProfile:profile,createPostFromMessages(options={}) {
    const groupId=options.groupId||api.state.groupId;if(!api.state.joined.has(groupId)){api.toast('모임에 가입하면 글을 쓸 수 있어요.');return;}
    const roomId=options.roomId||api.getRoomId();if(!canReadSource({roomId})){api.toast('현재 열람할 수 있는 채팅방에서만 대화를 연결할 수 있어요.');return;}
    const messages=options.messages||[];
    const sources=messages.slice(0,12).map(m=>({id:m.id,roomId,authorId:m.authorId||m.senderId,authorName:person(m.authorId||m.senderId).name,text:(m.text||'').slice(0,500)}));
    compose(null,{groupId,sources,title:'채팅에서 이어가는 이야기',body:''});
  },getPosts:()=>structuredClone(data.posts)};
  api.render();
})();
