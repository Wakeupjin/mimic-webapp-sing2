# PRD (Product Requirements Document)
# 영화 영어 학습 서비스 "Mimicking"

## 1. 프로젝트 개요

**프로젝트명:** Mimicking (미믹킹)  
**목적:** 영화를 통해 영어를 학습하는 3단계 학습 시스템  
**버전:** v2.0 (2024.10)  
**최종 업데이트:** 2024.10.06

### 기술 스택
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Client-side rendering
- JSON 기반 콘텐츠 관리

### 디자인 컨셉
Notion 스타일의 미니멀하고 단순한 디자인

---

## 2. 핵심 학습 시스템

### 2.1 학습 구조 개요

각 영화는 **12회차**로 구성되며, 각 회차는 **3가지 모드**를 제공합니다:

1. **Watching (워칭)** - 영상 시청 + 전체 자막
2. **Mimicking (미믹킹)** - 30개 핵심 문장 따라하기
3. **Guessing (게싱)** - 10개 퀴즈 문제

**총 학습량:**
- 전체: 12회차 × 30문장 = 360개 문장
- 각 회차: 30개 문장 학습
- 추가: 774개 번외 문장 (lesson-additional.json)

### 2.2 데이터 구조

#### 영화 메타데이터 (`public/movies/sing2.json`)
```json
{
  "id": "001",
  "title": "Sing2",
  "url": "/videos/sing2.mp4",
  "poster": "https://...",
  "totalLessons": 12
}
```

#### 레슨 데이터 (`public/movies/sing2/lesson-1.json`)
```json
{
  "watching": {
    "start": "00:00:00,000",
    "end": "00:08:01,132"
  },
  "fullSubtitles": [
    { "start": "00:00:00,000", "end": "00:00:05,000", "text": "Mimicking is Fun" },
    { "start": "00:00:27,345", "end": "00:00:30,148", "text": "♪ Illumination... ♪" }
  ],
  "mimicking": [
    { "start": "00:01:43,721", "end": "00:01:46,124", "text": "Oh, my gosh." },
    { "start": "00:04:36,960", "end": "00:04:38,096", "text": "What's going on?" }
  ],
  "guessing": [
    {
      "question": 1,
      "correctAnswer": "A",
      "options": [
        { "label": "A", "text": "Oh, my gosh.", "start": "00:01:43,721", "end": "00:01:46,124" },
        { "label": "B", "text": "Dream big dreams.", "start": "00:05:50,134", "end": "00:05:52,167" },
        { "label": "C", "text": "Uh, Suki? Suki Lane?", "start": "00:06:31,109", "end": "00:06:32,790" }
      ],
      "video": { "start": "00:01:43,721", "end": "00:01:46,124" }
    }
  ]
}
```

### 2.3 파일 구조
```
public/movies/
  ├── sing2.json                    # 영화 메타데이터
  └── sing2/
      ├── sing2.srt                 # 원본 SRT 자막
      ├── lesson-1.json             # 1회차 (30문장)
      ├── lesson-2.json             # 2회차 (30문장)
      ├── ...
      ├── lesson-12.json            # 12회차 (30문장)
      └── lesson-additional.json    # 번외용 (774문장)
```

### 2.4 자동 생성 규칙

**문장 선별 기준:**
- 노래 가사(♪) 제외
- 3~9 단어 범위
- 순수 대화 대사만
- 영화 전체에서 고르게 분산

**watching 구간 규칙:**
- 1회차: `start: "00:00:00,000"` (0초부터 시작 - 전체 개요)
- 2~12회차: `start: 첫 mimicking 문장의 start`
- 모든 회차: `end: 마지막 mimicking 문장의 end`

---

## 3. 페이지 구조

### 3.1 홈 페이지 (`/`)
- 영화 목록 그리드
- 각 영화 카드: 포스터, 제목, 설명
- 클릭 시 레슨 선택 페이지로 이동

