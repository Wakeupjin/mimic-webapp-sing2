PRD (Product Requirements Document)
영화 미믹킹 훈련 서비스 MVP
1. 프로젝트 개요
프로젝트명: 영화 미믹킹 훈련 서비스
목적: 사용자가 영화 장면을 보면서 배우의 연기를 따라하며 혼자서도 미믹킹을 훈련할 수 있는 웹 서비스
기술 스택:

Next.js
Tailwind CSS
Client-side only (데이터는 constant 변수로 관리)

디자인 컨셉: Notion 스타일의 미니멀하고 단순한 디자인

2. 핵심 기능 요구사항
2.1 영화 선택 페이지 (/)
페이지 목적: 사용자가 훈련할 영화를 선택
UI 구성:

영화 카드 그리드 레이아웃
각 카드 요소:

영화 썸네일 이미지
영화 제목
간단한 설명 (1-2줄)



인터랙션:

카드 클릭 시 /training/[movieId] 페이지로 이동
호버 시 카드 하이라이트 효과

데이터 구조 (constant):
javascriptconst MOVIES = [
  {
    id: 'movie-1',
    title: '영화 제목',
    thumbnail: '/images/thumbnail.jpg',
    description: '영화 설명',
    videoUrl: '/videos/movie.mp4',
    scenes: [...]
  }
]

2.2 훈련 페이지 (/training/[movieId])
페이지 목적: 영화를 보며 미믹킹 훈련 수행
2.2.1 레이아웃 구조
데스크탑:

좌측: 토글 가능한 사이드바
중앙: 비디오 플레이어 + 하단바
전체 화면 중심의 비디오 배치

태블릿/모바일:

사이드바: 오버레이 형태
비디오와 하단바: 세로 배치
터치 인터랙션 최적화

2.2.2 사이드바
기능:

토글 버튼으로 열기/닫기
영화의 전체 문장(구간) 목록 표시
현재 선택된 문장 하이라이트

UI 요소:

토글 버튼 (햄버거 아이콘 또는 화살표)
문장 목록 (스크롤 가능)
각 문장 항목:

문장 번호
문장 텍스트 (한 줄 또는 축약)
선택 상태 표시 (하이라이트)



인터랙션:

문장 클릭 시 비디오가 해당 구간으로 이동
키보드 화살표(←/→)로도 문장 이동 가능

데이터 구조 (constant):
javascriptconst SCENES = [
  {
    id: 'scene-1',
    text: '대사 텍스트',
    startTime: 10.5, // 초 단위
    endTime: 15.2
  }
]
2.2.3 비디오 플레이어
기본 기능:

HTML5 video 태그 사용
기본 컨트롤 표시 (시크바, 볼륨, 재생속도)
재생속도 옵션: 0.5x, 0.75x, 1x, 1.25x, 1.5x

재생/일시정지:

비디오 화면 클릭 시 토글
일시정지 상태:

화면 dimmed 처리 (반투명 검은색 오버레이)
중앙에 "PAUSE" 텍스트 표시


스페이스바로도 토글 가능

현재 문장 텍스트 표시:

위치: 비디오 하단
스타일: 작고 미니멀한 디자인
토글 버튼으로 보기/숨기기 가능
배경: 반투명 처리로 가독성 확보

구간 재생 로직:

문장 선택 시 해당 startTime으로 이동
endTime 도달 시 자동 일시정지 또는 반복

2.2.4 하단바 (8개 재생 버튼)
레이아웃:
[←] [>] [>] [>] [m] [>] [m] [>] [m] [→]
버튼 구성:

좌측: 이전 문장 버튼 [←]
중앙: 8개 재생 버튼

버튼 1-3: 재생 [>]
버튼 4: 무음재생 [m]
버튼 5: 재생 [>]
버튼 6: 무음재생 [m]
버튼 7: 재생 [>]
버튼 8: 무음재생 [m]


우측: 다음 문장 버튼 [→]

버튼 동작:

모든 8개 버튼: 현재 선택된 문장 구간 재생
재생 버튼 [>]: 정상 재생
무음재생 버튼 [m]: muted 상태로 재생
이전/다음 버튼: 문장 목록에서 이동

