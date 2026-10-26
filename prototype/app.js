'use strict';

(() => {
  const extensions = new Map();
  let appAPI;
  let cancelReplySwipe=()=>{};
  let disposeReplySwipe=()=>{};
  const requestedView=new URLSearchParams(location.search).get('view');
  const viewMode=['mobile','web'].includes(requestedView)?requestedView:location.pathname.endsWith('/mobile.html')?'mobile':location.pathname.endsWith('/web.html')?'web':'auto';
  const forcedMobile=viewMode==='mobile',forcedWeb=viewMode==='web';
  const usesMobileLayout=()=>!forcedWeb&&(forcedMobile||window.innerWidth<=880);
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const iconPaths = {
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
    chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M20 21v-2a8 8 0 0 0-16 0v2"/>',
    search:'<circle cx="10.7" cy="10.7" r="7.3"/><path d="m16 16 5 5"/>',
    pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    arrow:'<path d="m9 5 7 7-7 7"/>', back:'<path d="m15 5-7 7 7 7"/>', down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', plus:'<path d="M12 5v14M5 12h14"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 4h2m3 0h2m-7 3h2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-2v4m-2-2h4"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    link:'<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7m2.7 6.1a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    send:'<path d="m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    navigation:'<path d="m3 11 19-9-9 19-2-8-8-2Z"/>',
    external:'<path d="M15 3h6v6m0-6L10 14m-1-11H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>',
    check:'<path d="m5 12 4 4L19 6"/>', bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12a2 2 0 0 0 4 0"/>',
    messagePlus:'<path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.4-5.7A8.5 8.5 0 0 1 12 3h1m5-2v6m-3-3h6"/>',
    book:'<path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H2V3Zm20 0h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h6V3Z"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.compass}</svg>`;
  const stickerById = id => window.MoyobomStickers?.get(id) || null;
  const stickerPackName = sticker => window.MoyobomStickers?.packs?.find(pack=>pack.id===sticker?.pack)?.name || window.MoyobomStickers?.packName || '이모티콘';
  const storageKey = 'moyeobom-prototype-v1';
  const sampleNow = Date.parse('2026-10-25T21:00:00+09:00');
  const todayStart = Date.parse('2026-10-25T00:00:00+09:00');
  const weekStart = Date.parse('2026-10-19T00:00:00+09:00');
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { stored = {}; }
  const validArray = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  const groups = [
    {id:'walk',name:'성수에서 만나는 느린 산책',area:'서울 성동구',category:'아웃도어 / 여행',members:24,word:'조금 느리게,\n함께 걷기',emoji:'🌳',bg:'#e8eee3',fg:'#536b48',circle:'#d3dfc8',tags:['초보 환영','주말 오전'],desc:'바쁜 한 주의 끝, 가볍게 걸으며 일상을 나눠요.\n잘 걷는 사람보다 함께 걷고 싶은 사람을 기다립니다.\n서울숲과 한강을 중심으로 주말마다 만나요.',activity:'매주 일요일 오전',age:'누구나 편하게 참여해요'},
    {id:'book',name:'퇴근 후 한 챕터',area:'서울 성동구',category:'인문학 / 책 / 글',members:18,word:'오늘의 문장,\n우리의 대화',emoji:'📖',bg:'#efe7da',fg:'#80644e',circle:'#e1d1b9',tags:['월 2회','독서 모임'],desc:'완독하지 않아도 괜찮아요.\n마음에 남은 한 문장으로 시작하는 책 이야기.\n격주 수요일, 성수의 조용한 카페에서 만납니다.',activity:'격주 수요일 저녁',age:'책을 좋아하는 누구나'},
    {id:'racket',name:'라켓온 · 초보 배드민턴',area:'서울 마포구',category:'운동 / 스포츠',members:32,word:'가볍게 치고,\n즐겁게 웃고',emoji:'🏸',bg:'#e3eaf0',fg:'#53718b',circle:'#cbdbe7',tags:['입문 환영','장비 대여'],desc:'처음 라켓을 잡아도 괜찮아요.\n기초 자세부터 차근차근 배우고 함께 땀 흘립니다.\n무리한 경쟁보다 즐겁게 운동하는 시간을 지향해요.',activity:'매주 토요일 오후',age:'배드민턴 입문 / 초급'},
    {id:'photo',name:'주말 한 컷, 사진산책',area:'서울 성동구',category:'사진 / 영상',members:21,word:'평범한 하루의\n다른 장면',emoji:'📷',bg:'#e6e7ef',fg:'#686a8c',circle:'#d2d4e5',tags:['휴대폰 가능','출사'],desc:'좋은 장비보다 다정한 시선을 믿어요.\n휴대폰 하나만 들고 와도 환영합니다.\n동네의 작은 풍경을 함께 발견해요.',activity:'월 2회 주말',age:'사진을 좋아하는 누구나'},
    {id:'food',name:'맛있는 대화 한 스푼',area:'서울 마포구',category:'사교 / 인맥',members:16,word:'한 끼 식사,\n새로운 사이',emoji:'🥗',bg:'#f3e7dc',fg:'#a5754f',circle:'#e9cdb2',tags:['소규모','동네 맛집'],desc:'새로운 동네, 새로운 식탁, 새로운 친구.\n부담 없는 한 끼를 함께하며 일상을 나눕니다.\n소수 인원으로 편안하게 만나요.',activity:'격주 토요일 점심',age:'함께 식사할 친구를 찾는 분'},
    {id:'clay',name:'흙으로 빚는 작은 시간',area:'경기 성남시',category:'공예 / 만들기',members:12,word:'손끝에서 피는\n작은 취미',emoji:'🏺',bg:'#eae5e0',fg:'#8c7565',circle:'#d9c8b9',tags:['원데이 클래스','취미'],desc:'손으로 만드는 일에 집중하는 느긋한 시간.\n나만의 컵과 접시를 빚으며 새로운 취미를 시작해요.\n처음이어도 강사와 함께 완성할 수 있어요.',activity:'월 1회 일요일',age:'만드는 걸 좋아하는 누구나'}
  ];
  const members = [
    {id:'minji',name:'민지',role:'모임장',bg:'#e5eadd',fg:'#6a7c4d'},
    {id:'junho',name:'준호',role:'멤버',bg:'#e2e9f0',fg:'#5d7893'},
    {id:'jisoo',name:'지수',role:'멤버',bg:'#f3e3df',fg:'#a37067'},
    {id:'hyun',name:'현우',role:'멤버',bg:'#e8e2ef',fg:'#837297'},
    {id:'me',name:'나',role:'멤버',bg:'#f9e7d2',fg:'#936b3d'}
  ];
  members.forEach(m=>{m.photo='./assets/avatars/'+m.id+'.png';});
  const coupleMember=window.MoyobomCoupleStory?.member;
  if(coupleMember)members.push({...coupleMember,partnerId:'jisoo'});
  if(coupleMember){members.find(m=>m.id==='jisoo').partnerId='hohyung';groups.find(g=>g.id==='walk').members++;}
  const coupleGroup={id:'couple',name:'지수 ♥ 이호형',area:'우리 둘',category:'대화',members:2,emoji:'🤍',bg:'#fbede7',fg:'#9e6258',participantIds:['jisoo','hohyung']};
  const places = [
    {id:'forest',name:'서울숲 방문자센터',address:'서울 성동구 성수동1가 · 서울숲',lat:37.5445,lng:127.0374},
    {id:'station',name:'뚝섬역 8번 출구',address:'서울 성동구 아차산로 · 뚝섬역',lat:37.5470,lng:127.0474},
    {id:'seongsu',name:'성수연방',address:'서울 성동구 성수이로14길',lat:37.5443,lng:127.0565},
    {id:'mangwon',name:'망원한강공원',address:'서울 마포구 망원동 · 한강공원',lat:37.5555,lng:126.8951},
    {id:'pangyo',name:'판교역',address:'경기 성남시 분당구 판교역로',lat:37.3948,lng:127.1112}
  ];
  for(const place of places){const preview=window.PLACE_PREVIEWS?.[place.id];if(preview)Object.assign(place,{lat:preview.lat,lng:preview.lng,address:preview.address||place.address});}
  groups.find(g=>g.id==='walk').coverImage='./assets/photos/walk.jpg';groups.find(g=>g.id==='book').coverImage='./assets/photos/book.jpg';
  const initialMeetups = [
    {id:'forest-sunday',groupId:'walk',title:'가을 서울숲, 천천히 한 바퀴',date:'2026-11-01T10:00',placeId:'forest',meetingPoint:'방문자센터 정문 앞, 초록색 모자를 찾아주세요.',capacity:12,count:7,description:'서울숲을 가볍게 걷고, 근처에서 커피 한 잔 해요.\n간식과 물은 각자 준비해 주세요. 우천 시 전날 저녁에 공지합니다.'},
    {id:'river-sunset',groupId:'walk',title:'노을 따라 한강 산책',date:'2026-11-07T16:30',placeId:'mangwon',meetingPoint:'공원 안내센터 앞에서 만나요.',capacity:10,count:4,description:'편한 신발과 따뜻한 겉옷을 준비해 주세요.'},
    {id:'book-evening',groupId:'book',title:'내가 아끼는 한 문장',date:'2026-11-04T19:30',placeId:'seongsu',meetingPoint:'입구에서 함께 이동해요. 도서는 자유 선택입니다.',capacity:8,count:5,description:'최근 읽은 책에서 마음에 남은 문장을 가져와 주세요.'}
  ];
  initialMeetups.push(
    {id:'walk-coffee',groupId:'walk',title:'걷고 커피, 성수 골목 탐방',date:'2026-11-08T11:00',placeId:'seongsu',meetingPoint:'성수연방 입구 앞',capacity:8,description:'골목 산책 후 커피를 마셔요.',attendeeIds:['minji','jisoo','me']},
    {id:'walk-night',groupId:'walk',title:'금요일 저녁, 퇴근길 산책',date:'2026-11-13T19:30',placeId:'station',meetingPoint:'8번 출구 앞',capacity:10,description:'퇴근 후 짧게 걸어요. 반사 소재 겉옷을 챙겨 주세요.',attendeeIds:['junho','hyun']},
    {id:'racket-first',groupId:'racket',title:'초보도 함께, 주말 랠리',date:'2026-11-07T14:00',placeId:'mangwon',meetingPoint:'공원 안내센터 앞',capacity:8,description:'가볍게 몸을 풀고 기초 랠리를 연습해요.',attendeeIds:['minji','junho','hyun']}
  );
  initialMeetups.forEach(m=>{m.attendeeIds??=m.id==='forest-sunday'?['minji','junho','jisoo','hyun','me']:m.id==='river-sunset'?['minji','hyun']:['minji','jisoo'];m.count=m.attendeeIds.filter(id=>id!=='me').length;});
  const ts = (day,time) => Date.parse(`2026-10-${day}T${time}:00+09:00`);
  const sampleMessages = [
    {id:'m1',senderId:'minji',at:ts('21','19:10'),text:'새로 오신 분들 환영해요! 잘 걷는 것보다 편하게 함께하는 게 우리 모임의 목표예요.'},
    {id:'m2',senderId:'hyun',at:ts('21','19:15'),text:'안녕하세요! 주말에 가볍게 걷고 싶어서 가입했어요.'},
    {id:'m3',senderId:'jisoo',at:ts('21','19:18'),text:'반가워요 현우님. 처음 오셔도 금방 친해질 수 있어요 🙂'},
    {id:'m4',senderId:'me',at:ts('21','19:20'),text:'저도 첫 모임 기다리고 있어요!'},
    {id:'m5',senderId:'junho',at:ts('24','17:20'),text:'지난번 서울숲 산책 정말 좋았어요. 다음에도 같이 걸어요.'},
    {id:'m6',senderId:'minji',at:ts('24','17:25'),text:'다음 정모는 11월 1일 일요일로 준비하고 있어요. 자세한 장소는 내일 올릴게요.'},
    {id:'m7',senderId:'jisoo',at:ts('25','18:00'),text:'오늘 날씨가 산책하기 딱 좋네요. 다음 주도 맑았으면 좋겠어요.'},
    {id:'m8',senderId:'hyun',at:ts('25','18:03'),text:'저도 다음 주 참여할게요! 준비물이 있을까요?'},
    {id:'m9',senderId:'minji',at:ts('25','18:10'),text:'11월 1일 일요일 오전 10시, 서울숲 방문자센터 정문 앞에서 만나요. 정모도 등록했어요.',meetupId:'forest-sunday'},
    {id:'m10',senderId:'junho',at:ts('25','18:16'),text:'돗자리는 제가 챙길게요. 비가 오면 토요일 저녁에 알려주세요.'},
    {id:'m11',senderId:'jisoo',at:ts('25','18:20'),text:'간식과 물은 각자 준비해요. 참석 신청은 토요일까지 눌러주세요.'},
    {id:'m12',senderId:'minji',at:ts('25','18:32'),text:'네, 비가 오면 토요일 저녁에 취소 여부를 공지할게요.'},
    {id:'m13',senderId:'hyun',at:ts('25','18:36'),text:'정모 장소 확인했어요. 편한 운동화 신고 갈게요.'},
    {id:'m14',senderId:'junho',at:ts('25','19:05'),text:'돗자리 준비할게요. 정모 카드의 지도에서 집결 장소를 확인하면 되겠네요.'},
    {id:'m15',senderId:'jisoo',at:ts('25','19:12'),text:'처음 오시는 분은 방문자센터 정문에서 초록색 모자를 찾아주세요.'},
    {id:'m16',senderId:'me',at:ts('25','19:20'),text:'참석 눌렀어요. 일요일에 만나요!'},
    {id:'m17',senderId:'minji',at:ts('25','19:22'),text:'좋아요! 궁금한 점은 여기 채팅에 편하게 남겨주세요.'}
  ];
  const conversationThemes=[
    ['산책 코스','서울숲 그늘길을 지나 습지생태원 쪽으로 걸으면 어떨까요?','보행로가 넓은 구간으로 가면 처음 오시는 분도 편하겠네요.','중간 벤치에서 쉬어 가는 구간도 있으면 좋겠어요.','출발 전에 모임장 안내를 함께 확인해요.'],
    ['일정 조율','이번 주말 가능한 시간을 알려 주세요.','저는 오전에 조금 여유가 있어요.','이동 시간을 생각하면 10시 이후가 편하겠어요.','정확한 집결 시간은 마지막 공지로 확인해요.'],
    ['준비물','물과 개인 간식은 각자 챙겨요.','가벼운 겉옷을 챙기면 쉬는 시간에도 좋겠어요.','돗자리는 한 장이면 충분할 것 같아요.','쓰레기는 각자 가져갈 봉투도 준비해요.'],
    ['처음 참여','처음 참석하는데 걷는 속도가 빠른 편인가요?','대화하면서 천천히 걸어요. 중간 합류도 미리 알려 주세요.','집결 장소를 못 찾으면 정모 전용방에 남겨 주세요.','참석 버튼을 누르면 정모 전용 채팅방에 들어올 수 있어요.'],
    ['동네 이야기','성수 골목에 조용한 카페를 발견했어요.','산책 뒤에는 각자 일정에 맞춰 자유롭게 귀가해도 좋아요.','지난번 함께 본 은행나무 길이 참 예뻤어요.','다음 코스 추천도 게시판에서 이어가요.'],
    ['날씨와 안전','우천 여부는 전날 저녁 공지를 기다려 주세요.','공원 자전거 통행 구간에서는 가장자리로 걸어요.','길을 건널 때 뒤에 오는 분들도 확인해요.','일교차가 커서 돌아갈 때 입을 옷도 필요해요.'],
    ['참석 확인','이번 정모 참석 등록했어요.','일정이 바뀌면 참석 취소도 미리 부탁드려요.','정모마다 참석자가 달라서 각 전용방에서 이야기하면 편하겠어요.','모임 공지와 정모 집결 안내를 확인했어요.']
  ];
  for(let day=19;day<=25;day++)for(let i=0;i<70;i++){
    const theme=conversationThemes[Math.floor(i/10)%conversationThemes.length];
    const author=['minji','junho','jisoo','hyun'][(i+day)%4];
    const at=Date.parse(`2026-10-${day}T09:00:00+09:00`)+i*9*60000;
    sampleMessages.push({id:`bulk-${day}-${i}`,senderId:author,roomId:'group:walk',groupId:'walk',at,text:theme[1+(i%4)]+(i%10===8?' '+(day-18)+'번째 주제 나눔에서 나온 의견이에요.':''),topic:theme[0]});
  }
  sampleMessages.push(
    {id:'final-schedule',senderId:'minji',at:ts('25','20:30'),text:'일정 최종 확정: 11월 1일 서울숲 산책은 오전 10시 30분으로 변경합니다. 방문자센터 정문에서 만나요. 이전 10시 안내 대신 이 공지를 확인해 주세요.',topic:'정모 일정',summaryText:'서울숲 정모는 11월 1일 오전 10시 30분으로 변경 확정됐어요. 이전 10시 안내보다 이 공지가 최신입니다.',meetupId:'forest-sunday'},
    {id:'final-equipment',senderId:'junho',at:ts('25','20:35'),text:'돗자리는 제가 준비합니다. 간식과 물은 개인별로 챙겨 주세요.',topic:'준비물',summaryText:'준호가 돗자리를 준비하며, 물과 간식은 각자 챙겨요.'},
    {id:'walk-photo',senderId:'jisoo',at:ts('25','20:40'),text:'지난번 산책에서 본 풍경이에요. 집결할 때도 이 길 쪽으로 걸어오면 좋아요.',photo:'./assets/photos/walk.jpg',topic:'사진 공유'},
    {id:'walk-reply',senderId:'hyun',at:ts('25','20:43'),text:'사진 덕분에 찾기 쉽겠어요. 감사합니다!',replyTo:'walk-photo',mentions:['jisoo']}
  );
  initialMeetups.find(m=>m.id==='forest-sunday').date='2026-11-01T10:30';
  sampleMessages.forEach(m=>{m.groupId??='walk';m.roomId??='group:'+m.groupId;});
  const subTopics=['정문 앞에 모이는 순서를 확인해요.','초록색 모자를 찾으면 우리 일행이에요.','물은 각자 챙기고 간식은 필요한 만큼만 준비해요.','늦게 합류하면 현재 위치를 채팅으로 알려 주세요.','사진을 찍을 때는 다른 분의 동의를 먼저 구해요.','걷다가 피곤하면 벤치에서 잠시 쉬어 가요.'];
  for(const m of initialMeetups){
    const amount=m.id==='forest-sunday'?120:8;
    for(let i=0;i<amount;i++)sampleMessages.push({id:`sub-${m.id}-${i}`,senderId:m.attendeeIds.filter(id=>id!=='me')[i%Math.max(1,m.attendeeIds.filter(id=>id!=='me').length)]||'minji',groupId:m.groupId,roomId:'meetup:'+m.id,at:ts('25','15:00')+i*150000,text:m.id==='forest-sunday'?subTopics[i%subTopics.length]:`${m.title} · ${['집결 위치를 확인했어요.','참석자끼리 준비물을 나눠 챙겨요.','당일 합류 안내는 이 방에서 나눠요.','편한 신발로 만나요.'][i%4]}`,photo:i===4?'./assets/photos/walk.jpg':undefined,topic:m.id==='forest-sunday'?['집결 순서','집결 표식','개인 준비물','늦은 합류','촬영 동의','휴식 안내'][i%6]:'정모 준비'});
  }
  if(coupleMember)sampleMessages.push(...(window.MoyobomCoupleStory?.messages||[]));
  sampleMessages.sort((a,b)=>a.at-b.at);
  const summaries = [
    {tag:'정모 일정',text:'11월 1일 일요일 오전 10시, 서울숲 방문자센터 정문 앞에서 만나요.',sourceIds:['m9']},
    {tag:'준비와 참석',text:'간식과 물은 각자 준비하고, 참석 신청은 토요일까지 해요.',sourceIds:['m11']},
    {tag:'우천 안내',text:'비가 오면 모임장이 토요일 저녁에 취소 여부를 공지해요.',sourceIds:['m12']},
    {tag:'준호의 준비',text:'준호가 돗자리를 준비하기로 했어요.',sourceIds:['m14']},
    {tag:'집결 위치',text:'처음 참여하는 분은 방문자센터 정문에서 초록색 모자를 찾아요.',sourceIds:['m15']},
    {tag:'모임 안내',text:'편하게 함께 걷는 모임이며, 처음 참여해도 환영해요.',sourceIds:['m1']}
  ];
  const groupCategories=['아웃도어 / 여행','운동 / 스포츠','인문학 / 책 / 글','사진 / 영상','사교 / 인맥','공예 / 만들기'];
  const groupAreas=['서울 성동구','서울 마포구','경기 성남시'];
  if(Array.isArray(stored.groups)){
    for(const item of stored.groups.slice(-30)){
      if(!item||typeof item.id!=='string'||!/^custom-[0-9]+$/.test(item.id)||typeof item.name!=='string'||!groupCategories.includes(item.category)||!groupAreas.includes(item.area))continue;
      groups.push({id:item.id,name:item.name.slice(0,60),area:item.area,category:item.category,desc:String(item.desc||'').slice(0,1500),capacity:Math.min(200,Math.max(2,Number(item.capacity)||30)),joinMode:item.joinMode==='approval'?'approval':'open',members:1,includesMe:true,word:item.name.slice(0,14),emoji:'🌱',bg:'#ede9df',fg:'#807151',circle:'#ddd3ba',tags:['새 모임',item.joinMode==='approval'?'승인제':'자유 가입'],activity:'정모에서 함께 정해요',age:'관심 있는 누구나'});
    }
  }
  const allowedIds = new Set(groups.map(g=>g.id));
  if(coupleMember)allowedIds.add('couple');
  const persistedMeetups = Array.isArray(stored.meetups) ? stored.meetups.filter(m=>m && typeof m.id==='string' && allowedIds.has(m.groupId) && typeof m.title==='string' && places.some(p=>p.id===m.placeId) && typeof m.date==='string').map(m=>({...m,capacity:Math.max(2,Math.min(100,Number(m.capacity)||12)),count:0})) : [];
  const persistedMessages = Array.isArray(stored.messages) ? stored.messages.filter(m=>m && typeof m.id==='string' && typeof m.text==='string' && members.some(p=>p.id===m.senderId) && Number.isFinite(m.at)).slice(-160).map(m=>({id:m.id,senderId:m.senderId,at:m.at,text:m.text.slice(0,2000),groupId:allowedIds.has(m.groupId)?m.groupId:'walk',roomId:typeof m.roomId==='string'?m.roomId:'group:'+(allowedIds.has(m.groupId)?m.groupId:'walk'),mentions:validArray(m.mentions).filter(id=>members.some(p=>p.id===id)),replyTo:typeof m.replyTo==='string'?m.replyTo:null,stickerId:stickerById(m.stickerId)?.id||null,stickerCaption:m.stickerCaption===true})) : [];
  const publicSeed=sampleMessages.filter(m=>m.roomId==='group:walk');
  const defaultRead=publicSeed[Math.max(0,publicSeed.length-301)]?.at??ts('25','18:03');
  const state = {
    page:'explore',groupId:'walk',groupTab:'홈',query:'',area:'all',category:'전체',
    joined:new Set(Array.isArray(stored.joined)?validArray(stored.joined).filter(id=>allowedIds.has(id)):['walk','book','racket']),
    likes:new Set(validArray(stored.likes).filter(id=>allowedIds.has(id))),attendance:new Set(Array.isArray(stored.attendance)?validArray(stored.attendance):['forest-sunday','walk-coffee','book-evening','racket-first']),
    meetups:[...initialMeetups,...persistedMeetups],messages:[...sampleMessages,...persistedMessages],
    roomId:'group:walk',readByRoom:Object.fromEntries([...groups.map(g=>'group:'+g.id),...initialMeetups.map(m=>'meetup:'+m.id)].map(id=>[id,stored.datasetVersion===2&&Number.isFinite(stored.readByRoom?.[id])?stored.readByRoom[id]:(id==='group:walk'?defaultRead:ts('25','15:10'))])),unreadSnapshot:defaultRead,
    summaryOpen:false,summaryTarget:'all',summaryPerson:'minji',summaryRange:'unread',summaryStatus:'idle',summaryResult:[],summaryCount:0,
    focusId:null,newMessageCount:0,photo:null,photoName:'',modal:null,routeState:'initial',routeStart:null,routeMode:'walk',placeChoice:null,
    formDraft:null,summaryJob:0,summaryCutoff:sampleNow,
    mentionIds:[],mentionQuery:null,mentionStart:-1,mentionIndex:0,mentionChoices:[],replyTo:null,emojiOpen:false,
    stickerOpen:false,stickerTab:'stickers',stickerPack:'bunny',selectedSticker:null,stickerRecent:validArray(stored.stickerRecent).filter(id=>stickerById(id)).slice(0,10),
    reactions:stored.reactions&&typeof stored.reactions==='object'?stored.reactions:{},
    notificationPrefs:stored.notificationPrefs&&typeof stored.notificationPrefs==='object'?stored.notificationPrefs:{},
    notifications:Array.isArray(stored.notifications)?stored.notifications.filter(n=>n&&typeof n.id==='string'&&typeof n.roomId==='string'&&typeof n.messageId==='string').slice(-80):[],
    vibrationPreview:'',postSelection:[],inboxFilter:'all'
  };
  Object.defineProperty(state,'readThrough',{get(){return state.readByRoom[getRoomId()]??ts('25','15:10');},set(value){state.readByRoom[getRoomId()]=value;}});
  state.reactions['walk-reply']??={'👍':['minji','me']};
  if(coupleMember){
    const coupleMessages=sampleMessages.filter(m=>m.roomId==='group:couple');
    state.readByRoom['group:couple']=Number.isFinite(stored.readByRoom?.['group:couple'])?stored.readByRoom['group:couple']:coupleMessages[Math.max(0,coupleMessages.length-151)]?.at||0;
    for(const message of coupleMessages.filter(m=>m.stickerId||m.photo).slice(-4))state.reactions[message.id]??={'❤️':[message.senderId==='jisoo'?'hohyung':'jisoo']};
  }
  const nextMessageTime = () => Math.max(sampleNow,...state.messages.map(m=>m.at))+1000;
  let toastTimer, previousFocus;
  const time = at => new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(at));
  const timeExact = at => new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(at));
  const dateKey = at => new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(at));
  const dateLabel = at => new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(at));
  const meetupAt = meetup => Date.parse(meetup.date+':00+09:00');
  const group = () => state.groupId==='couple'?coupleGroup:groups.find(g=>g.id===state.groupId) || groups[0];
  const getSelfId = (roomId=getRoomId()) => roomId==='group:couple'?'hohyung':'me';
  const isSelfMessage = message => message.senderId===getSelfId(message.roomId||'group:'+(message.groupId||'walk'));
  const member = id => { const found=members.find(m=>m.id===id)||members[0]; return state.groupId.startsWith('custom-')&&id==='me'?{...found,role:'모임장'}:found; };
  const safeMedia=value=>typeof value==='string'&&(/^(blob:|\.\/assets\/|assets\/)/.test(value)||/^data:image\/(png|jpeg|webp|gif);/.test(value))?value:'';
  const avatarMarkup=(person,extra='')=>`<span class="avatar ${extra}" style="background:${person.bg};color:${person.fg}">${safeMedia(person.photo)?`<img src="${esc(person.photo)}" alt="${esc(person.name)} 프로필">`:esc(person.name.slice(0,1))}</span>`;
  const roomMeetup=()=>state.meetups.find(m=>'meetup:'+m.id===getRoomId());
  function roomParticipants(roomId=getRoomId()){
    if(roomId==='group:couple')return coupleGroup.participantIds.map(member);
    const m=state.meetups.find(m=>'meetup:'+m.id===roomId);
    if(m)return [...new Set([...(m.attendeeIds||[]).filter(id=>id!=='me'),...(state.attendance.has(m.id)?['me']:[])])].map(member);
    const g=groups.find(g=>'group:'+g.id===roomId);return g?.id.startsWith('custom-')?[member('me')]:members;
  }
  function canOpenRoom(roomId=getRoomId()){
    if(roomId==='group:couple')return Boolean(coupleMember);
    if(roomId.startsWith('group:'))return state.joined.has(roomId.slice(6));
    const m=state.meetups.find(m=>'meetup:'+m.id===roomId);return !!m&&state.joined.has(m.groupId)&&state.attendance.has(m.id);
  }
  function roomMessagesById(roomId){return state.messages.filter(m=>(m.roomId||'group:'+(m.groupId||'walk'))===roomId).sort((a,b)=>a.at-b.at);}
  function unreadCount(roomId=getRoomId(),cursor=state.readByRoom[roomId]??0){return roomMessagesById(roomId).filter(m=>m.at>cursor).length;}
  function persist(){
    const sampleIds=new Set(sampleMessages.map(m=>m.id));
    const savedMessages=state.messages.filter(m=>!sampleIds.has(m.id)).slice(-160).map(({id,senderId,at,text,groupId,roomId,mentions,replyTo,stickerId,stickerCaption})=>({id,senderId,at,text,groupId,roomId,mentions,replyTo,stickerId,stickerCaption}));
    try { localStorage.setItem(storageKey,JSON.stringify({datasetVersion:2,stickerRecent:state.stickerRecent,joined:[...state.joined],likes:[...state.likes],attendance:[...state.attendance],readByRoom:state.readByRoom,reactions:state.reactions,notificationPrefs:state.notificationPrefs,notifications:state.notifications,groups:groups.filter(g=>g.id.startsWith('custom-')).map(g=>({id:g.id,name:g.name,area:g.area,category:g.category,desc:g.desc,capacity:g.capacity,joinMode:g.joinMode})),meetups:state.meetups.filter(m=>!initialMeetups.some(x=>x.id===m.id)),messages:savedMessages})); }
    catch { toast('이 브라우저에서는 변경 내용을 저장할 수 없어요. 현재 화면에서는 계속 사용할 수 있어요.'); }
  }
  function toast(text){const element=$('#toast');element.textContent=text;element.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.hidden=true,3500);}
  function loadMultiGroupSample(){
    let addedGroups=0,addedAttendance=0,skippedAttendance=0;
    for(const id of ['walk','book','racket'])if(allowedIds.has(id)&&!state.joined.has(id)){state.joined.add(id);addedGroups++;}
    for(const id of ['forest-sunday','walk-coffee','book-evening','racket-first']){
      const meetup=state.meetups.find(m=>m.id===id);
      if(!meetup||state.attendance.has(id))continue;
      if(roomParticipants('meetup:'+id).length>=meetup.capacity){skippedAttendance++;continue;}
      state.attendance.add(id);addedAttendance++;
    }
    persist();return {addedGroups,addedAttendance,skippedAttendance};
  }
  function renderNav(){
    const nav=[['explore','compass','탐색'],['mygroups','users','내 모임'],['chats','chat','채팅'],['my','user','마이']];
    const active=state.page==='group'||['calendar','saved','operations','benefits'].includes(state.page)?'mygroups':state.page==='chat'?'chats':state.page;
    const navMarkup=selected=>nav.map(([id,symbol,label])=>`<button type="button" class="nav-item ${selected===id?'active':''}" data-page="${id}" ${selected===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span>${id==='chats'&&unreadCount('group:walk')>0?'<span class="nav-count">N</span>':''}</button>`).join('');
    const markup=navMarkup(active);
    const inGroup=state.page==='group'||state.page==='chat'&&state.groupId!=='couple',g=group();
    if(inGroup){
      const selected=state.page==='chat'?'채팅':state.groupTab;
      const context=[['홈','users'],['게시판','book'],['사진첩','image'],['정모','calendar'],['채팅','chat']];
      $('#side-nav').innerHTML=`<button type="button" class="nav-item group-side-back" data-page="${state.joined.has(g.id)?'mygroups':'explore'}">${icon('back')}<span>모임 목록으로</span></button><div class="group-side-caption"><span>현재 모임</span><strong>${esc(g.name)}</strong></div>${context.map(([tab,symbol])=>`<button type="button" class="nav-item ${selected===tab?'active':''}" data-context-tab="${tab}" ${selected===tab?'aria-current="page"':''}>${icon(symbol)}<span>${tab}</span></button>`).join('')}`;
    }else $('#side-nav').innerHTML=navMarkup(state.page)+[['calendar','calendar','통합 캘린더'],['saved','book','보관함 · 조건 알림'],['benefits','sparkles','편의 · 꾸미기']].map(([id,symbol,label])=>`<button type="button" class="nav-item ${state.page===id?'active':''}" data-page="${id}" ${state.page===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span></button>`).join('');
    $('#side-nav').setAttribute('aria-label',inGroup?'모임 안 메뉴':'주요 메뉴');
    $('#mobile-nav').innerHTML=markup;
    $('#breadcrumb').textContent=({explore:'모임 탐색',mygroups:'내 모임',calendar:'통합 캘린더',saved:'보관함 · 조건 알림',operations:'모임 운영',benefits:'편의 · 꾸미기',chats:'채팅',my:'마이',notifications:'알림함',group:'내 모임 / '+group().name,chat:'채팅 / '+group().name})[state.page]||'모여봄';
    const myAvatar=$('.header-actions>[data-action="my"]');if(myAvatar&&safeMedia(member('me').photo))myAvatar.innerHTML=`<img src="${esc(member('me').photo)}" alt="내 프로필 사진">`;
  }
  function changePage(page,options={}){
    if(page==='group'&&(options.groupId||state.groupId)==='couple'){page='chat';options={...options,groupId:'couple',roomId:'group:couple'};}
    disposeReplySwipe();
    closeModal();
    state.stickerOpen=false;state.selectedSticker=null;document.body.classList.remove('sticker-selection-active');
    state.summaryJob++;state.summaryOpen=false;
    if(state.photo){URL.revokeObjectURL(state.photo);state.photo=null;state.photoName='';}
    if(page!=='chat'){state.summaryJob++;state.summaryOpen=false;state.focusId=null;}
    state.page=page;if(options.groupId)state.groupId=options.groupId;
    if(page==='group')state.groupTab=options.tab||'홈';
    if(page==='chat'){
      state.roomId=options.roomId||'group:'+state.groupId;
      if(!canOpenRoom(state.roomId)){toast(state.roomId.startsWith('meetup:')?'이 정모의 참석자만 입장할 수 있어요. 모임장도 참석 신청이 필요합니다.':'모임에 가입하면 채팅에 참여할 수 있어요.');state.page=state.roomId==='group:couple'?'chats':'group';state.groupTab='정모';}
      else{if(state.roomId!=='group:couple'&&state.summaryRange==='all')state.summaryRange='unread';state.unreadSnapshot=state.readThrough;state.summaryStatus='idle';state.summaryResult=[];state.newMessageCount=0;state.focusId=null;if(!roomParticipants().some(m=>m.id===state.summaryPerson))state.summaryPerson=roomParticipants()[0]?.id||'minji';}
      state.mentionIds=[];state.replyTo=null;state.mentionQuery=null;state.emojiOpen=false;state.stickerOpen=false;state.selectedSticker=null;state.postSelection=[];state.readFreeze=false;
    }
    render();window.scrollTo(0,0);
  }
  function coverMarkup(g,detail=false){return `<div class="${detail?'detail-cover':'group-cover'} ${safeMedia(g.coverImage)?'has-image':''}" style="--cover-bg:${g.bg};--cover-fg:${g.fg};--cover-circle:${g.circle}">${safeMedia(g.coverImage)?`<img class="group-cover-image" src="${esc(g.coverImage)}" alt="${esc(g.name)} 모임 커버">`:`<span class="cover-word">${esc(g.word).replace(/\n/g,'<br>')}</span><span class="cover-art" aria-hidden="true">${g.emoji}</span><span class="cover-line" aria-hidden="true"></span>`}</div>`;}
  function groupCard(g){return `<article class="group-card"><button type="button" class="group-open" data-open-group="${g.id}" aria-label="${esc(g.name)} 모임 보기">${coverMarkup(g)}<div class="group-info"><div class="group-category">${esc(g.category)}</div><h3>${esc(g.name)}</h3><div class="group-meta"><span>${icon('pin')}${esc(g.area)}</span><span>${icon('users')}${g.members+(state.joined.has(g.id)&&g.id!=='walk'&&!g.includesMe?1:0)}명</span></div><div class="tag-row">${g.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div></button><button type="button" class="like-button ${state.likes.has(g.id)?'liked':''}" data-like="${g.id}" aria-label="${esc(g.name)} 관심 모임" aria-pressed="${state.likes.has(g.id)}">${icon('heart')}</button></article>`;}
  function renderExplore(){
    const categories=['전체','아웃도어 / 여행','운동 / 스포츠','인문학 / 책 / 글','사진 / 영상','사교 / 인맥','공예 / 만들기'];
    return `<div class="page-heading"><div><div class="eyebrow">FIND YOUR PEOPLE</div><h1>내 주변 모임</h1><p>좋아하는 일로 만나는, 가까운 사람들.</p></div><span class="button small ghost">${icon('pin')}우리 동네</span></div><div class="filters"><label class="search-field">${icon('search')}<span class="sr-only">모임 검색</span><input id="group-search" type="search" placeholder="어떤 취미를 찾으세요?" value="${esc(state.query)}" autocomplete="off"></label><label><span class="sr-only">활동 지역</span><select class="select" id="area-filter" style="width:100%"><option value="all">모든 지역</option>${['서울 성동구','서울 마포구','경기 성남시'].map(a=>`<option ${state.area===a?'selected':''}>${a}</option>`).join('')}</select></label></div><div class="category-list" aria-label="관심사 필터">${categories.map(c=>`<button type="button" class="chip ${state.category===c?'active':''}" data-category="${c}" aria-pressed="${state.category===c}">${c==='전체'?'전체':c.split(' / ')[0]}</button>`).join('')}</div><div class="result-title"><strong>함께하기 좋은 모임 <span id="result-count"></span></strong><span>지역과 관심사로 찾아보세요</span></div><div class="group-grid" id="explore-results">${filteredGroups().map(groupCard).join('')}</div>`;
  }
  function filteredGroups(){const query=state.query.trim().toLowerCase();return groups.filter(g=>(state.area==='all'||g.area===state.area)&&(state.category==='전체'||g.category===state.category)&&(!query||[g.name,g.area,g.category,...g.tags].join(' ').toLowerCase().includes(query)));}
  function updateExploreResults(){const found=filteredGroups();$('#explore-results').innerHTML=found.length?found.map(groupCard).join(''):'<div class="empty-state">'+icon('search')+'<p>조건에 맞는 모임이 없어요.</p><button class="button" type="button" data-action="reset-filters">필터 초기화</button></div>';$('#result-count').textContent=found.length;}
  function renderMyGroups(){const joined=groups.filter(g=>state.joined.has(g.id));return `<div class="page-heading"><div><div class="eyebrow">MY GATHERINGS</div><h1>내 모임</h1><p>취미가 일상이 되는, 우리의 약속.</p></div><button class="button" type="button" data-page="explore">${icon('plus')}새 모임 찾기</button></div><div class="result-title"><strong>함께하는 모임 ${joined.length}</strong><span>참여 중</span></div><div class="group-grid">${joined.length?joined.map(groupCard).join(''):'<div class="empty-state"><p>아직 참여 중인 모임이 없어요.</p><button type="button" class="button primary" data-page="explore">모임 둘러보기</button></div>'}</div>${state.likes.size?'<div class="section-heading"><h2>관심 모임</h2><span class="inline-count">'+state.likes.size+'</span></div><div class="group-grid">'+groups.filter(g=>state.likes.has(g.id)).map(groupCard).join('')+'</div>':''}`;}
  function groupContextNav(active){return `<nav class="group-context-nav" aria-label="모임 안 메뉴">${['홈','게시판','사진첩','정모','채팅'].map(tab=>`<button type="button" class="group-context-tab ${tab===active?'active':''}" data-context-tab="${tab}" ${tab===active?'aria-current="page"':''}>${tab}</button>`).join('')}</nav>`;}
  function groupContextHeader(){const g=group();return `<header class="group-context-header"><button type="button" class="icon-button" data-page="${state.joined.has(g.id)?'mygroups':'explore'}" aria-label="${state.joined.has(g.id)?'내 모임 목록':'모임 탐색'}">${icon('back')}</button><div class="group-context-heading"><strong>${esc(g.name)}</strong><span>모임</span></div><button type="button" class="icon-button" data-action="members" aria-label="모임 멤버 보기">${icon('users')}</button></header>`;}
  function meetupCard(m){const p=places.find(p=>p.id===m.placeId),attendees=roomParticipants('meetup:'+m.id),joined=state.attendance.has(m.id);return `<article class="meetup-card-shell"><button class="meetup-card" type="button" data-meetup="${esc(m.id)}"><div class="meetup-date">${dateLabel(meetupAt(m))} · ${time(meetupAt(m))}</div><h3>${esc(m.title)}</h3><p>${icon('pin').replace('class="icon"','class="icon" style="width:12px;height:12px;vertical-align:-2px"')} ${esc(p.name)}</p><p>참석 ${attendees.length} / ${m.capacity}명 ${joined?'<span class="pill">참석 중</span>':''}</p><span class="button small">정모 자세히 보기 ${icon('arrow')}</span></button><div class="meetup-room-entry"><span>${joined?'참석자끼리 이야기해요':'참석 신청 후 입장'}</span><button type="button" class="button small ${joined?'soft':''}" data-room="meetup:${esc(m.id)}">${joined?'대화방':'🔒 대화방'}</button></div></article>`;}
  function renderGroup(){
    const g=group(),joined=state.joined.has(g.id),meetups=state.meetups.filter(m=>m.groupId===g.id);
    let body='';
    if(state.groupTab==='홈')body=`<div class="intro-layout"><div class="intro-copy"><h2>우리 모임을 소개해요</h2><p>${esc(g.desc)}</p><div class="info-line">${icon('calendar')}${esc(g.activity)}</div><div class="info-line">${icon('users')}${esc(g.age)}</div><div class="tag-row">${g.tags.map(t=>`<span class="tag"># ${esc(t)}</span>`).join('')}</div></div><div><div class="section-heading" style="margin-top:0"><h3>다음 만남</h3><span class="pill">정모</span></div>${meetups[0]?meetupCard(meetups[0]):'<div class="note-box">다음 정모를 준비하고 있어요.</div>'}</div></div>`;
    if(state.groupTab==='게시판')body=`<div class="section-heading" style="margin-top:0"><h2>우리의 이야기</h2><span class="inline-count">3개</span></div>${[['모임 참여 안내','민지 · 10월 21일','공지',0],['이번 주말, 함께 가고 싶은 곳','지수 · 10월 24일','자유',4],['지난 모임의 작은 기록','준호 · 10월 24일','후기',6]].map(([title,meta,type,n],i)=>`<button type="button" class="board-row" data-post="${i}"><span class="board-badge">${type}</span><span class="board-text"><strong>${title}</strong><span>${meta}</span></span><span class="board-comment">댓글 ${n}</span>${icon('arrow')}</button>`).join('')}`;
    if(state.groupTab==='사진첩')body=`<div class="section-heading" style="margin-top:0"><h2>함께 남긴 장면</h2><span class="inline-count">샘플 이미지 6장</span></div><div class="photo-grid">${['🌳','☕','🍂','🌿','📖','🌤️'].map((emoji,i)=>`<button type="button" class="sample-photo" style="--photo-bg:${['#e1e8dd','#eae0d4','#efe3d1','#e1e9e2','#e4e2e9','#e4edf0'][i]};--photo-shape:${['#b6c6ad','#d3bda2','#dabb8c','#b9cfbf','#c5bed7','#bad1d8'][i]}" data-photo-sample="${i}" aria-label="샘플 이미지 ${i+1} 크게 보기"><span aria-hidden="true">${emoji}</span><small>샘플 이미지</small></button>`).join('')}</div>`;
    if(state.groupTab==='정모')body=`<div class="section-heading" style="margin-top:0"><h2>다음 만남 ${meetups.length}</h2><button type="button" class="button small primary" data-action="new-meetup">${icon('plus')}정모 만들기</button></div><div class="meetup-grid">${meetups.length?meetups.map(meetupCard).join(''):'<div class="empty-state"><p>첫 번째 정모를 만들어 보세요.</p></div>'}</div>`;
    return `${groupContextHeader()}${groupContextNav(state.groupTab)}<button type="button" class="back-link group-desktop-back" data-page="${state.joined.has(g.id)?'mygroups':'explore'}">${icon('back')}모임 목록</button><article class="group-detail ${state.groupTab==='홈'?'is-home-tab':'is-inner-tab'}" data-group-tab-active="${esc(state.groupTab)}">${coverMarkup(g,true)}<div class="detail-heading"><div><div class="group-category">${g.category}</div><h1>${esc(g.name)}</h1><div class="group-meta"><span>${icon('pin')}${g.area}</span><button type="button" data-action="members" class="button small ghost" style="padding:0;min-height:0">${icon('users')}멤버 ${g.members+(joined&&g.id!=='walk'&&!g.includesMe?1:0)}명 ${icon('arrow')}</button></div></div><div class="detail-actions"><button type="button" class="icon-button like-button ${state.likes.has(g.id)?'liked':''}" data-like="${g.id}" aria-label="관심 모임" aria-pressed="${state.likes.has(g.id)}">${icon('heart')}</button><button type="button" class="button ${joined?'soft':'primary'}" data-action="join">${icon(joined?'check':'plus')}${joined?'가입 중':'모임 가입'}</button><button type="button" class="button ${joined?'primary':''}" data-action="open-chat">${icon('chat')}채팅방</button></div></div><nav class="detail-tabs" aria-label="모임 메뉴">${['홈','게시판','사진첩','정모'].map(t=>`<button type="button" class="detail-tab ${state.groupTab===t?'active':''}" data-group-tab="${t}" aria-pressed="${state.groupTab===t}">${t}</button>`).join('')}</nav><div class="detail-body">${body}</div></article>`;
  }
  function renderChatList(){
    const joined=groups.filter(g=>state.joined.has(g.id));
    return `<div class="page-heading"><div><div class="eyebrow">CONVERSATIONS</div><h1>채팅</h1><p>모임 공용방과 정모 참석자 대화를 나눠서 확인해요.</p></div><button type="button" class="button" data-action="inbox">${icon('bell')}알림함</button></div>${joined.length?joined.map(g=>`<h2 class="chat-list-section-heading">${esc(g.name)}</h2><div class="list-surface">${['group:'+g.id,...state.meetups.filter(m=>m.groupId===g.id).map(m=>'meetup:'+m.id)].map(roomId=>{const event=state.meetups.find(m=>'meetup:'+m.id===roomId),allowed=canOpenRoom(roomId),messages=roomMessagesById(roomId),latest=messages.at(-1),count=allowed?unreadCount(roomId):0;return `<button type="button" class="chat-list-row ${allowed?'':'locked'}" data-room="${esc(roomId)}"><span class="chat-room-avatar" style="background:${g.bg}">${event?'🌿':g.emoji}</span><span class="chat-list-text"><strong>${event?'<span class="subroom-label">정모</span>':''}${esc(event?.title||'모임 공용방')}</strong><p>${!allowed?'참석 신청 후 입장할 수 있는 전용방이에요.':esc(latest?.text||'첫 대화를 시작해 보세요.')}</p></span><span class="chat-list-meta">${!allowed?'🔒':latest?time(latest.at):''}${count?`<span class="unread-dot">${count}</span>`:''}</span></button>`;}).join('')}</div>`).join(''):'<div class="empty-state"><p>모임에 가입하면 채팅방이 생겨요.</p><button type="button" class="button primary" data-page="explore">모임 찾기</button></div>'}`;
  }
  function renderMy(){return `<div class="page-heading"><div><div class="eyebrow">MY SPACE</div><h1>마이</h1><p>나의 취미 생활을 모아 봐요.</p></div></div><div class="profile-panel"><span class="avatar my-avatar">나</span><div><h2>산책하는 나</h2><p>서울 성동구 · 아웃도어 / 독서에 관심 있어요</p></div></div><div class="profile-stats"><div class="profile-stat"><span>참여 모임</span><strong>${state.joined.size}</strong></div><div class="profile-stat"><span>관심 모임</span><strong>${state.likes.size}</strong></div><div class="profile-stat"><span>참석 정모</span><strong>${state.attendance.size}</strong></div></div><div class="profile-settings"><h3>이 프로토타입의 저장 범위</h3><p>가입, 관심 모임, 정모 등록과 참석, 텍스트 메시지는 이 브라우저에 저장돼요.</p><p>첨부 이미지는 메모리에서만 미리 보며 새로고침하면 사라져요. AI와 지도는 실제 API를 호출하지 않아요.</p><button type="button" class="button small danger" data-action="reset-demo" style="margin-top:12px">데모 데이터 초기화</button></div>`;}
  function chatMessages(){if(!canOpenRoom())return [];return roomMessagesById(getRoomId());}
  function renderChat(){
    const g=group(),meetup=roomMeetup(),count=unreadCount(getRoomId(),state.unreadSnapshot),total=chatMessages().length;
    return `<div class="chat-layout"><section class="chat-room" aria-label="${esc(meetup?.title||g.name)} 채팅방"><header class="chat-header"><button type="button" class="icon-button" data-action="group-home" aria-label="모임 홈으로">${icon('back')}</button>${avatarMarkup(member(getSelfId()),'room-self-avatar')}<div class="chat-heading"><h2><button type="button" class="chat-title-button" data-action="chat-more" aria-haspopup="dialog">${esc(meetup?.title||g.name)}<span class="chat-title-chevron" aria-hidden="true">⌄</span></button></h2><p>${meetup?'정모 참석자 전용':'모임 공용방'} · ${roomParticipants().length}명 · ${total}개 대화</p></div><div class="chat-tools"><button type="button" class="icon-button" data-action="room-notifications" aria-label="이 채팅방 알림 설정">${icon('bell')}</button><button type="button" class="button soft" data-action="toggle-summary" aria-expanded="${state.summaryOpen}">${icon('sparkles')}AI 요약</button><button type="button" class="icon-button chat-more-button" data-action="chat-more" aria-label="채팅방 더보기" aria-haspopup="dialog">⋯</button></div></header>${getRoomId()==='group:couple'?'':groupContextNav('채팅')}<div class="room-switch-row"><label><span class="sr-only">채팅방 선택</span><select id="room-select" aria-label="채팅방 선택"><option value="group:${g.id}" ${!meetup?'selected':''}>모임 공용방</option>${state.meetups.filter(m=>m.groupId===g.id).map(m=>`<option value="meetup:${esc(m.id)}" ${meetup?.id===m.id?'selected':''}>${state.attendance.has(m.id)?'🔓':'🔒'} ${esc(m.title)}</option>`).join('')}</select></label><button type="button" class="room-notification-button" data-action="room-notifications">${icon('bell')}<span>알림 설정</span></button></div>${meetup?`<button type="button" class="pinned-meetup" data-meetup="${esc(meetup.id)}">${icon('pin')}<span>${esc(meetup.title)} · ${dateLabel(meetupAt(meetup))} ${time(meetupAt(meetup))}</span>${icon('arrow')}</button>`:''}<button type="button" class="unread-summary-banner ${count?'has-unread':'is-empty'}" data-unread-count="${count}" data-action="unread-summary">${icon('sparkles')}<span>${count?`읽지 않은 구간 ${count}개`:'새로 쌓인 대화 없음'}<small>이 방의 실제 원문 ${total}개 · 나에게만 요약</small></span><strong>요약 보기 ${icon('arrow')}</strong></button><div class="chat-demo-controls"><span>수신 시연</span><button type="button" data-action="incoming">일반 대화</button><button type="button" data-action="mention-me">나를 @멘션</button>${getRoomId()==='group:walk'?'<button type="button" data-action="bulk-unread">쌓인 대화 300개</button>':''}</div><div class="chat-stream-wrap"><div class="message-stream" id="message-stream" role="log" aria-label="대화 메시지" aria-live="polite"></div><button type="button" class="jump-latest" id="jump-latest" data-action="latest" hidden>${icon('down')}최신 대화로</button></div><form class="composer" id="message-form"><div id="mention-popup" class="mention-popup" hidden></div><div id="emoji-popup" class="emoji-popup" hidden></div><div id="sticker-selection-preview" class="em-selection-preview" aria-live="polite" hidden></div><div id="reply-preview" aria-live="polite" hidden></div><div id="attachment-preview" hidden></div><div id="mention-chips" class="mention-chips" hidden></div><div class="composer-row"><textarea id="message-input" rows="1" placeholder="메시지 입력 · @로 멤버 태그" aria-label="메시지 입력" aria-autocomplete="list" aria-controls="mention-list" maxlength="2000"></textarea><button type="button" class="icon-button" data-action="attach" aria-label="이미지 첨부">${icon('image')}</button><button type="button" class="icon-button emoji-button" data-action="emoji" aria-label="이모티콘 패널 열기" aria-expanded="false">☺</button><button type="button" class="icon-button at-button" data-action="mention-open" aria-label="멤버 태그">@</button><input id="image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><button type="submit" class="send-button" id="send-message" aria-label="메시지 전송" disabled>${icon('send')}<span class="send-label">전송</span></button></div><p class="composer-note">말풍선을 오른쪽으로 밀어 답장 · @로 멤버 태그</p><div id="sticker-drawer" class="em-drawer" hidden></div></form></section>${state.summaryOpen?summaryMarkup():''}</div>`;
  }
  function showChatMore(){
    if(state.page!=='chat'||!canOpenRoom())return;
    const currentRoom=getRoomId(),g=group(),meetup=roomMeetup();
    const options=[{id:'group:'+g.id,title:'모임 공용방'},...state.meetups.filter(m=>m.groupId===g.id).map(m=>({id:'meetup:'+m.id,title:'정모 · '+(state.attendance.has(m.id)?'':'🔒 ')+m.title}))];
    state.modal={type:'chat-more',roomId:currentRoom};
    openModal('채팅방 더보기',`<div class="chat-more-content"><div class="chat-more-section"><label class="summary-label" for="chat-more-room-select">대화방 선택 · 모임 공용방 / 정모 참석자방</label><select id="chat-more-room-select" class="form-input" aria-label="이동할 채팅방">${options.map(option=>`<option value="${esc(option.id)}" ${option.id===currentRoom?'selected':''}>${esc(option.title)}</option>`).join('')}</select><p class="form-hint">정모 대화방은 해당 정모 참석자만 입장할 수 있어요.</p></div><div class="chat-more-section chat-more-actions"><button type="button" class="button" data-action="room-notifications" data-chat-command="true">${icon('bell')}이 방 알림 설정</button><button type="button" class="button" data-action="inbox" data-chat-command="true">${icon('bell')}알림함</button><button type="button" class="button" data-action="members" data-chat-command="true">${icon('users')}모임 멤버</button>${meetup?`<button type="button" class="button" data-meetup="${esc(meetup.id)}" data-chat-command="true">${icon('calendar')}현재 정모 상세</button>`:''}</div><div class="chat-more-section"><h3>데모 수신 시연</h3><p class="form-hint">샘플 대화로 기능을 확인해요. 실제 푸시는 연결되지 않았어요.</p><div class="chat-more-actions"><button type="button" class="button" data-action="incoming" data-chat-command="true">일반 대화 도착</button><button type="button" class="button" data-action="mention-me" data-chat-command="true">나를 @멘션</button>${currentRoom==='group:walk'?'<button type="button" class="button soft" data-action="bulk-unread" data-chat-command="true">쌓인 대화 300개 시연</button>':''}</div></div></div>`,`<button type="button" class="button" data-action="close-modal">닫기</button>`);
  }
  function showMessageMore(messageId){
    const message=chatMessages().find(m=>m.id===messageId);if(state.page!=='chat'||!canOpenRoom()||!message)return;
    const author=member(message.senderId),sticker=stickerById(message.stickerId);
    state.modal={type:'message-more',roomId:getRoomId(),messageId};
    openModal('메시지 더보기',`<div class="message-more-preview"><div class="member-row">${avatarMarkup(author)}<div><strong>${esc(author.name)}</strong><span>${time(message.at)}</span></div></div><p class="form-hint">${esc(message.text||(sticker?'[이모티콘] '+sticker.label:'사진'))}</p></div><div class="message-more-actions"><button type="button" class="button" data-reply-message="${esc(messageId)}" data-chat-command="true">답장</button><button type="button" class="button" data-reaction-picker="${esc(messageId)}" data-chat-command="true">☺ 이모지 반응</button><button type="button" class="button" data-post-message="${esc(messageId)}" data-chat-command="true">게시글로 연결</button></div>`,`<button type="button" class="button" data-action="close-modal">닫기</button>`);
  }
  function replyMarkup(original,compose=false){if(!original)return '';const p=member(original.senderId),sticker=stickerById(original.stickerId);return `<button type="button" class="reply-card ${compose?'compose-reply':''}" data-jump-reply="${esc(original.id)}">${avatarMarkup(p)}<span><strong>${esc(p.name)}에게 답장</strong><small>${esc(original.text||(sticker?'[이모티콘] '+sticker.label:'사진'))}</small></span>${sticker?`<img class="reply-thumbnail" src="${esc(sticker.src)}" alt="답장 원문 이모티콘 ${esc(sticker.label)}">`:safeMedia(original.photo)?`<img class="reply-thumbnail" src="${esc(original.photo)}" alt="답장 원문 사진">`:''}</button>`;}
  function messageMarkup(m){
    const person=member(m.senderId),self=isSelfMessage(m),sticker=stickerById(m.stickerId),meetup=state.meetups.find(x=>x.id===m.meetupId),original=state.messages.find(x=>x.id===m.replyTo&&x.roomId===m.roomId);
    const reaction=state.reactions[m.id]||{};
    return `<article class="message ${self?'self':''} ${state.focusId===m.id?'highlighted':''}" id="msg-${esc(m.id)}" data-message="${esc(m.id)}" aria-label="${esc(person.name)} ${time(m.at)}${state.focusId===m.id?' 요약 원문':''}">${!self?`<button type="button" class="avatar-profile-button" data-profile-member="${person.id}" aria-label="${esc(person.name)} 프로필">${avatarMarkup(person)}</button>`:''}<div class="message-main"><div class="message-name">${esc(person.name)}${person.role==='모임장'?' · 모임장':''}</div><div class="message-row"><div class="message-bubble">${replyMarkup(original)}${m.photo?`<button type="button" class="chat-photo-button" data-image-message="${esc(m.id)}" aria-label="첨부 이미지 크게 보기"><img class="message-photo" src="${esc(m.photo)}" alt="채팅 첨부 이미지"></button>`:''}<div class="message-mentions">${(m.mentions||[]).map(id=>`<button type="button" class="sent-mention ${id===getSelfId(m.roomId)?'mentions-me':''}" data-profile-member="${esc(id)}">@${esc(member(id).name)}</button>`).join('')}</div>${sticker?`<button type="button" class="em-sticker-message" data-sticker-message="${esc(m.id)}" aria-label="이모티콘 ${esc(sticker.label)} 크게 보기"><img src="${esc(sticker.src)}" alt="${esc(sticker.label)} · ${esc(stickerPackName(sticker))}"></button>`:''}${(!sticker||m.stickerCaption)?esc(m.text).replace(/\n/g,'<br>'):''}${meetup?`<button type="button" class="chat-location-card" data-meetup="${esc(meetup.id)}"><strong>${esc(meetup.title)}</strong><span>${icon('pin')}${esc(places.find(p=>p.id===meetup.placeId).name)} · 정모 보기 ${icon('arrow')}</span></button>`:''}</div><time class="message-time">${time(m.at)}</time></div><div class="message-reactions">${Object.entries(reaction).filter(([,ids])=>Array.isArray(ids)&&ids.length).map(([emoji,ids])=>`<button type="button" class="reaction-chip ${ids.includes(getSelfId(m.roomId))?'reacted':''}" data-react-message="${esc(m.id)}" data-emoji="${esc(emoji)}" aria-pressed="${ids.includes(getSelfId(m.roomId))}">${esc(emoji)} <span class="reaction-avatars">${ids.slice(0,2).map(id=>avatarMarkup(member(id))).join('')}</span>${ids.length}</button>`).join('')}</div><div class="message-tools"><button type="button" data-reply-message="${esc(m.id)}">답장</button><button type="button" data-reaction-picker="${esc(m.id)}" aria-label="메시지에 이모지 반응">☺ 반응</button><button type="button" data-post-message="${esc(m.id)}">글로 연결</button></div><button type="button" class="message-more-button" data-message-more="${esc(m.id)}" aria-label="이 메시지 더보기" aria-haspopup="dialog">⋯</button></div></article>`;
  }
  function isNearBottom(){const stream=$('#message-stream');return !stream||stream.scrollHeight-stream.scrollTop-stream.clientHeight<80;}
  function renderMessages(behavior='preserve'){
    cancelReplySwipe();
    const stream=$('#message-stream');if(!stream)return;
    const previousTop=stream.scrollTop,near=isNearBottom();let lastDate='';let unreadAdded=false;
    const messages=chatMessages();
    if(!messages.length){stream.innerHTML='<div class="chat-start">'+icon('chat')+'<h3>우리의 첫 대화를 시작해요</h3><p>모임장으로 참여했어요.<br>첫 인사와 다음 만남의 이야기를 남겨 보세요.</p></div>';updateJump();return;}
    stream.innerHTML=messages.map(m=>{
      let prefix='';const key=dateKey(m.at);
      if(key!==lastDate){prefix+=`<div class="chat-date"><span>${dateLabel(m.at)}</span></div>`;lastDate=key;}
      if(!unreadAdded&&m.at>state.unreadSnapshot&&!isSelfMessage(m)){prefix+='<div class="unread-divider">여기부터 안 읽은 대화</div>';unreadAdded=true;}
      return prefix+messageMarkup(m);
    }).join('');
    if(behavior==='latest'||(behavior==='preserve'&&near))stream.scrollTop=stream.scrollHeight;
    else if(behavior==='source'&&state.focusId){const target=document.getElementById('msg-'+state.focusId);if(target)stream.scrollTop=Math.max(0,target.offsetTop-stream.offsetTop-stream.clientHeight/2+target.offsetHeight/2);}
    else stream.scrollTop=previousTop;
    updateJump();
  }
  function updateJump(){const button=$('#jump-latest');if(!button)return;button.hidden=isNearBottom()&&!state.focusId;button.innerHTML=icon('down')+(state.newMessageCount?`새 대화 ${state.newMessageCount}개 · 최신으로`:'최신 대화로');}
  function summaryMarkup(){
    return `<div class="summary-scrim" data-action="close-summary"></div><aside class="summary-panel" aria-label="개인용 AI 대화 요약"><header class="summary-header"><h2>${icon('sparkles')}대화 요약</h2><button type="button" class="icon-button" data-action="close-summary" aria-label="요약 닫기">${icon('close')}</button></header><div class="summary-private">${icon('lock')}나에게만 보여요 · 채팅방에 게시되지 않아요</div><div class="summary-content"><span class="summary-label">요약 대상</span><div class="target-tabs"><button type="button" class="${state.summaryTarget==='all'?'active':''}" data-summary-target="all" aria-pressed="${state.summaryTarget==='all'}">전체 참여자</button><button type="button" class="${state.summaryTarget==='person'?'active':''}" data-summary-target="person" aria-pressed="${state.summaryTarget==='person'}">특정인</button></div><div class="summary-filterrow ${state.summaryTarget==='person'?'person':''}">${state.summaryTarget==='person'?`<label><span class="summary-label">발언한 멤버</span><select class="select" id="summary-person">${roomParticipants().map(m=>`<option value="${m.id}" ${state.summaryPerson===m.id?'selected':''}>${esc(m.name)}${m.role==='모임장'?' · 모임장':''}</option>`).join('')}</select></label>`:''}<label><span class="summary-label">대화 기간</span><select class="select" id="summary-range"><option value="unread" ${state.summaryRange==='unread'?'selected':''}>안 읽은 대화</option><option value="today" ${state.summaryRange==='today'?'selected':''}>오늘</option><option value="week" ${state.summaryRange==='week'?'selected':''}>최근 7일</option>${getRoomId()==='group:couple'?`<option value="all" ${state.summaryRange==='all'?'selected':''}>전체 6주 대화</option>`:''}</select></label></div><button type="button" class="button primary summary-generate" data-action="generate-summary" ${state.summaryStatus==='loading'?'disabled':''}>${icon('sparkles')}${state.summaryStatus==='loading'?'요약하는 중…':getRoomId()==='group:couple'?'대화 요약하기':'예시 요약 생성'}</button><div class="summary-demo">실제 AI를 호출하지 않는 데모예요. 샘플 원문에 연결된 예시와 발언 발췌로 구성됩니다.<br>샘플 기준: 2026.10.25 KST<br>새 대화는 요약 생성 시점까지 포함해요.</div><div id="summary-results" aria-live="polite">${summaryResultsMarkup()}</div></div><footer class="summary-footer">요약은 읽기 전용입니다. 항목의 원문을 확인할 수 있어요.<br>이미지 내용은 요약에 포함되지 않습니다.</footer></aside>`;
  }
  function summaryResultsMarkup(){
    if(state.summaryStatus==='loading')return '<div class="summary-loading"><div class="loading-ring" aria-hidden="true"></div>선택한 범위의 발언을 확인하고 있어요.</div>';
    if(state.summaryStatus==='dirty')return '<div class="summary-empty">설정이 바뀌었어요.<br>선택한 범위로 예시 요약을 생성해 주세요.</div>';
    if(state.summaryStatus==='idle')return '<div class="summary-empty">대상과 기간을 선택해<br>지나간 대화를 확인해 보세요.</div>';
    if(!state.summaryResult.length)return '<div class="summary-empty">'+icon('chat')+'<p>이 범위에는 요약할 발언이 없어요.</p><button type="button" class="button small" data-action="summary-week">최근 7일 대화 보기</button></div>';
    const label=state.summaryTarget==='person'?member(state.summaryPerson).name+'의 발언':'전체 참여자의 대화';
    const range=({unread:'마지막 읽음 이후 · '+dateLabel(state.unreadSnapshot)+' '+time(state.unreadSnapshot),today:'10월 25일 00:00–'+time(state.summaryCutoff),week:'10월 19일 00:00–10월 25일 '+time(state.summaryCutoff),all:'전체 6주 대화 · 9월 14일–10월 25일'})[state.summaryRange];
    return `<div class="summary-meta"><strong>${esc(label)} · ${state.summaryCount}개 메시지</strong>${range}<br>요약 기준 ${timeExact(state.summaryCutoff)} · 원문에 근거한 발췌</div>${state.summaryResult.map(item=>`<article class="summary-item"><span class="summary-tag">${esc(item.tag)}</span><p>${esc(item.text)}</p><div class="source-links">${item.sourceIds.map(id=>{const m=chatMessages().find(m=>m.id===id);return m?`<button type="button" class="source-button" data-source="${esc(id)}">${icon('link')}${esc(member(m.senderId).name)} ${time(m.at)} · 원문 보기</button>`:'';}).join('')}</div></article>`).join('')}`;
  }
  function refreshSummary(){if(!state.summaryOpen)return;const existing=$('.summary-panel');const scrim=$('.summary-scrim');if(existing)existing.remove();if(scrim)scrim.remove();$('.chat-layout').insertAdjacentHTML('beforeend',summaryMarkup());}
  function closeSummary(){state.summaryOpen=false;state.summaryJob++;if(state.summaryStatus==='loading')state.summaryStatus='idle';$('.summary-panel')?.remove();$('.summary-scrim')?.remove();$('[data-action="toggle-summary"]')?.setAttribute('aria-expanded','false');}
  function dirtySummary(){state.summaryJob++;state.summaryStatus='dirty';state.summaryResult=[];refreshSummary();}
  function generateSummary(){
    if(!canOpenRoom()){closeSummary();toast('현재 이 방의 대화를 요약할 권한이 없어요.');return;}
    const requestedRoom=getRoomId();
    const job=++state.summaryJob;state.summaryStatus='loading';state.summaryResult=[];refreshSummary();
    const min=state.summaryRange==='all'?0:state.summaryRange==='unread'?state.unreadSnapshot:state.summaryRange==='today'?todayStart:weekStart;
    state.summaryCutoff=Math.max(sampleNow,...chatMessages().map(m=>m.at));
    const cutoff=state.summaryCutoff;
    const filtered=chatMessages().filter(m=>m.at>=(state.summaryRange==='unread'?min+1:min)&&m.at<=cutoff&&m.text.trim()&&(state.summaryTarget!=='person'||m.senderId===state.summaryPerson));
    setTimeout(()=>{
      if(job!==state.summaryJob||!state.summaryOpen||state.page!=='chat'||getRoomId()!==requestedRoom||!canOpenRoom(requestedRoom))return;
      const ids=new Set(filtered.map(m=>m.id)),seedIds=new Set(sampleMessages.map(m=>m.id)),latestByTag=new Map();
      for(const item of summaries.filter(item=>item.sourceIds.every(id=>ids.has(id)))){const at=Math.max(...item.sourceIds.map(id=>filtered.find(m=>m.id===id).at));latestByTag.set(item.tag,{...item,at});}
      for(const m of filtered.filter(m=>m.summaryText)){const tag=m.topic||'최신 결정';const prior=latestByTag.get(tag);if(!prior||prior.at<m.at)latestByTag.set(tag,{tag,text:m.summaryText,sourceIds:[m.id],at:m.at});}
      const fresh=filtered.filter(m=>!seedIds.has(m.id)).slice(-2).reverse().map(m=>({tag:'새 발언 · '+member(m.senderId).name,text:m.text,sourceIds:[m.id]}));
      const storyAnchors=requestedRoom==='group:couple'&&state.summaryRange==='all'?(window.MoyobomCoupleStory?.summaryAnchors||[]).map(anchor=>{
        const sources=(anchor.sourceIds||[]).map(id=>filtered.find(message=>message.id===id)).filter(Boolean);
        return sources.length?{tag:anchor.tag,text:sources.map(message=>member(message.senderId).name+': '+message.text).join(' / '),sourceIds:sources.map(message=>message.id)}:null;
      }).filter(Boolean):[];
      const candidates=[...fresh,...storyAnchors,...[...latestByTag.values()].sort((a,b)=>b.at-a.at)];
      const topics=new Map();for(const m of filtered)topics.set(m.topic||'최근 대화',m);
      for(const [tag,m] of [...topics.entries()].reverse())candidates.push({tag:tag+' · 발췌',text:m.text,sourceIds:[m.id]});
      const covered=new Set(),result=[];for(const item of candidates){if(item.sourceIds.some(id=>covered.has(id)))continue;result.push(item);item.sourceIds.forEach(id=>covered.add(id));if(result.length===8)break;}
      state.summaryResult=result;state.summaryCount=filtered.length;state.summaryStatus='ready';refreshSummary();
    },550);
  }
  function updateComposer(){const input=$('#message-input');if(!input)return;$('#send-message').disabled=!input.value.trim()&&!state.photo&&!state.mentionIds.length&&!state.selectedSticker;renderMentionChips();renderStickerSelection();}
  function renderMentionChips(){const mount=$('#mention-chips');if(!mount)return;mount.hidden=!state.mentionIds.length;mount.innerHTML=state.mentionIds.map(id=>`<span class="mention-chip">${avatarMarkup(member(id))}@${esc(member(id).name)}<button type="button" data-remove-mention="${id}" aria-label="${esc(member(id).name)} 태그 삭제">${icon('close')}</button></span>`).join('');}
  function updateMentionQuery(){
    const input=$('#message-input');if(!input)return;const before=input.value.slice(0,input.selectionStart),found=before.match(/(?:^|\s)@([^\s@]*)$/);
    if(!found){state.mentionQuery=null;$('#mention-popup').hidden=true;input.removeAttribute('aria-activedescendant');return;}
    state.mentionQuery=found[1];state.mentionEnd=input.selectionStart;state.mentionStart=input.selectionStart-found[0].length+(/^\s/.test(found[0])?1:0);state.mentionIndex=0;renderMentionPopup();
  }
  function renderMentionPopup(){
    const popup=$('#mention-popup');if(!popup)return;
    const choices=roomParticipants().filter(p=>!state.mentionIds.includes(p.id)&&p.name.toLowerCase().includes((state.mentionQuery||'').toLowerCase()));state.mentionChoices=choices;
    state.mentionIndex=Math.max(0,Math.min(state.mentionIndex,choices.length-1));popup.hidden=state.mentionQuery===null;
    popup.innerHTML=`<div class="mention-popup-header">멤버 태그<span>↑↓ 선택 · Enter 추가 · Esc 닫기</span></div><div class="mention-list" id="mention-list" role="listbox" aria-label="태그할 멤버">${choices.length?choices.map((p,i)=>`<button type="button" role="option" id="mention-option-${p.id}" class="mention-option ${i===state.mentionIndex?'active':''}" data-choose-mention="${p.id}" aria-selected="${i===state.mentionIndex}">${avatarMarkup(p)}<span><strong>${esc(p.name)}</strong><small>${p.role}${roomMeetup()?' · 이 정모 참석자':''}</small></span>${i===state.mentionIndex?icon('check'):''}</button>`).join(''):'<div class="mention-no-result">일치하는 멤버가 없어요.<br>이 채팅방 참여자의 이름으로 찾아보세요.</div>'}</div>`;
    const active=choices[state.mentionIndex];if(active)$('#message-input').setAttribute('aria-activedescendant','mention-option-'+active.id);else $('#message-input').removeAttribute('aria-activedescendant');
  }
  function chooseMention(id){
    if(!roomParticipants().some(p=>p.id===id))return;
    const input=$('#message-input'),start=state.mentionStart,end=state.mentionEnd??input.selectionStart;
    if(start>=0)input.value=input.value.slice(0,start)+input.value.slice(end);
    if(!state.mentionIds.includes(id))state.mentionIds.push(id);
    state.mentionQuery=null;state.mentionStart=-1;$('#mention-popup').hidden=true;input.removeAttribute('aria-activedescendant');input.focus();input.setSelectionRange(Math.max(0,start),Math.max(0,start));updateComposer();
  }
  function renderReplyPreview(){const mount=$('#reply-preview');if(!mount)return;const original=chatMessages().find(m=>m.id===state.replyTo);mount.hidden=!original;mount.className=original?'reply-preview':'';mount.innerHTML=original?replyMarkup(original,true)+`<button type="button" class="icon-button" data-action="cancel-reply" aria-label="답장 취소">${icon('close')}</button>`:'';}
  function selectReply(messageId){
    if(state.page!=='chat'||!canOpenRoom()||!chatMessages().some(m=>m.id===messageId))return false;
    const stream=$('#message-stream'),previousTop=stream?.scrollTop,near=isNearBottom();
    state.replyTo=messageId;renderReplyPreview();
    $('#reply-preview')?.setAttribute('aria-live','polite');
    if(!state.stickerOpen)$('#message-input')?.focus({preventScroll:true});
    if(stream&&!near)stream.scrollTop=previousTop;
    updateJump();return true;
  }
  function bindReplySwipe(stream){
    if(!stream||stream.dataset.replySwipeBound==='true')return;
    disposeReplySwipe();stream.dataset.replySwipeBound='true';
    const controller=new AbortController(),signal=controller.signal,threshold=64,slop=12;
    const resets=new Map();let gesture=null,suppressClickUntil=0,suppressedBubble=null;
    function clearReset(bubble){
      if(resets.has(bubble)){clearTimeout(resets.get(bubble));resets.delete(bubble);}
      bubble.classList.remove('is-reply-swiping','is-reply-ready','is-reply-resetting');
      bubble.style.removeProperty('--reply-swipe-x');
    }
    function finish(commit=false){
      const current=gesture;if(!current)return;gesture=null;
      if(current.dragged){suppressClickUntil=performance.now()+500;suppressedBubble=current.bubble;}
      current.cue?.remove();clearReset(current.bubble);
      if(current.dragged&&current.bubble.isConnected){
        current.bubble.classList.add('is-reply-resetting');
        current.bubble.style.setProperty('--reply-swipe-x','0px');
        resets.set(current.bubble,setTimeout(()=>clearReset(current.bubble),180));
      }
      try{if(stream.hasPointerCapture(current.pointerId))stream.releasePointerCapture(current.pointerId);}catch{}
      if(commit&&current.roomId===getRoomId()&&current.bubble.isConnected)selectReply(current.messageId);
    }
    const cancel=()=>finish(false);cancelReplySwipe=cancel;
    const dispose=()=>{
      cancel();controller.abort();for(const bubble of [...resets.keys()])clearReset(bubble);
      delete stream.dataset.replySwipeBound;
      if(cancelReplySwipe===cancel)cancelReplySwipe=()=>{};
      if(disposeReplySwipe===dispose)disposeReplySwipe=()=>{};
    };
    disposeReplySwipe=dispose;
    stream.addEventListener('pointerdown',event=>{
      if(event.isPrimary===false){cancel();return;}
      if((event.pointerType==='mouse'&&event.button!==0)||state.page!=='chat'||!canOpenRoom())return;
      const bubble=event.target.closest?.('.message-bubble'),message=bubble?.closest('[data-message]');
      if(!bubble||!message||!stream.contains(bubble))return;
      cancel();clearReset(bubble);
      gesture={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,dx:0,dy:0,bubble,messageId:message.dataset.message,roomId:getRoomId(),dragged:false,cue:null};
    },{signal});
    stream.addEventListener('pointermove',event=>{
      const current=gesture;if(!current||event.pointerId!==current.pointerId)return;
      if(!current.bubble.isConnected||state.page!=='chat'||current.roomId!==getRoomId()||!canOpenRoom()){cancel();return;}
      const dx=event.clientX-current.startX,dy=event.clientY-current.startY,absX=Math.abs(dx),absY=Math.abs(dy);current.dx=dx;current.dy=dy;
      if(!current.dragged){
        if((absY>=slop&&absY>absX*1.1)||(dx<=-slop&&absX>absY*1.35)){cancel();return;}
        if(dx<slop||dx<absY*1.35)return;
        current.dragged=true;current.bubble.classList.add('is-reply-swiping');
        const row=current.bubble.closest('.message-row'),cue=document.createElement('span');
        cue.className='reply-swipe-cue';cue.setAttribute('aria-hidden','true');cue.innerHTML='<span>↩</span><small>답장</small>';
        cue.style.left=Math.max(0,current.bubble.getBoundingClientRect().left-row.getBoundingClientRect().left+8)+'px';row.append(cue);current.cue=cue;
        try{stream.setPointerCapture(event.pointerId);}catch{}
        window.getSelection()?.removeAllRanges();
      }
      if(absY>Math.max(48,absX*.85)){cancel();return;}
      if(event.cancelable)event.preventDefault();
      const travel=Math.max(0,Math.min(108,dx>96?96+(dx-96)*.12:dx));
      current.bubble.style.setProperty('--reply-swipe-x',travel+'px');
      const ready=dx>=threshold,progress=Math.min(1,travel/threshold);
      current.bubble.classList.toggle('is-reply-ready',ready);current.cue.classList.toggle('is-ready',ready);
      current.cue.style.opacity=String(progress);current.cue.style.setProperty('--reply-cue-scale',String(.65+progress*.35));
    },{passive:false,signal});
    stream.addEventListener('pointerup',event=>{
      if(!gesture||event.pointerId!==gesture.pointerId)return;
      const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;
      finish(gesture.dragged&&dx>=threshold&&Math.abs(dy)<=Math.max(48,dx*.85));
    },{signal});
    stream.addEventListener('pointercancel',cancel,{signal});
    stream.addEventListener('lostpointercapture',event=>{if(event.target===stream&&gesture&&event.pointerId===gesture.pointerId)cancel();},{signal});
    stream.addEventListener('scroll',cancel,{passive:true,signal});
    stream.addEventListener('dragstart',event=>{if(gesture&&event.target.closest?.('.message-bubble')===gesture.bubble)event.preventDefault();},{signal});
    stream.addEventListener('click',event=>{
      if(performance.now()<suppressClickUntil&&event.detail!==0&&(event.target===stream||suppressedBubble?.contains(event.target))){event.preventDefault();event.stopImmediatePropagation();}
    },{capture:true,signal});
    window.addEventListener('blur',cancel,{signal});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();},{signal});
  }
  const emojis=['😀','😊','😂','👍','❤️','🎉','🙌','👀','🥰','☕','🌳','👏','✨','💪','🍂','🙏','😮','✅'];
  function renderStickerSelection(){
    const selected=state.page==='chat'?stickerById(state.selectedSticker):null;
    document.body.classList.toggle('sticker-selection-active',!!selected);
    const mount=$('#sticker-selection-preview');if(!mount)return;
    const near=isNearBottom();
    if(!selected){mount.hidden=true;mount.innerHTML='';delete mount.dataset.stickerId;}
    else {mount.hidden=false;if(mount.dataset.stickerId===selected.id)return;mount.dataset.stickerId=selected.id;mount.innerHTML=`<div class="em-selection-bubble"><img src="${esc(selected.src)}" alt="전송 대기 중인 이모티콘 ${esc(selected.label)}"><small>전송 대기</small><button type="button" class="em-selection-cancel" data-action="sticker-preview-cancel" aria-label="선택한 이모티콘 취소">${icon('close')}</button></div>`;}
    const stream=$('#message-stream');if(near&&stream)stream.scrollTop=stream.scrollHeight;
  }
  function renderStickerDrawer(){
    renderStickerSelection();
    const mount=$('#sticker-drawer');if(!mount)return;
    mount.hidden=!state.stickerOpen;$('.composer')?.classList.toggle('em-drawer-open',state.stickerOpen);
    const trigger=$('.emoji-button');trigger?.classList.toggle('em-active',state.stickerOpen);trigger?.setAttribute('aria-expanded',String(state.stickerOpen));
    if(!state.stickerOpen){mount.innerHTML='';return;}
    const registry=window.MoyobomStickers,selected=stickerById(state.selectedSticker);
    const packs=registry?.packs||[{id:'bunny',name:registry?.packName||'포근 토끼의 하루',shortName:'토끼',coverId:'bunny-hi'}];
    if(state.stickerPack!=='recent'&&!packs.some(pack=>pack.id===state.stickerPack))state.stickerPack=packs[0]?.id||'bunny';
    const currentPack=packs.find(pack=>pack.id===state.stickerPack);
    const list=state.stickerPack==='recent'?state.stickerRecent.map(stickerById).filter(Boolean):(registry?.stickers||[]).filter(item=>item.pack===state.stickerPack);
    const packBar=packs.map(pack=>{
      const cover=stickerById(pack.coverId),active=state.stickerPack===pack.id;
      return `<button type="button" class="${active?'active':''}" data-sticker-pack="${esc(pack.id)}" aria-label="${esc(pack.name)} 팩" aria-pressed="${active}">${cover?`<img src="${esc(cover.src)}" alt="">`:''}${esc(pack.shortName||pack.name)}</button>`;
    }).join('');
    const stickerContent=`<div class="em-pack-bar" aria-label="이모티콘 팩 선택">${packBar}<button type="button" class="${state.stickerPack==='recent'?'active':''}" data-sticker-pack="recent" aria-pressed="${state.stickerPack==='recent'}">◷ 최근</button></div><div class="em-sticker-scroll"><p class="em-current-pack">${esc(currentPack?.name||'최근 사용')} <span>${list.length}종</span></p><div class="em-sticker-grid">${list.map(item=>`<button type="button" class="em-sticker-option ${selected?.id===item.id?'selected':''}" data-sticker-choice="${esc(item.id)}" aria-label="${esc(stickerPackName(item))} · ${esc(item.label)} 이모티콘 선택" aria-pressed="${selected?.id===item.id}"><img src="${esc(item.src)}" alt=""><small>${esc(item.name)}</small></button>`).join('')}</div>${!list.length?'<div class="em-drawer-empty">최근 보낸 이모티콘이 없어요.<br>마음에 드는 팩에서 하나 골라 보세요.</div>':''}</div>`;
    const miniContent=`<div class="em-sticker-scroll"><div class="em-mini-grid">${[...emojis,'🐰','🐱','🐻','🦆','🌼','🌱','🍀','☀️','🌙','⭐','🍰','🎈','💛','💚','💙','💜','🫶','🥺','😴','🤗'].map(emoji=>`<button type="button" data-mini-emoji="${emoji}" aria-label="${emoji} 입력">${emoji}</button>`).join('')}</div></div><p class="em-mini-note">선택한 이모지는 입력창에 들어가요. 전송 버튼으로 보내 주세요.</p>`;
    mount.innerHTML=`<div class="em-drawer-tabs" role="tablist" aria-label="이모티콘 종류"><button type="button" role="tab" aria-selected="${state.stickerTab==='stickers'}" data-sticker-tab="stickers">이모티콘</button><button type="button" role="tab" aria-selected="${state.stickerTab==='mini'}" data-sticker-tab="mini">미니 이모티콘</button><div class="em-drawer-tools"><button type="button" data-action="sticker-keyboard" aria-label="키보드로 입력">⌨</button><button type="button" data-action="sticker-close" aria-label="이모티콘 패널 닫기">${icon('close')}</button></div></div>${state.stickerTab==='stickers'?stickerContent:miniContent}`;
  }
  function closeStickerDrawer(focusInput=false){state.stickerOpen=false;renderStickerDrawer();updateComposer();if(focusInput)$('#message-input')?.focus();}
  function toggleStickerDrawer(){
    if(state.stickerOpen){closeStickerDrawer();return;}
    state.stickerOpen=true;state.emojiFor=null;state.mentionQuery=null;$('#message-input')?.blur();
    if($('#mention-popup'))$('#mention-popup').hidden=true;if($('#emoji-popup'))$('#emoji-popup').hidden=true;
    renderStickerDrawer();$('#sticker-drawer [role="tab"]')?.focus({preventScroll:true});
  }
  function showEmojiPicker(messageId=null){closeStickerDrawer();state.emojiFor=messageId;const popup=$('#emoji-popup');if(!popup)return;popup.hidden=false;popup.innerHTML=`<div class="emoji-popup-header">${messageId?'메시지에 반응 남기기':'이모지 넣기'}<button type="button" data-action="emoji-close">닫기</button></div><div class="emoji-grid">${emojis.map(emoji=>`<button type="button" data-select-emoji="${emoji}" aria-label="${emoji} 선택">${emoji}</button>`).join('')}</div>`;}
  function toggleReaction(messageId,emoji){if(!canOpenRoom()||!chatMessages().some(m=>m.id===messageId))return;const reaction=state.reactions[messageId]??={};const selected=Array.isArray(reaction[emoji])?reaction[emoji]:[];const selfId=getSelfId();reaction[emoji]=selected.includes(selfId)?selected.filter(id=>id!==selfId):[...selected,selfId];renderMessages('keep');persist();}
  function notificationPreferences(roomId=getRoomId()){const value=state.notificationPrefs[roomId]||state.notificationPrefs['*']||{};return {mode:['all','mentions','off'].includes(value.mode)?value.mode:'mentions',vibrate:value.vibrate!==false};}
  function updateNotificationBadge(){const badge=$('#notification-count');if(!badge)return;const count=state.notifications.filter(n=>!n.read).length;badge.hidden=!count;badge.textContent=count>99?'99+':count;}
  function notifyMessage(message){
    const preference=notificationPreferences(message.roomId),mentioned=(message.mentions||[]).includes(getSelfId(message.roomId));
    if(preference.mode==='off'||(preference.mode==='mentions'&&!mentioned))return false;
    const entry={id:'notification-'+message.id,roomId:message.roomId,messageId:message.id,groupId:message.groupId,senderId:message.senderId,text:message.text,kind:mentioned?'mention':'message',at:message.at,read:false};state.notifications.unshift(entry);state.notifications=state.notifications.slice(0,80);
    let vibration='진동 끔';if(preference.vibrate){vibration='진동 요청 시연';try{if(typeof navigator.vibrate==='function')navigator.vibrate([120,70,120]);}catch{}}
    state.vibrationPreview=vibration;updateNotificationBadge();persist();toast((mentioned?'나를 @태그한 대화':'새 대화')+' · 알림함에 추가했어요. '+vibration+' (브라우저·OS 허용 범위)');return true;
  }
  function receiveDemo(mentioned=false){if(!canOpenRoom())return;const sender=roomParticipants().find(p=>p.id!==getSelfId());if(!sender){toast('다른 멤버가 참여하면 수신을 시연할 수 있어요.');return;}const near=isNearBottom();const m={id:'incoming-'+Date.now(),senderId:sender.id,roomId:getRoomId(),groupId:state.groupId,at:nextMessageTime(),text:mentioned?'집결 위치 안내를 확인해 주실래요? 이 메시지에서 바로 답장해도 좋아요.':'일반 대화 수신 시연이에요. 과거 대화를 읽는 동안에는 화면 위치를 유지해요.',mentions:mentioned?[getSelfId()]:[]};state.messages.push(m);if(!near)state.newMessageCount++;renderMessages('preserve');if(!notifyMessage(m))toast((mentioned?'멘션 대화':'일반 대화')+'가 도착했어요. 현재 설정에서는 알림함·진동이 발생하지 않아요.');persist();}
  function showNotificationSettings(roomId=getRoomId()){
    const preference=notificationPreferences(roomId);state.notificationSettingRoom=roomId;
    openModal(roomId==='*'?'기본 대화 알림 설정':'이 채팅방 알림 설정',`<div class="form-field"><label for="notification-mode">알림을 받을 대화</label><select class="form-input" id="notification-mode"><option value="all" ${preference.mode==='all'?'selected':''}>모든 대화</option><option value="mentions" ${preference.mode==='mentions'?'selected':''}>나를 멘션한 대화만 · 기본값</option><option value="off" ${preference.mode==='off'?'selected':''}>알림 끄기</option></select></div><label class="check-label"><input id="notification-vibrate" type="checkbox" ${preference.vibrate?'checked':''}>허용되는 환경에서 멘션 알림 진동</label><div class="room-setting-info">실제 앱 푸시는 연결되지 않았어요. 현재 시안은 알림함과 진동 요청을 시연합니다. 기기의 알림 권한·무음 설정을 따르며 강제로 우회하지 않아요.</div>`,`<button type="button" class="button" data-action="close-modal">취소</button><button type="button" class="button primary" data-action="save-notifications">설정 저장</button>`);
  }
  function renderNotifications(){return `<div class="page-heading"><div><div class="eyebrow">NOTIFICATIONS</div><h1>알림함</h1><p>나를 부른 대화와 연결된 원문을 확인해요.</p></div><div class="notification-header-actions"><button type="button" class="button small" data-action="global-notifications">알림 설정</button><button type="button" class="button small" data-action="read-notifications">모두 읽음</button></div></div><div class="notification-settings-box"><h3>일반 단체 대화는 조용히, 나를 멘션하면 알려요.</h3><p>기본 설정은 ‘멘션만’입니다. 채팅방마다 전체 / 멘션만 / 끄기를 선택할 수 있어요.<br>실제 앱 푸시 미연동 · 진동은 사용자 선호와 브라우저·OS 허용 범위를 따릅니다.</p></div><div class="notification-list">${state.notifications.length?state.notifications.map(n=>{if(!canOpenRoom(n.roomId))return `<button type="button" class="notification-item" data-open-notification="${esc(n.id)}"><span>🔒</span><span><strong>참여 권한이 종료된 대화</strong><p>참석 취소 또는 모임 탈퇴로 내용이 잠겼어요.</p><small>원문을 보려면 현재 참석 자격이 필요해요.</small></span></button>`;const m=state.meetups.find(m=>'meetup:'+m.id===n.roomId),g=groups.find(g=>g.id===n.groupId),sender=member(n.senderId);return `<button type="button" class="notification-item ${n.read?'':'unread'}" data-open-notification="${esc(n.id)}">${avatarMarkup(sender)}<span><strong>${esc(sender.name)}${n.kind==='mention'?'님이 나를 태그했어요':'님의 새 대화'}<span class="notification-kind">${n.kind==='mention'?'@멘션':'대화'}</span></strong><p>${esc(n.text)}</p><small>${esc(m?.title||g?.name||'모임 채팅')} · ${time(n.at)} · 원문으로 이동</small></span>${icon('arrow')}</button>`;}).join(''):'<div class="empty-state">'+icon('bell')+'<p>아직 알림이 없어요.</p><p>채팅방의 ‘나를 @멘션’으로 알림 흐름을 확인할 수 있어요.</p><button type="button" class="button primary" data-room="group:walk">산책 모임 채팅 열기</button></div>'}</div>`;}
  function bindChat(){
    const stream=$('#message-stream');if(!stream)return;renderMessages('latest');bindReplySwipe(stream);
    stream.addEventListener('scroll',()=>{if(isNearBottom()&&!state.readFreeze){state.newMessageCount=0;const latest=chatMessages().at(-1);if(latest&&latest.at>state.readThrough){state.readThrough=latest.at;persist();renderNav();}}updateJump();},{passive:true});
    $('#message-input').addEventListener('input',event=>{event.target.style.height='auto';event.target.style.height=Math.min(100,event.target.scrollHeight)+'px';updateMentionQuery();updateComposer();});
    $('#message-input').addEventListener('click',updateMentionQuery);
    $('#message-input').addEventListener('focus',()=>{if(state.stickerOpen)closeStickerDrawer();});
    $('#message-input').addEventListener('keydown',event=>{
      if(event.isComposing)return;
      if(state.mentionQuery!==null){
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();state.mentionIndex=(state.mentionIndex+(event.key==='ArrowDown'?1:-1)+Math.max(1,state.mentionChoices.length))%Math.max(1,state.mentionChoices.length);renderMentionPopup();return;}
        if((event.key==='Enter'||event.key==='Tab')&&state.mentionChoices.length){event.preventDefault();chooseMention(state.mentionChoices[state.mentionIndex].id);return;}
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();state.mentionQuery=null;$('#mention-popup').hidden=true;return;}
      }
      if(event.key==='Backspace'&&!event.target.value&&state.mentionIds.length){event.preventDefault();state.mentionIds.pop();updateComposer();return;}
      if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}
    });
    $('#message-form').addEventListener('submit',event=>{event.preventDefault();sendMessage();});
    $('#image-file').addEventListener('change',event=>{
      const file=event.target.files&&event.target.files[0];if(!file)return;
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){toast('PNG, JPG, WebP, GIF 이미지를 선택해 주세요.');event.target.value='';return;}
      if(file.size>8*1024*1024){toast('이미지는 8MB 이하로 선택해 주세요.');event.target.value='';return;}
      if(state.photo)URL.revokeObjectURL(state.photo);state.photo=URL.createObjectURL(file);state.photoName=file.name;renderAttachment();toast('사진을 미리 보고 있어요. 서버에 업로드하지 않습니다.');
    });
    if(state.photo)renderAttachment();
    renderStickerDrawer();
  }
  function renderAttachment(){const preview=$('#attachment-preview');if(!preview)return;preview.hidden=!state.photo;preview.className=state.photo?'attach-preview':'';preview.innerHTML=state.photo?`<img src="${state.photo}" alt="첨부 이미지 미리보기"><span>${esc(state.photoName)}<small>로컬 미리보기 · 새로고침 시 사라져요</small></span><button type="button" class="icon-button" data-action="clear-photo" aria-label="첨부 이미지 제거">${icon('close')}</button>`:'';updateComposer();}
  function sendMessage(){
    const input=$('#message-input');if(!input||!canOpenRoom()){toast('이 채팅방에 참여할 권한이 없어요.');return;}const text=input.value.trim(),sticker=stickerById(state.selectedSticker);if(!text&&!state.photo&&!state.mentionIds.length&&!sticker)return;
    const m={id:'local-'+Date.now()+'-'+state.messages.length,senderId:getSelfId(),at:nextMessageTime(),text:text||(sticker?'[이모티콘] '+sticker.label:''),groupId:state.groupId,roomId:getRoomId(),mentions:[...state.mentionIds],replyTo:state.replyTo};if(state.photo)m.photo=state.photo;if(sticker){m.stickerId=sticker.id;m.stickerCaption=!!text;state.stickerRecent=[sticker.id,...state.stickerRecent.filter(id=>id!==sticker.id)].slice(0,10);}state.selectedSticker=null;
    state.messages.push(m);state.photo=null;state.photoName='';state.focusId=null;state.newMessageCount=0;state.mentionIds=[];state.replyTo=null;state.mentionQuery=null;state.readThrough=m.at;input.value='';input.style.height='auto';$('#image-file').value='';$('#mention-popup').hidden=true;$('#emoji-popup').hidden=true;renderReplyPreview();renderAttachment();updateComposer();renderMessages('latest');renderStickerDrawer();persist();
  }
  function syncChatLayoutState(){
    document.documentElement.style.setProperty('--chat-viewport-height',(window.visualViewport?.height||window.innerHeight)+'px');
    const chatting=state.page==='chat';
    const inGroup=chatting||state.page==='group',mobile=usesMobileLayout();
    document.body.classList.toggle('chat-active',chatting);
    document.body.classList.toggle('mobile-chat-active',chatting&&mobile);
    document.body.classList.toggle('group-active',inGroup);
    document.body.classList.toggle('mobile-group-active',inGroup&&mobile);
  }
  function render(){
    syncChatLayoutState();
    renderNav();$('#main-content').classList.toggle('chat-mode',state.page==='chat');
    const functions={explore:renderExplore,mygroups:renderMyGroups,group:renderGroup,chats:renderChatList,my:renderMy,chat:renderChat,notifications:renderNotifications};
    const replacement=[...extensions.values()].map(ext=>ext.renderPage?.(state.page,appAPI)).find(value=>typeof value==='string');
    $('#main-content').innerHTML=replacement??(functions[state.page]||renderExplore)();
    if(state.page==='explore'||state.page==='mygroups'){
      const heading=$('.page-heading');const oldAction=$('.page-heading>.button');if(oldAction)oldAction.remove();
      heading.insertAdjacentHTML('beforeend',`<button type="button" class="button ${state.page==='explore'?'soft':'primary'}" data-action="new-group">${icon('plus')}모임 만들기</button>`);
    }
    if(state.page==='explore'){updateExploreResults();$('#group-search').addEventListener('input',event=>{state.query=event.target.value;updateExploreResults();});$('#area-filter').addEventListener('change',event=>{state.area=event.target.value;updateExploreResults();});}
    if(state.page==='chat')bindChat();
    updateNotificationBadge();
    if(appAPI)for(const extension of extensions.values())extension.afterRender?.(appAPI);
  }
  function openModal(title,body,footer='',wide=false){
    previousFocus=document.activeElement;
    $('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><h2 id="modal-title">${esc(title)}</h2><button type="button" class="icon-button" data-action="close-modal" aria-label="닫기">${icon('close')}</button></header><div class="modal-body">${body}</div>${footer?`<footer class="modal-footer">${footer}</footer>`:''}</section></div>`;
    document.body.style.overflow='hidden';
    if(appAPI)for(const extension of extensions.values())extension.afterModal?.(appAPI);
    setTimeout(()=>{const modal=$('.modal');if(!modal)return;const focus=$('input:not([type=hidden]),textarea,select,button',$('.modal-body'))||$('button',modal);if(focus)focus.focus();},0);
  }
  function closeModal(){if(!$('#modal-root').children.length)return;$('#modal-root').innerHTML='';document.body.style.overflow='';state.modal=null;if(previousFocus&&previousFocus.isConnected)previousFocus.focus();}
  function showMembers(){const visibleMembers=state.groupId.startsWith('custom-')?[member('me')]:members;state.modal={type:'members'};openModal('함께하는 멤버',`<p class="modal-subtitle">${esc(group().name)} · 멤버 목록 예시</p>${visibleMembers.map(m=>`<div class="member-row"><div class="avatar" style="background:${m.bg};color:${m.fg}">${esc(m.name.slice(0,1))}</div><div><strong>${esc(m.name)}</strong><span>${m.role}</span></div>${m.role==='모임장'?'<span class="pill">모임장</span>':''}</div>`).join('')}<p class="form-hint">${state.groupId.startsWith('custom-')?'새 모임은 모임장 1명으로 시작해요.':'이 시안에는 대표 멤버 5명만 표시돼요.'}</p>`);}
  function mapLinks(place){const naver=`https://map.naver.com/p/search/${encodeURIComponent(place.name)}`;const kakao=`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;return `<a class="button" href="${naver}" target="_blank" rel="noopener noreferrer">네이버지도 ${icon('external')}</a><a class="button" href="${kakao}" target="_blank" rel="noopener noreferrer">카카오맵 ${icon('external')}</a>`;}
  function placeMarkup(place,meetingPoint){const preview=window.PLACE_PREVIEWS?.[place.id];return `<div class="location-card"><div class="location-name">${icon('pin')}${esc(place.name)}</div><p>${esc(place.address)}${meetingPoint?'<br>집결: '+esc(meetingPoint):''}</p>${preview?`<figure class="map-preview"><img src="${esc(preview.image)}" alt="${esc(place.name)} 실제 지도 캡처와 목적지 위치"><figcaption>실제 지도 캡처 · 실시간 지도는 미연동<br><a href="${esc(preview.attributionURL||'https://www.openstreetmap.org/copyright')}" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href="${esc(preview.sourceURL)}" target="_blank" rel="noopener noreferrer">원본 지도 보기</a></figcaption></figure>`:`<div class="map-placeholder">${icon('pin')}<span>지도 API 연결 영역</span><small>실시간 지도는 연결되지 않았어요.</small></div>`}<div class="map-linkrow">${mapLinks(place)}</div><button type="button" class="button soft" style="width:100%;margin-top:8px" data-action="route">${icon('navigation')}현재 위치에서 경로 보기</button></div>`;}
  function routeMarkup(){
    if(state.routeState==='initial')return '';
    const place=places.find(p=>p.id===state.modal?.placeId)||places[0];
    let body='';
    if(state.routeState==='permission')body='<p>현재 위치 사용 여부를 선택해 주세요. 이 시안은 브라우저 위치 권한을 요청하거나 위치를 수집하지 않아요.</p><button type="button" class="button primary small" data-action="location-allow">위치 허용 시연</button><button type="button" class="button small" data-action="location-deny">위치 거부 시연</button><button type="button" class="button small" data-action="location-manual">출발지 직접 선택</button>';
    if(state.routeState==='denied')body='<p>현재 위치를 사용할 수 없어요. 출발지를 직접 선택해서 이어갈 수 있어요.</p><button type="button" class="button primary small" data-action="location-manual">출발지 직접 선택</button><button type="button" class="button small" data-action="route">다시 시도</button>';
    if(state.routeState==='manual')body=`<p>출발지 검색 · 로컬 장소 목록에서 선택해 주세요.</p><label><span class="sr-only">경로 출발지</span><select class="select" id="route-start" style="width:100%"><option value="">출발지를 선택하세요</option>${places.filter(p=>p.id!==place.id).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></label>`;
    if(state.routeState==='ready')body=`<div class="route-points"><div class="route-point"><span class="point"></span>${esc(state.routeStart==='current'?'현재 위치 · 시안':places.find(p=>p.id===state.routeStart)?.name||'선택한 출발지')}</div><div class="route-point"><span class="point end"></span>${esc(place.name)}</div></div><div class="category-list" style="margin:12px 0">${[['walk','도보'],['transit','대중교통'],['car','자동차']].map(([id,label])=>`<button type="button" class="chip ${state.routeMode===id?'active':''}" data-route-mode="${id}" aria-pressed="${state.routeMode===id}">${label}</button>`).join('')}</div><p>경로 조회 준비 완료 · 실제 경로 API를 호출하지 않으므로 경로선, 거리, 예상 시간을 표시하지 않아요.</p><div class="map-linkrow">${mapLinks(place)}</div><p class="form-hint">외부 지도에서 선택한 장소를 열고 길찾기를 이어갈 수 있어요.</p>`;
    return `<div class="route-flow"><h3>${icon('navigation').replace('class="icon"','class="icon" style="width:14px;height:14px;vertical-align:-2px"')}경로 보기 · 흐름 시연</h3>${body}</div>`;
  }
  function showMeetup(id,keepRoute=false){
    const m=state.meetups.find(m=>m.id===id);if(!m)return;const place=places.find(p=>p.id===m.placeId);if(!keepRoute){state.routeState='initial';state.routeStart=null;}
    state.modal={type:'meetup',id:m.id,placeId:m.placeId};
    const joined=state.attendance.has(m.id),attendees=roomParticipants('meetup:'+m.id),count=attendees.length;
    openModal('정모 상세',`<span class="pill">${esc(groups.find(g=>g.id===m.groupId)?.name||'우리 모임')}</span><h1 class="meetup-modal-title">${esc(m.title)}</h1><div class="meetup-details"><div>${icon('calendar')}${dateLabel(meetupAt(m))} · ${time(meetupAt(m))}</div><div>${icon('users')}참석 ${count} / ${m.capacity}명</div></div><div class="meetup-attendees">${attendees.map(p=>avatarMarkup(p)).join('')}<small>이 참석자만 대화방에 들어갈 수 있어요.</small></div><p class="modal-subtitle">${esc(m.description||'함께하는 시간을 기다리고 있어요.').replace(/\n/g,'<br>')}</p><button type="button" class="button ${joined?'primary':''}" style="width:100%" data-room="meetup:${esc(m.id)}">${icon('chat')}${joined?'정모 참석자 대화방 열기':'🔒 참석 신청 후 대화방 입장'}</button>${placeMarkup(place,m.meetingPoint)}<div id="route-container">${routeMarkup()}</div>`,`<button class="button" type="button" data-action="close-modal">닫기</button><button class="button ${joined?'soft':'primary'}" type="button" data-attend="${esc(m.id)}" aria-pressed="${joined}">${icon(joined?'check':'plus')}${joined?'참석 취소':'참석하기'}</button>`);
  }
  function refreshRoute(){const container=$('#route-container');if(container)container.innerHTML=routeMarkup();}
  function showMeetupForm(){
    if(!state.joined.has(state.groupId)){toast('모임에 가입하면 정모를 만들 수 있어요.');return;}
    state.formDraft={title:'',date:'2026-11-08T10:00',capacity:12,description:'',meetingPoint:'',placeId:null};state.placeChoice=null;state.modal={type:'meetup-form'};
    openModal('새 정모 만들기',`<form id="meetup-form"><div id="meetup-error" role="alert" hidden></div><div class="form-field"><label for="meetup-title">정모 이름 *</label><input class="form-input" id="meetup-title" name="title" required maxlength="80" placeholder="어떤 만남을 준비하고 있나요?"></div><div class="form-row"><div class="form-field"><label for="meetup-date">날짜와 시간 *</label><input class="form-input" id="meetup-date" name="date" type="datetime-local" required value="2026-11-08T10:00"><p class="form-hint">한국 시간 (Asia/Seoul)</p></div><div class="form-field"><label for="meetup-capacity">최대 참석 인원 *</label><input class="form-input" id="meetup-capacity" name="capacity" type="number" min="2" max="100" value="12" required></div></div><div class="form-field"><label for="place-search">모임 장소 검색 *</label><label class="search-field">${icon('search')}<input id="place-search" type="search" placeholder="서울숲, 뚝섬, 성수…" autocomplete="off"></label><p class="form-hint">로컬 장소 5개로 검색을 시연해요. 실제 서비스에서는 지도 제공자 검색 API를 연결합니다.</p><div class="place-results" id="place-results">${placeSearchResults('')}</div><div id="selected-place"></div></div><div class="form-field"><label for="meetup-point">상세 집결 위치</label><input class="form-input" id="meetup-point" name="meetingPoint" maxlength="180" placeholder="예: 정문 앞, 초록색 모자를 찾아주세요."></div><div class="form-field"><label for="meetup-description">정모 소개 / 준비물</label><textarea class="form-textarea" id="meetup-description" name="description" maxlength="1000" placeholder="함께할 활동과 준비물을 알려주세요."></textarea></div></form>`,`<button class="button" type="button" data-action="close-modal">취소</button><button class="button primary" type="submit" form="meetup-form">정모 등록</button>`,true);
    $('#place-search').addEventListener('input',event=>{$('#place-results').innerHTML=placeSearchResults(event.target.value);});
    $('#meetup-form').addEventListener('submit',event=>{event.preventDefault();const form=event.target;const title=form.elements.title.value.trim(),date=form.elements.date.value,capacity=Number(form.elements.capacity.value);const error=$('#meetup-error');
      const reason=!title?'정모 이름을 입력해 주세요.':!date||!Number.isFinite(Date.parse(date+':00+09:00'))?'날짜와 시간을 입력해 주세요.':!state.placeChoice?'검색 결과에서 모임 장소를 선택해 주세요.':capacity<2||capacity>100?'참석 인원은 2명에서 100명 사이로 입력해 주세요.':'';
      if(reason){error.textContent=reason;error.className='form-error';error.hidden=false;return;}
      const m={id:'meetup-'+Date.now(),groupId:state.groupId,title,date,capacity,count:0,attendeeIds:['me'],placeId:state.placeChoice,meetingPoint:form.elements.meetingPoint.value.trim(),description:form.elements.description.value.trim()};state.meetups.push(m);state.attendance.add(m.id);persist();closeModal();state.groupTab='정모';render();toast('새 정모를 이 브라우저에 등록했어요.');
    });
  }
  function placeSearchResults(query){const found=places.filter(p=>(p.name+' '+p.address).includes(query.trim()));return found.length?found.map(p=>`<button type="button" class="place-result ${state.placeChoice===p.id?'selected':''}" data-place-choice="${p.id}">${p.name}<small>${p.address}</small></button>`).join(''):'<div class="form-hint" style="padding:13px">검색 결과가 없어요. 서울숲, 뚝섬, 성수, 망원, 판교를 검색해 보세요.</div>';}
  function showGroupForm(){
    openModal('우리 모임 만들기',`<form id="group-form"><div id="group-form-error" role="alert" hidden></div><div class="form-field"><label for="new-group-name">모임 이름 *</label><input class="form-input" name="name" id="new-group-name" required maxlength="60" placeholder="함께하고 싶은 취미를 담아 주세요."></div><div class="form-row"><div class="form-field"><label for="new-group-area">활동 지역 *</label><select class="form-input" name="area" id="new-group-area">${groupAreas.map(area=>`<option>${area}</option>`).join('')}</select></div><div class="form-field"><label for="new-group-category">관심사 *</label><select class="form-input" name="category" id="new-group-category">${groupCategories.map(category=>`<option>${category}</option>`).join('')}</select></div></div><div class="form-field"><label for="new-group-description">모임 소개 *</label><textarea class="form-textarea" name="description" id="new-group-description" required maxlength="1500" placeholder="어떤 사람들과 어떤 활동을 하고 싶으세요?"></textarea></div><div class="form-row"><div class="form-field"><label for="new-group-capacity">모임 정원 *</label><input class="form-input" type="number" min="2" max="200" value="30" name="capacity" id="new-group-capacity" required></div><div class="form-field"><label for="new-group-mode">가입 방식</label><select class="form-input" name="joinMode" id="new-group-mode"><option value="open">자유 가입</option><option value="approval">승인제</option></select></div></div><p class="form-hint">모임을 만들면 모임장으로 참여해요. 승인제는 설정을 저장하며, 다른 사용자의 승인 요청은 이 시안에 포함되지 않아요.</p></form>`,`<button class="button" type="button" data-action="close-modal">취소</button><button class="button primary" type="submit" form="group-form">모임 만들기</button>`,true);
    $('#group-form').addEventListener('submit',event=>{
      event.preventDefault();const form=event.target;const name=form.elements.name.value.trim(),desc=form.elements.description.value.trim(),capacity=Number(form.elements.capacity.value);
      const error=!name?'모임 이름을 입력해 주세요.':!desc?'모임 소개를 입력해 주세요.':capacity<2||capacity>200?'정원은 2명에서 200명 사이로 입력해 주세요.':'';
      if(error){const output=$('#group-form-error');output.hidden=false;output.className='form-error';output.textContent=error;return;}
      const id='custom-'+Date.now();const joinMode=form.elements.joinMode.value;
      const g={id,name,desc,capacity,area:form.elements.area.value,category:form.elements.category.value,joinMode,members:1,includesMe:true,word:name.slice(0,14),emoji:'🌱',bg:'#ede9df',fg:'#807151',circle:'#ddd3ba',tags:['새 모임',joinMode==='approval'?'승인제':'자유 가입'],activity:'정모에서 함께 정해요',age:'관심 있는 누구나'};
      groups.push(g);allowedIds.add(id);state.joined.add(id);state.readByRoom['group:'+id]=ts('25','17:00');persist();closeModal();changePage('group',{groupId:id});toast('모임을 만들었어요. 내 모임에서 다시 볼 수 있어요.');
    });
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('.summary-scrim')){closeSummary();return;}
    const button=event.target.closest('button,a');if(!button)return;
    if(button.dataset.chatCommand)closeModal();
    if(button.dataset.messageMore){showMessageMore(button.dataset.messageMore);return;}
    if(button.dataset.contextTab){const tab=button.dataset.contextTab;if(tab==='채팅'){if(state.page!=='chat')openRoom({roomId:'group:'+state.groupId});}else changePage('group',{groupId:state.groupId,tab});return;}
    if(button.dataset.room){openRoom({roomId:button.dataset.room});return;}
    if(button.dataset.profileMember){window.MoyobomCommunity?.openProfile?.(button.dataset.profileMember);return;}
    if(button.dataset.chooseMention){chooseMention(button.dataset.chooseMention);return;}
    if(button.dataset.removeMention){state.mentionIds=state.mentionIds.filter(id=>id!==button.dataset.removeMention);updateComposer();return;}
    if(button.dataset.replyMessage){selectReply(button.dataset.replyMessage);return;}
    if(button.dataset.jumpReply){const target=chatMessages().find(m=>m.id===button.dataset.jumpReply);if(target){state.focusId=target.id;renderMessages('source');}else toast('이 채팅방에서 원문을 찾을 수 없어요.');return;}
    if(button.dataset.reactionPicker){showEmojiPicker(button.dataset.reactionPicker);return;}
    if(button.dataset.reactMessage){toggleReaction(button.dataset.reactMessage,button.dataset.emoji);return;}
    if(button.dataset.stickerTab){state.stickerTab=button.dataset.stickerTab;renderStickerDrawer();updateComposer();return;}
    if(button.dataset.stickerPack){const id=button.dataset.stickerPack;if(id==='recent'||window.MoyobomStickers?.packs?.some(pack=>pack.id===id)){state.stickerPack=id;renderStickerDrawer();updateComposer();}return;}
    if(button.dataset.stickerChoice){const selected=stickerById(button.dataset.stickerChoice);if(selected){state.selectedSticker=selected.id;renderStickerDrawer();updateComposer();}return;}
    if(button.dataset.miniEmoji){const input=$('#message-input'),emoji=button.dataset.miniEmoji;if(!input)return;const at=input.selectionStart,end=input.selectionEnd;if(input.value.length-(end-at)+emoji.length>2000){toast('메시지는 2,000자까지 입력할 수 있어요.');return;}input.value=input.value.slice(0,at)+emoji+input.value.slice(end);input.setSelectionRange(at+emoji.length,at+emoji.length);updateComposer();return;}
    if(button.dataset.stickerMessage){const message=chatMessages().find(m=>m.id===button.dataset.stickerMessage),sticker=stickerById(message?.stickerId);if(sticker){const packName=stickerPackName(sticker);openModal('이모티콘 · '+sticker.label,`<img class="em-sticker-full" src="${esc(sticker.src)}" alt="${esc(sticker.label)} · ${esc(packName)}"><p class="form-hint" style="text-align:center">${esc(packName)} · 대화에 마음을 더해 보세요.</p>`);}return;}
    if(button.dataset.selectEmoji){const emoji=button.dataset.selectEmoji;if(state.emojiFor)toggleReaction(state.emojiFor,emoji);else{const input=$('#message-input');const at=input.selectionStart;input.value=input.value.slice(0,at)+emoji+input.value.slice(input.selectionEnd);input.focus();input.setSelectionRange(at+emoji.length,at+emoji.length);updateComposer();}$('#emoji-popup').hidden=true;return;}
    if(button.dataset.postMessage){if(getRoomId()==='group:couple'){toast('둘만의 대화는 모임 게시판에 연결하지 않아요.');return;}const message=chatMessages().find(m=>m.id===button.dataset.postMessage);if(message)window.MoyobomCommunity?.createPostFromMessages?.({groupId:state.groupId,roomId:getRoomId(),messages:[{...message,authorId:message.senderId}]});return;}
    if(button.dataset.openNotification){const notification=state.notifications.find(n=>n.id===button.dataset.openNotification);if(notification&&jumpToMessage(notification.roomId,notification.messageId)){notification.read=true;persist();updateNotificationBadge();}return;}
    if(button.dataset.imageMessage){const message=state.messages.find(m=>m.id===button.dataset.imageMessage);if(message?.photo)openModal('첨부 이미지',`<img class="image-full" src="${message.photo}" alt="첨부한 이미지 원본 미리보기"><p class="form-hint">${getRoomId()==='group:couple'?'함께 남긴 순간':'현재 브라우저 메모리에만 있는 이미지예요.'}</p>`,'',true);return;}
    if(button.dataset.page){changePage(button.dataset.page);return;}
    if(button.dataset.openGroup){changePage('group',{groupId:button.dataset.openGroup});return;}
    if(button.dataset.chat){changePage('chat',{groupId:button.dataset.chat});return;}
    if(button.dataset.like){const id=button.dataset.like;state.likes.has(id)?state.likes.delete(id):state.likes.add(id);persist();button.classList.toggle('liked',state.likes.has(id));button.setAttribute('aria-pressed',String(state.likes.has(id)));if(state.page==='mygroups')render();return;}
    if(button.dataset.category){state.category=button.dataset.category;$$('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category===state.category);b.setAttribute('aria-pressed',String(b.dataset.category===state.category));});updateExploreResults();return;}
    if(button.dataset.groupTab){state.groupTab=button.dataset.groupTab;render();return;}
    if(button.dataset.meetup){showMeetup(button.dataset.meetup);return;}
    if(button.dataset.attend){const m=state.meetups.find(m=>m.id===button.dataset.attend);if(!m)return;if(!state.joined.has(m.groupId)){toast('모임에 가입한 뒤 참석할 수 있어요.');return;}const cancel=state.attendance.has(m.id);if(cancel){state.attendance.delete(m.id);m.attendeeIds=(m.attendeeIds||[]).filter(id=>id!=='me');}else{if(roomParticipants('meetup:'+m.id).length>=m.capacity){toast('참석 인원이 가득 찼어요.');return;}state.attendance.add(m.id);m.attendeeIds=[...new Set([...(m.attendeeIds||[]),'me'])];}persist();if(cancel&&state.page==='chat'&&getRoomId()==='meetup:'+m.id){state.summaryJob++;changePage('group',{groupId:m.groupId,tab:'정모'});toast('참석을 취소하여 이 정모 대화방 접근이 종료됐어요.');return;}showMeetup(m.id,true);if(state.page==='group')render();return;}
    if(button.dataset.summaryTarget){state.summaryTarget=button.dataset.summaryTarget;dirtySummary();return;}
    if(button.dataset.source){state.focusId=button.dataset.source;renderMessages('source');if(usesMobileLayout()){state.summaryOpen=false;state.summaryJob++;$('.summary-panel')?.remove();$('.summary-scrim')?.remove();$('[data-action="toggle-summary"]')?.setAttribute('aria-expanded','false');}toast('요약의 원문을 강조했어요. 아래 버튼으로 최신 대화로 돌아갈 수 있어요.');return;}
    if(button.dataset.placeChoice){state.placeChoice=button.dataset.placeChoice;const p=places.find(p=>p.id===state.placeChoice);$('#selected-place').innerHTML=`<div class="selected-place">${icon('check').replace('class="icon"','class="icon" style="width:13px;height:13px;vertical-align:-2px"')} ${p.name}<small>${p.address}</small></div>`;$$('[data-place-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.placeChoice===state.placeChoice));return;}
    if(button.dataset.routeMode){state.routeMode=button.dataset.routeMode;refreshRoute();return;}
    if(button.dataset.post!==undefined){const titles=['모임 참여 안내','이번 주말, 함께 가고 싶은 곳','지난 모임의 작은 기록'];const contents=['반가워요. 우리 모임은 부담 없이 함께 취미를 즐기는 공간이에요.\n서로를 존중하고, 정모에 참석하기 어려우면 미리 알려주세요.\n모임 일정은 정모 탭, 빠른 이야기는 채팅방에서 확인할 수 있어요.','이번 주말에는 어떤 곳을 걸어 보고 싶으세요?\n좋아하는 동네와 산책 코스를 채팅에서 나눠 주세요.','천천히 걸으며 나눈 작은 이야기들이 오래 기억에 남아요.\n다음 산책에서도 함께 만나요.'];openModal(titles[Number(button.dataset.post)],'<div class="article-meta">민지 · 모임 게시판 · 샘플 게시글</div><p class="article-copy">'+contents[Number(button.dataset.post)]+'</p>');return;}
    if(button.dataset.photoSample!==undefined){const emoji=['🌳','☕','🍂','🌿','📖','🌤️'][Number(button.dataset.photoSample)];openModal('모임 사진',`<div class="sample-photo" style="aspect-ratio:1.4;font-size:100px"><span>${emoji}</span><small>샘플 일러스트 · 실제 사진이 아닙니다</small></div>`);return;}
    switch(button.dataset.action){
      case 'my':changePage('my');break;
      case 'reset-filters':state.query='';state.area='all';state.category='전체';render();break;
      case 'join':if(state.joined.has(state.groupId)){openModal('모임에서 탈퇴할까요?','<p class="modal-subtitle">탈퇴하면 이 모임의 채팅에 참여할 수 없어요. 다시 가입할 수 있습니다.</p>','<button type="button" class="button" data-action="close-modal">계속 함께하기</button><button type="button" class="button danger" data-action="confirm-leave">탈퇴하기</button>');}else{state.joined.add(state.groupId);persist();render();toast('모임에 가입했어요. 채팅방에서 인사해 보세요.');}break;
      case 'confirm-leave':state.joined.delete(state.groupId);state.meetups.filter(m=>m.groupId===state.groupId).forEach(m=>state.attendance.delete(m.id));state.summaryJob++;persist();closeModal();changePage('mygroups');toast('모임에서 탈퇴했어요.');break;
      case 'open-chat':changePage('chat',{groupId:state.groupId});break;
      case 'members':showMembers();break;
      case 'chat-more':showChatMore();break;
      case 'group-home':if(getRoomId()==='group:couple')changePage('chats');else changePage('group',{groupId:state.groupId,tab:'홈'});break;
      case 'new-meetup':showMeetupForm();break;
      case 'new-group':showGroupForm();break;
      case 'close-modal':closeModal();break;
      case 'toggle-summary':if(state.summaryOpen)closeSummary();else{state.summaryOpen=true;$('[data-action="toggle-summary"]').setAttribute('aria-expanded','true');$('.chat-layout').insertAdjacentHTML('beforeend',summaryMarkup());if(state.summaryStatus==='idle')generateSummary();}break;
      case 'close-summary':closeSummary();break;
      case 'generate-summary':generateSummary();break;
      case 'summary-week':state.summaryRange='week';generateSummary();break;
      case 'latest':state.readFreeze=false;state.readThrough=chatMessages().at(-1)?.at??state.readThrough;persist();state.focusId=null;state.newMessageCount=0;$$('.message.highlighted').forEach(m=>m.classList.remove('highlighted'));$('#message-stream').scrollTop=$('#message-stream').scrollHeight;updateJump();break;
      case 'incoming':receiveDemo(false);break;
      case 'mention-me':receiveDemo(true);break;
      case 'unread-summary':state.summaryRange='unread';state.summaryOpen=true;if(!$('.summary-panel'))$('.chat-layout').insertAdjacentHTML('beforeend',summaryMarkup());generateSummary();break;
      case 'bulk-unread':{state.summaryJob++;state.summaryOpen=false;state.readFreeze=true;const list=chatMessages();state.readThrough=list[Math.max(0,list.length-301)]?.at??0;state.unreadSnapshot=state.readThrough;state.summaryRange='unread';state.summaryStatus='idle';persist();render();toast(`실제 원문 ${list.length}개 중 최근 ${unreadCount(getRoomId(),state.unreadSnapshot)}개를 안 읽은 구간으로 설정했어요.`);break;}
      case 'mention-open':{const input=$('#message-input');input.focus();const at=input.selectionStart;input.value=input.value.slice(0,at)+(at&&!/\s/.test(input.value[at-1])?' ':'')+'@'+input.value.slice(input.selectionEnd);input.setSelectionRange(at+(at&&!/\s/.test(input.value[at-1])?2:1),at+(at&&!/\s/.test(input.value[at-1])?2:1));updateMentionQuery();updateComposer();break;}
      case 'emoji':toggleStickerDrawer();break;
      case 'sticker-close':closeStickerDrawer();break;
      case 'sticker-keyboard':closeStickerDrawer(true);break;
      case 'sticker-preview-cancel':state.selectedSticker=null;renderStickerDrawer();updateComposer();break;
      case 'sticker-send':sendMessage();break;
      case 'emoji-close':$('#emoji-popup').hidden=true;break;
      case 'cancel-reply':state.replyTo=null;renderReplyPreview();break;
      case 'inbox':changePage('notifications');break;
      case 'room-notifications':showNotificationSettings();break;
      case 'global-notifications':showNotificationSettings('*');break;
      case 'save-notifications':state.notificationPrefs[state.notificationSettingRoom]={mode:$('#notification-mode').value,vibrate:$('#notification-vibrate').checked};persist();closeModal();toast('알림 선호를 저장했어요. 실제 앱 푸시는 미연동입니다.');break;
      case 'read-notifications':state.notifications.forEach(n=>n.read=true);persist();render();break;
      case 'attach':$('#image-file').click();break;
      case 'clear-photo':if(state.photo)URL.revokeObjectURL(state.photo);state.photo=null;state.photoName='';$('#image-file').value='';renderAttachment();break;
      case 'route':state.routeState='permission';refreshRoute();$('#route-container')?.scrollIntoView({block:'nearest'});break;
      case 'location-allow':state.routeState='ready';state.routeStart='current';refreshRoute();break;
      case 'location-deny':state.routeState='denied';refreshRoute();break;
      case 'location-manual':state.routeState='manual';refreshRoute();break;
      case 'reset-demo':openModal('데모 데이터를 초기화할까요?','<p class="modal-subtitle">이 브라우저의 가입, 관심, 정모와 텍스트 메시지 변경을 지우고 처음 상태로 돌아갑니다.</p>','<button type="button" class="button" data-action="close-modal">취소</button><button type="button" class="button danger" data-action="confirm-reset">초기화</button>');break;
      case 'confirm-reset':try{localStorage.removeItem(storageKey);}catch{}window.location.reload();break;
    }
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='chat-more-room-select'){openRoom({roomId:event.target.value});return;}
    if(event.target.id==='room-select'){openRoom({roomId:event.target.value});return;}
    if(event.target.id==='summary-person'){state.summaryPerson=event.target.value;dirtySummary();}
    if(event.target.id==='summary-range'){state.summaryRange=event.target.value;dirtySummary();}
    if(event.target.id==='route-start'&&event.target.value){state.routeStart=event.target.value;state.routeState='ready';refreshRoute();}
  });
  document.addEventListener('click',event=>{if(event.target.classList.contains('modal-backdrop'))closeModal();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if($('#modal-root').children.length)closeModal();else if(state.stickerOpen)closeStickerDrawer();else if($('#emoji-popup')&&!$('#emoji-popup').hidden)$('#emoji-popup').hidden=true;else if(state.summaryOpen)closeSummary();return;}
    if(event.key==='Tab'&&$('#modal-root').children.length){const modal=$('.modal');const focusable=$$('button:not([disabled]),a[href],input:not([disabled]):not([type=hidden]),select,textarea',modal).filter(e=>e.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  $$('.brand,.mobile-brand').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();changePage('explore');}));
  function getRoomId(){return state.roomId||'group:'+state.groupId;}
  function openRoom(options={}){
    const roomId=typeof options==='string'?options:(options.roomId||'group:'+(options.groupId||state.groupId));
    const groupId=roomId.startsWith('group:')?roomId.slice(6):(state.meetups.find(m=>'meetup:'+m.id===roomId)?.groupId||state.groupId);
    changePage('chat',{groupId,roomId});return state.page==='chat';
  }
  function jumpToMessage(roomId,messageId){if(!canOpenRoom(roomId)){toast('현재 참여할 수 없는 채팅방입니다. 정모 참석 여부를 확인해 주세요.');return false;}if(!roomMessagesById(roomId).some(m=>m.id===messageId)){toast('연결된 원문이 현재 세션에 없어요.');return false;}if(state.page==='chat'&&getRoomId()===roomId)closeModal();else if(!openRoom({roomId}))return false;state.focusId=messageId;renderMessages('source');return true;}
  appAPI=window.Moyobom={state,groups,members,places,$,$$,esc,icon,group,member,render,changePage,persist,loadMultiGroupSample,getSelfId,openModal,closeModal,toast,meetupAt,dateLabel,time,chatMessages,openRoom,jumpToMessage,getRoomId,registerExtension(name,extension){extensions.set(name,extension);extension.init?.(appAPI);extension.afterRender?.(appAPI);return appAPI;}};
  window.addEventListener('resize',syncChatLayoutState,{passive:true});
  window.visualViewport?.addEventListener('resize',syncChatLayoutState,{passive:true});
  document.body.classList.toggle('force-mobile',forcedMobile);document.body.classList.toggle('force-web',forcedWeb);document.body.dataset.viewMode=viewMode;
  const viewport=document.querySelector('meta[name="viewport"]');if(viewport&&viewMode!=='auto')viewport.content=forcedWeb?'width=1280, viewport-fit=cover':'width=device-width, initial-scale=1, viewport-fit=cover';
  if(forcedWeb&&!document.querySelector('link[data-web-view]')){const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('web-view.css',document.baseURI).href;stylesheet.dataset.webView='';document.head.append(stylesheet);}
  const viewSwitch=$('#view-switch');if(viewSwitch){viewSwitch.href=new URL(forcedMobile?'web.html':'mobile.html',location.href).href;viewSwitch.textContent=forcedMobile?'웹 보기':'모바일 보기';}
  const bell=$('.notifications-bell');if(bell)bell.insertAdjacentHTML('afterbegin',icon('bell'));$('.notifications-bell>span[aria-hidden]')?.remove();
  render();
})();