### 3.2 레슨 선택 페이지 (`/[movieId]`)
- 12개 레슨 카드 표시
- 각 레슨: 회차 번호, 진행 상태
- 클릭 시 레슨 페이지로 이동 (`/[movieId]/lesson?id=001:1`)

### 3.3 레슨 페이지 (`/[movieId]/lesson`)

**URL 파라미터:**
- `id`: movieId (예: "001:1" = Sing2 1회차)

**3가지 모드를 순차적으로 제공:**

---

## 4. 모드별 상세 기능

### 4.1 Watching 모드 (워칭)

**목적:** 영화 구간을 시청하며 전체 맥락 파악

**UI 구성:**
- 전체 화면 비디오 플레이어
- 하단 재생 컨트롤
  - 재생/일시정지
  - 진행률 바 (드래그 가능)
  - CC 버튼 (자막 on/off)
  - 재생속도 (0.75x, 1x, 1.25x, 1.5x, 2x)
  - 전체화면
- 자막 오버레이 (CC 활성화 시)

**기능:**
- `fullSubtitles` 배열 기반 자막 표시
- 현재 시간에 맞는 자막 자동 표시
- 구간: `watching.start ~ watching.end`
- 구간 종료 시 "다음 단계" CTA 표시

**진행률 바 드래그:**
- 마우스 다운 시 드래그 시작
- 전역 이벤트 리스너로 화면 전체에서 드래그 가능
- 마우스 업 시 드래그 종료
- 실시간 시간 툴팁 표시

**다음 단계:**
- "Start Mimicking" 버튼 클릭 → Mimicking 모드 진입

---

### 4.2 Mimicking 모드 (미믹킹)

**목적:** 30개 핵심 문장을 반복 연습

**UI 구성:**
- 상단: 진행률 (1/30, 2/30, ...)
- 중앙: 비디오 플레이어 + 현재 문장 텍스트
- 하단: 10개 재생 버튼
  ```
  [←] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [→]
  ```

**버튼 기능:**
- `[←]` 이전 문장
- `[1-10]` 현재 문장 재생 (10번 반복 가능)
  - 1-3번: 일반 재생
  - 4번: 무음 재생
  - 5-7번: 일반 재생
  - 8번: 무음 재생
  - 9-10번: 일반 재생
- `[→]` 다음 문장

**재생 로직:**
- 각 버튼 클릭 시 `mimicking[currentIndex]` 구간 재생
- `video.currentTime = startTime`
- `endTime` 도달 시 자동 일시정지
- 무음 버튼: `video.muted = true`

**키보드 단축키:**
- `Space`: 재생/일시정지
- `1-9, 0`: 버튼 1-10 실행
- `←/→`: 이전/다음 문장

**다음 단계:**
- 30개 완료 시 "Start Guessing" 버튼 → Guessing 모드 진입

---

### 4.3 Guessing 모드 (게싱)

**목적:** 영상만 보고 대사 맞추기 퀴즈

**UI 구성:**
- 상단: 진행률 (1/10, 2/10, ...)
- 중앙: 비디오 플레이어 (음소거 + 자막 없음)
- 하단: 3지선다 버튼 (A, B, C)

**퀴즈 로직:**
1. `guessing[currentIndex].video` 구간 재생 (무음)
2. 3개 옵션 표시 (`options` 배열)
3. 사용자 선택
4. 정답 여부 표시 (`correctAnswer`와 비교)
5. 정답 영상 재생 (소리 있음)
6. 다음 문제로 이동

**피드백:**
- 정답: ✅ 초록색 하이라이트
- 오답: ❌ 빨간색 하이라이트 + 정답 표시

**다음 단계:**
- 10개 완료 시:
  - 점수 표시 (예: 8/10)
  - "다음 레슨으로" 버튼 → 다음 회차로 이동
  - "레슨 선택으로" 버튼 → 레슨 목록으로

---

