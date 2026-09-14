# WELCOME HOME — 전도집회 초대 현황판

전도집회 "WELCOME HOME" 을 위한 8비트 현황판입니다.

왼쪽 끝에 아들이, 오른쪽 끝에 집이 있고 집 앞에는 아버지가 팔을 벌리고 서 있습니다.
QR을 스캔한 사람이 **초대하고 싶은 사람의 이름과 기도제목**을 남기면 길 위의 코인이
하나씩 켜지고, 아들이 그만큼 집 쪽으로 걸어갑니다. **40개**가 다 켜지면 아들이
아버지 품에 안깁니다. (누가복음 15:20)

현황판은 **16:9 한 화면**에 전부 담기게 만들어서, 빔프로젝터에 그냥 띄우면 됩니다.
(화면 폭이 860px 아래면 세로로 흐르는 모바일 배치로 바뀝니다)

```
index.html              현황판 + 초대장 페이지 (한 파일)
vercel.json             Vercel 배포 설정 (캐시 끄기)
server/supabase.sql     Supabase 테이블 + 접근 정책
server/firestore.rules  Firebase 보안 규칙
server/Code.gs          구글 스프레드시트 접수 서버 (Apps Script)
```

---

## 1. 서버 붙이기 (여러 사람이 각자 폰으로 제출하려면 필수)

서버를 붙이지 않으면 제출한 내용이 **그 기기에만** 저장됩니다.
아래 세 가지 중 하나를 고르면 됩니다. 페이지는 이 순서대로 자동으로 잡습니다.

| 방식 | 누가 제출할 수 있나 | 준비 시간 |
|---|---|---|
| **Supabase** | 누구나 (로그인 불필요) | 약 5분 |
| **Firebase Firestore** | 누구나 (로그인 불필요) | 약 7분 |
| **Google Apps Script + 스프레드시트** | 누구나 (로그인 불필요) | 약 5분 |
| **Claude Artifact DB** | Claude 계정으로 로그인한 **같은 조직 구성원만** | 0분 (이미 연결됨) |

> 교인들이 QR만 찍고 들어오는 집회라면 **Supabase, Firebase, Apps Script** 중 하나를 쓰셔야 합니다.
> Claude Artifact DB 는 조직 내부 전용이라 외부인은 제출 화면에서 막힙니다.

---

### 방법 A — Supabase (권장)

1. https://supabase.com 에서 **New project**. 이름은 아무거나, 리전은 `Northeast Asia (Seoul)`.
   (DB 비밀번호는 이 페이지에서 쓰이지 않으니 적당히 정하고 따로 보관하세요)
2. 프로젝트가 뜨면 왼쪽 **SQL Editor** → 이 저장소의
   [`server/supabase.sql`](server/supabase.sql) 내용을 통째로 붙여넣고 **Run**.
   테이블 두 개와 접근 정책이 한 번에 만들어집니다.
3. 왼쪽 **Project Settings → API** 에서 두 개를 복사합니다.
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public** 키 (`service_role` 키가 아닙니다. 그건 절대 페이지에 넣지 마세요)
4. `index.html` 에서 이 줄을 채웁니다.

   ```js
   var SUPABASE = { url: "", anonKey: "" };
   ```

   > 파일을 고치기 어려우면 주소 뒤에 `?sb=프로젝트URL,anon키` 를 붙여 한 번 접속해도
   > **그 기기에** 저장됩니다. 다만 교인들 폰마다 할 수는 없으니 배포 전에 파일에
   > 직접 넣는 쪽이 확실합니다.

`anon` 키는 웹에 공개돼도 되는 값입니다. 실제 보호는 2번에서 건 RLS 정책이 합니다.
목표 개수나 QR 주소는 **Table Editor → config** 의 `campaign` 행에서 바꾸세요.

접수된 내용은 **Table Editor → invites** 에서 바로 보고, CSV 로 내려받을 수 있습니다.

---

### 방법 B — Firebase Firestore

1. https://console.firebase.google.com 에서 **프로젝트 만들기**. (Google 애널리틱스는 꺼도 됩니다)
2. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**.
   위치는 `asia-northeast3 (서울)`, 모드는 **프로덕션 모드**로 시작하세요.
3. **규칙** 탭을 열고, 이 저장소의 [`server/firestore.rules`](server/firestore.rules) 내용을
   통째로 붙여넣고 **게시**합니다. (이 규칙이 없으면 제출이 전부 거부됩니다)
4. **프로젝트 설정(톱니바퀴) → 일반** 에서 아래로 내려 **웹 앱 추가(`</>`)** 를 누르고,
   나오는 설정값 중 두 개만 적어둡니다.
   - `projectId`
   - `apiKey`
5. `index.html` 에서 이 줄을 찾아 채웁니다.

   ```js
   var FIREBASE = { projectId: "", apiKey: "" };
   ```

   > 파일을 고치기 어려우면 주소 뒤에 `?fb=프로젝트ID,API키` 를 붙여 한 번 접속해도
   > **그 기기에** 저장됩니다. 전광판 노트북에서 한 번, 안내용 폰에서 한 번 하면 되지만,
   > 교인들 폰마다 할 수는 없으니 배포 전에 파일에 직접 넣는 쪽이 확실합니다.

