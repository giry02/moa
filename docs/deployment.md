# GitHub Pages 공개 주소

- 자동 선택: https://giry02.github.io/moa/
- 모바일 화면: https://giry02.github.io/moa/mobile.html
- 웹 화면: https://giry02.github.io/moa/web.html

기본 주소는 휴대폰·태블릿에서 모바일 화면으로, PC에서는 웹 화면으로 연결한다. PC 창을 좁게 만든 것만으로 모바일로 바꾸지 않는다. 각 전용 주소는 기기 자동 선택을 거치지 않으며, 화면 상단의 웹/모바일 전환 링크로 다른 화면을 열 수 있다. 기존 `?view=mobile`, `?view=web` 링크도 지원한다.

## 배포 구조

GitHub Pages의 게시 소스는 `main` 브랜치의 루트(`/`)다. 루트 `index.html`은 자동 선택 진입점이고, `web.html`·`mobile.html`은 실제 화면이다. 화면은 `prototype/`의 공통 JS·CSS·이미지 자산을 사용한다. `base`를 상대 경로로 설정해 프로젝트 주소인 `/moa/` 아래에서도 경로가 유지된다.

앱 화면의 원본은 `prototype/web.html`, `prototype/mobile.html`, 자동 선택 원본은 `prototype/index.html`이다. HTML을 수정한 뒤에는 다음 명령으로 루트 진입점을 갱신한다.

```powershell
python scripts/build_pages.py
python scripts/build_pages.py --check
```

생성된 루트 HTML과 공통 원본 파일을 함께 커밋하고 `main`으로 푸시하면 GitHub Pages가 갱신된다. JS·CSS·이미지는 공통 파일을 직접 사용하므로 두 화면에서 같은 기능을 제공한다. `.nojekyll`은 정적 파일을 그대로 게시하도록 한다.

공개된 화면도 브라우저에 데이터를 저장하는 프로토타입이다. 실제 사용자 간 데이터 동기화나 AI·실시간 지도·원격 푸시 서버는 연결하지 않는다.