## 5. 기술 사양

### 5.1 프로젝트 구조
```
app/
├── page.tsx                          # 홈 (영화 목록)
├── [movieId]/
│   ├── page.tsx                      # 레슨 선택
│   └── lesson/
│       └── page.tsx                  # 메인 레슨 페이지
├── components/
│   ├── VideoPlayer.tsx               # 비디오 플레이어
│   ├── PlaybackControls.tsx          # 재생 컨트롤
│   ├── MimickingControls.tsx         # 미믹킹 버튼
│   └── GuessingQuiz.tsx              # 게싱 퀴즈
└── constants/
    ├── movies.ts                     # 영화 데이터 로드
    └── lesson.ts                     # 레슨 데이터 타입
```

### 5.2 상태 관리 (React State)

**전역 상태:**
- `currentMode`: 'watching' | 'mimicking' | 'guessing'
- `movieData`: 현재 로드된 레슨 데이터
- `movieId`: URL 파라미터 (예: "001:1")

**Watching 모드:**
- `isPlaying`: boolean
- `videoProgress`: number (0-100)
- `currentTime`: number
- `isTextVisible`: boolean (CC 버튼)
- `playbackRate`: number

**Mimicking 모드:**
- `currentSentenceIndex`: number (0-29)
- `totalSentences`: 30

**Guessing 모드:**
- `currentQuestionIndex`: number (0-9)
- `score`: number
- `selectedAnswer`: string | null
- `showFeedback`: boolean

### 5.3 데이터 로딩

**동적 로딩 (`loadMovie` 함수):**
```typescript
async function loadMovie(movieId: string) {
  const [movieCode, lessonNum] = movieId.split(":");
  
  // 영화 정보 + 레슨 데이터 fetch
  const movieInfo = await fetch(`/movies/${movieCode}.json`);
  const lessonData = await fetch(`/movies/${movieCode}/lesson-${lessonNum}.json`);
  
  return { ...movieInfo, lesson: [lessonData] };
}
```

### 5.4 유틸리티 함수

**SRT 시간 변환:**
```typescript
function srtTimeToSeconds(time: string): number {
  // "00:01:43,721" → 103.721
  const [h, m, s] = time.replace(',', '.').split(':');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
}
```

---

## 6. 콘텐츠 생성 프로세스

### 6.1 필요한 소스
1. 영화 MP4 파일
2. 영화 SRT 자막 파일
3. 포스터 이미지

### 6.2 자동 생성 스크립트

**Python 스크립트:**
1. `parse_srt.py`: SRT 파싱
2. `generate_all_lessons.py`: 12개 레슨 자동 생성
3. `collect_additional.py`: 번외 문장 수집

**생성 과정:**
1. SRT 파일 파싱 (2,072개 자막)
2. 노래(♪) 제외 (532개 제거)
3. 3-9 단어 범위 필터링 (1,145개 선별)
4. 12개 구간으로 균등 분할
5. 각 구간에서 30개씩 고르게 선별 (360개)
6. fullSubtitles 자동 추출
7. guessing 문제 자동 생성 (각 10개)
8. 나머지 문장 additional로 저장 (774개)

### 6.3 수동 검수 항목
- [ ] 1회차 첫 자막 "Mimicking is Fun" 확인
- [ ] watching 구간 시작/종료 시간 확인
- [ ] 문장 품질 체크 (욕설, 부적절한 내용)
- [ ] 비디오 싱크 확인

---

## 7. UI/UX 가이드라인

### 7.1 디자인 원칙
- Notion 스타일 미니멀리즘
- 여백과 타이포그래피 중심
- 불필요한 장식 최소화
- 직관적인 네비게이션

### 7.2 색상 팔레트
- **배경:** White / Dark Gray
- **텍스트:** Black / Dark Gray
- **액센트:** Blue (버튼, 하이라이트)
- **성공:** Green (정답)
- **오류:** Red (오답)
- **오버레이:** rgba(0, 0, 0, 0.7)