`apiKey` 는 웹에 공개돼도 되는 값입니다. 실제 보호는 3번의 보안 규칙이 합니다.
목표 개수나 QR 주소를 바꾸려면 Firestore 콘솔에서 `config/campaign` 문서를 만들고
`goal`(숫자), `shareUrl`(문자열) 필드를 넣으세요.

---

### 방법 C — Google Apps Script + 스프레드시트

접수 내용이 스프레드시트에 그대로 쌓여서, 집회 후 기도제목을 정리하거나 인쇄하기 좋습니다.

1. 구글 드라이브에서 **새 스프레드시트**를 하나 만듭니다. (이름 예: `welcome-home-초대`)
2. 메뉴에서 **확장 프로그램 → Apps Script** 를 엽니다.
3. 기본으로 들어 있는 `Code.gs` 내용을 모두 지우고, 이 저장소의
   [`server/Code.gs`](server/Code.gs) 내용을 통째로 붙여넣고 저장합니다.
4. 오른쪽 위 **배포 → 새 배포** → 유형 **웹 앱** 선택 후
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자** ← 이게 있어야 교인들이 로그인 없이 제출할 수 있습니다
   를 고르고 **배포**를 누릅니다. (처음 한 번 권한 승인 창이 뜹니다)
5. 나오는 **웹 앱 URL** (`https://script.google.com/macros/s/..../exec`) 을 복사합니다.
6. `index.html` 맨 아래 스크립트에서 이 줄을 찾아 주소를 넣습니다.

   ```js
   var SERVER_URL = "";   // ← 여기에 복사한 웹 앱 URL 을 붙여넣으세요
   ```

   > 파일을 고치기 어렵다면, 현황판 주소 뒤에 `?server=<웹앱URL>` 를 붙여 한 번 접속해도
   > 그 기기에 저장됩니다. 다만 **전광판·참여자 모두**에게 적용하려면 위처럼 파일에
   > 직접 넣는 쪽이 확실합니다.

접수된 내용은 스프레드시트의 `invites` 시트에 그대로 쌓이므로, 집회가 끝난 뒤
기도제목을 정리하거나 인쇄하기도 쉽습니다. 취소된 초대는 지워지지 않고
`deleted` 열에 표시만 됩니다.

### 목표 개수 바꾸기

`config` 시트의 `goal` 값을 바꾸면 됩니다. (기본 40)
서버 없이 쓸 때는 `index.html` 의 `DEFAULT_GOAL` 을 고치세요.

---

## 2. 페이지 올리기

### Vercel (권장 — 주소가 예쁘고 갱신이 빠릅니다)

1. https://vercel.com 에 **GitHub 계정으로** 로그인
2. **Add New… → Project** → `onnurinoah/holystarmemo` 옆 **Import**
3. 설정 화면에서 손댈 게 없습니다. Framework Preset 이 **Other**, Root Directory 가 `./` 인지만
   확인하고 **Deploy**. 빌드 과정이 없는 정적 페이지라 30초쯤 걸립니다.
4. 나온 주소(`https://holystarmemo.vercel.app` 같은 형태)로 열면 끝입니다.

저장소에 푸시할 때마다 Vercel 이 자동으로 다시 배포합니다.
`vercel.json` 이 현황판을 캐시하지 않도록 잡아두어서, 집회 중에 고친 내용도 새로고침하면 바로 반영됩니다.

> Production Branch 는 저장소의 기본 브랜치를 따라갑니다.
> 다른 브랜치로 배포하려면 Vercel 프로젝트의 **Settings → Git → Production Branch** 에서 바꾸세요.

### GitHub Pages (대안)

저장소 **Settings → Pages → Source: Deploy from a branch** 에서 브랜치를 고르고
루트(`/`)로 지정하면 몇 분 뒤 아래 주소로 열립니다.

```
https://onnurinoah.github.io/holystarmemo/
```

QR은 페이지가 열린 주소를 자동으로 가리킵니다. 다른 주소를 쓰고 싶으면
현황판의 QR 아래 **[ 주소 변경 ]** 을 눌러 직접 지정할 수 있습니다.

### 그 밖

`index.html` 한 파일이 전부입니다. 외부 의존은 구글 폰트와 QR 라이브러리(CDN) 뿐이라
어떤 정적 호스팅(Netlify, Vercel, 학교/교회 서버)에 올려도 그대로 동작합니다.

---

## 3. 집회 당일 운영

- **전광판(빔 프로젝터)**: `https://.../` 를 그냥 엽니다. 4초마다 자동 갱신됩니다.
- **참여자**: 우상단 QR을 스캔 → 초대장 화면(`#invite`)으로 바로 들어갑니다.
- 잘못 보냈을 때는 제출 직후 화면의 **[ 방금 보낸 것 취소 ]** 로 되돌릴 수 있습니다.
- 이름을 공개하기 곤란하면 초대장의 **이름 가리기**를 체크하세요.
  `김○○` 형태로만 저장되고, 전체 이름은 그 기기를 떠나지 않습니다.

> 제출된 이름과 기도제목은 현황판에 그대로 공개됩니다. 안내 멘트에 이 점을 꼭 넣어주세요.