키보드 단축키:

> 키: 재생 버튼 실행
m 키: 무음재생 버튼 실행
← / → 키: 이전/다음 문장 이동
Space 키: 재생/일시정지

UI 스타일:

정사각형 또는 원형 버튼
미니멀한 아이콘 디자인
호버/액티브 상태 표시
키보드 단축키 힌트 (버튼 위 또는 내부에 작게 표시)


3. 기술 사양
3.1 페이지 라우팅
경로컴포넌트설명/page.tsx영화 선택 페이지/training/[movieId]training/[movieId]/page.tsx훈련 페이지
3.2 컴포넌트 구조
app/
├── page.tsx (영화 선택)
├── training/
│   └── [movieId]/
│       └── page.tsx (훈련 페이지)
├── components/
│   ├── MovieCard.tsx
│   ├── VideoPlayer.tsx
│   ├── Sidebar.tsx
│   ├── PlaybackControls.tsx (8개 버튼 하단바)
│   └── SceneList.tsx
└── constants/
    └── movies.ts (영화 데이터)
3.3 상태 관리
React State 사용:

currentSceneIndex: 현재 선택된 문장 인덱스
isSidebarOpen: 사이드바 열림/닫힘 상태
isTextVisible: 문장 텍스트 표시 여부
videoRef: 비디오 엘리먼트 참조

3.4 데이터 구조
typescript// constants/movies.ts

interface Scene {
  id: string;
  text: string;
  startTime: number; // 초 단위
  endTime: number;
}

interface Movie {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  videoUrl: string;
  scenes: Scene[];
}

export const MOVIES: Movie[] = [
  // 영화 데이터
];

4. UI/UX 가이드라인
4.1 디자인 원칙

Notion 스타일의 미니멀리즘
여백과 타이포그래피 중심
불필요한 장식 최소화
깔끔한 화면 유지

4.2 색상 팔레트

배경: 화이트 / 다크 그레이
텍스트: 블랙 / 다크 그레이
액센트: 포인트 컬러 1-2개 (버튼, 하이라이트)
오버레이: 반투명 검은색 (dimmed)

4.3 타이포그래피

제목: 24-32px, 볼드
본문: 14-16px, 레귤러
작은 텍스트: 12px (현재 문장 표시)

4.4 반응형 브레이크포인트

Desktop: 1024px 이상
Tablet: 768px - 1023px
Mobile: 767px 이하


5. 주요 사용자 플로우
5.1 기본 훈련 플로우
1. 홈페이지 접속
   ↓
2. 영화 카드 클릭
   ↓
3. 훈련 페이지 진입
   ↓
4. 첫 번째 문장 자동 선택
   ↓
5. 8개 버튼 중 하나 클릭하여 재생
   ↓
6. 영상 보며 미믹킹 연습
   ↓
7. 다음 문장으로 이동 (→ 버튼 또는 화살표 키)
   ↓
8. 반복
5.2 사이드바 사용 플로우
1. 토글 버튼 클릭
   ↓
2. 문장 목록 확인
   ↓
3. 특정 문장 클릭
   ↓
4. 해당 구간으로 비디오 이동
   ↓
5. 사이드바 닫기 (선택사항)

6. 성능 및 최적화
6.1 비디오 최적화

적절한 해상도 및 비트레이트
프리로드 설정: preload="metadata"
비디오 포맷: MP4 (H.264)

6.2 반응형 이미지

Thumbnail 최적화
Next.js Image 컴포넌트 사용

6.3 코드 최적화

컴포넌트 메모이제이션
불필요한 리렌더링 방지


7. 접근성 (Accessibility)

키보드 네비게이션 지원
포커스 인디케이터 명확하게
ARIA 레이블 적용
색상 대비 비율 준수 (WCAG AA)


8. 향후 확장 가능성 (Post-MVP)

사용자 녹음 기능
진행 상태 추적 및 저장
여러 영화 추가
난이도별 문장 필터링
소셜 공유 기능