### 7.3 타이포그래피
- **제목:** 24-32px, Bold
- **본문:** 16px, Regular
- **자막:** 18px, Medium
- **버튼:** 14px, Medium

### 7.4 반응형 브레이크포인트
- **Desktop:** 1024px 이상
- **Tablet:** 768px - 1023px
- **Mobile:** 767px 이하 (미지원 권장)

---

## 8. 주요 사용자 플로우

### 8.1 기본 학습 플로우
```
1. 홈 페이지 접속
   ↓
2. 영화 선택 (Sing2)
   ↓
3. 레슨 선택 (1회차)
   ↓
4. Watching 모드
   - 영상 시청 (0초 ~ 8분)
   - CC 버튼으로 자막 확인
   - "Start Mimicking" 클릭
   ↓
5. Mimicking 모드
   - 30개 문장 반복 연습
   - 10개 버튼으로 문장 반복
   - "Start Guessing" 클릭
   ↓
6. Guessing 모드
   - 10개 퀴즈 풀기
   - 점수 확인
   - 다음 레슨으로 이동
```

### 8.2 진도 관리 (향후 구현)
- Local Storage에 진행 상태 저장
- 마지막 학습 위치 자동 복원
- 완료한 레슨 체크 표시

---

## 9. 성능 최적화

### 9.1 비디오 최적화
- 적절한 해상도 (720p 권장)
- H.264 코덱
- `preload="metadata"`
- 구간 재생 최적화 (`currentTime` 설정)

### 9.2 데이터 로딩
- 레슨 데이터 동적 로딩 (필요시에만)
- JSON 파일 크기 최적화 (평균 29KB)
- 이미지 lazy loading

### 9.3 렌더링 최적화
- React.memo 사용
- 불필요한 리렌더링 방지
- 이벤트 리스너 정리 (useEffect cleanup)

---

## 10. 접근성 (Accessibility)

- 키보드 네비게이션 전체 지원
- 포커스 인디케이터 명확히
- ARIA 레이블 적용
- 색상 대비 비율 준수 (WCAG AA)
- 자막 크기 조절 가능

---

## 11. 향후 확장 계획 (Post-MVP)

### 11.1 단기 (1-3개월)
- [ ] Word 모드 추가 (단어 학습)
- [ ] 사용자 녹음 기능
- [ ] 진행 상태 저장/로드
- [ ] 더 많은 영화 추가

### 11.2 중기 (3-6개월)
- [ ] 사용자 계정 시스템
- [ ] 학습 통계 대시보드
- [ ] 소셜 공유 기능
- [ ] 모바일 앱 (React Native)

### 11.3 장기 (6-12개월)
- [ ] AI 발음 평가
- [ ] 커뮤니티 기능
- [ ] 프리미엄 콘텐츠
- [ ] 다국어 지원

---

## 12. 기술 제약사항

### 12.1 브라우저 지원
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

### 12.2 시스템 요구사항
- 최소 2GB RAM
- 안정적인 인터넷 연결 (비디오 스트리밍)
- 권장 화면 크기: 1024px 이상

### 12.3 콘텐츠 제약
- 비디오 파일 크기: 최대 2GB
- JSON 파일: 최대 100KB
- 레슨당 문장 수: 고정 30개
- 퀴즈 수: 고정 10개

---

## 부록: 용어 정의

- **Watching:** 영상 시청 모드
- **Mimicking:** 문장 따라하기 모드
- **Guessing:** 퀴즈 모드
- **Lesson:** 회차 (1-12)
- **Scene:** 문장 (구 용어, 현재는 Sentence 사용)
- **fullSubtitles:** watching 구간의 전체 자막
- **SRT:** SubRip Text (자막 파일 형식)

---

**문서 버전:** 2.0  
**작성일:** 2024.10.06  
**다음 리뷰:** 필요시 업데이트
