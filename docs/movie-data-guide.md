# 🎬 영화 데이터 생성 가이드

> AI에게 이 문서와 템플릿을 복붙하면 새로운 영화 데이터를 자동으로 만들 수 있습니다.

---

## 📋 목차

1. [개요](#개요)
2. [자동 생성 프로세스 (권장)](#자동-생성-프로세스-권장)
3. [JSON 구조 설명](#json-구조-설명)
4. [필드 규칙](#필드-규칙)
5. [AI 프롬프트 템플릿 (수동)](#ai-프롬프트-템플릿-수동)
6. [예시](#예시)

---

## 🎯 개요

이 프로젝트는 영화 영어 학습 앱으로, 다음 3가지 모드를 제공합니다:

- **Watching (워칭)**: 영화 구간을 시청하는 모드
- **Mimicking (미믹킹)**: 문장을 듣고 따라 말하는 모드 (30개 문장)
- **Guessing (게싱)**: 영상을 보고 대사를 맞추는 모드 (10개 문제)

각 영화는 **12회차**로 구성되며, 각 회차마다 30개의 미믹킹 문장과 10개의 게싱 문제가 있습니다.

---

## 🤖 자동 생성 프로세스 (권장)

### 필요한 파일
1. **영화 MP4 파일** (`/videos/영화명.mp4`)
2. **SRT 자막 파일** (`/movies/영화명/영화명.srt`)
3. **포스터 이미지** (URL)

### 자동 생성 단계

#### 1단계: 영화 정보 파일 생성
`public/movies/영화명.json` 수동 작성:
```json
{
  "id": "002",
  "title": "영화 제목",
  "url": "/videos/영화명.mp4",
  "poster": "포스터 URL",
  "totalLessons": 12
}
```

#### 2단계: Python 스크립트 실행
```bash
python3 scripts/generate_lessons_from_srt.py
```

**스크립트가 자동으로 처리:**
- SRT 파일 파싱 (전체 자막 읽기)
- 노래(♪), 효과음, 두 사람 한 줄, 잘린 문장 제외
- 쓸 만한 대화를 시간순으로 모은 뒤 **30개씩 12묶음**
- 시계로 영화를 12등분하지 않음 (노래 구간에 수업이 걸리지 않게)
- 각 묶음의 첫~마지막 문장이 watching 구간
- fullSubtitles 자동 추출
- guessing / word 는 그 회차 미믹 30개에서 생성
- lesson-1.json ~ lesson-12.json 생성
- 기존 수동 선별본은 `original/` 폴더에 보관

#### 3단계: 검수
- [ ] lesson-1.json 첫 자막 "Mimicking is Fun" 확인
- [ ] watching 구간 시작/종료 시간 확인
- [ ] 문장 품질 체크
- [ ] 비디오 싱크 테스트

**✅ 장점:**
- 10분 내 전체 12회차 생성
- 일관된 품질
- 휴먼 에러 최소화

---

## 📊 파일 구조 (운영 최적화!)

### 구조 개요
```
public/movies/
  ├── {영화이름}.json              # 영화 기본 정보
  └── {영화이름}/
      ├── lesson-1.json            # 1회차 데이터
      ├── lesson-2.json            # 2회차 데이터
      └── ...                      # 최대 12회차
```

### 1. 영화 정보 파일 (`{영화이름}.json`)

```json
{
  "id": "001",
  "title": "Sing2",
  "url": "/videos/sing2.mp4",
  "poster": "포스터 이미지 URL",
  "totalLessons": 12
}
```

### 2. 회차별 데이터 파일 (`{영화이름}/lesson-{n}.json`)

```json
{
  "watching": {
    "start": "시작 시간",
    "end": "종료 시간"
  },
  "fullSubtitles": [
    { "start": "00:00:00,000", "end": "00:00:05,000", "text": "Mimicking is Fun" },
    { "start": "00:00:27,345", "end": "00:00:30,148", "text": "♪ Illumination... ♪" }
    // watching 구간의 전체 자막 (~100-200개)
  ],
  "mimicking": [
    { "start": "...", "end": "...", "text": "대사" }
    // 30개
  ],
  "guessing": [
    {
      "question": 문제번호,
      "correctAnswer": "정답",
      "options": [
        { "label": "A", "text": "...", "start": "...", "end": "..." },
        { "label": "B", "text": "...", "start": "...", "end": "..." },
        { "label": "C", "text": "...", "start": "...", "end": "..." }
      ],
      "video": { "start": "...", "end": "..." }
    }
    // 10개
  ]
}
```

**💡 이 구조의 장점:**
- 필요한 회차만 로드 (빠른 로딩)
- 네트워크 비용 절감
- 회차 추가/수정 용이
- 버전 관리 편함

---

## 📏 필드 규칙

### 1. 시간 형식

**SRT 자막 형식**을 사용합니다: `HH:MM:SS,mmm`

예시:
- `00:01:43,721` = 1분 43.721초
- `00:00:00,000` = 0초

### 2. watching 필드 규칙

회차는 **러닝타임을 12등분한 결과가 아닙니다.**  
먼저 대화 문장을 고르고, 30개씩 묶은 뒤 그 묶음의 시간 범위를 watching으로 씁니다.

| 회차 | start 규칙 | end 규칙 | 목적 |
|------|------------|----------|------|
| **1회차** | `00:00:00,000` (영화 처음부터) | 마지막 mimicking의 end 값 | 오프닝 포함 분위기 파악 |
| **2~12회차** | 첫 번째 mimicking의 start 값 | 마지막 mimicking의 end 값 | 이 회차 30문장이 있는 구간 |

노래·공연처럼 대사가 없는 시간은 watching 안에 포함될 수 있지만, mimicking에는 넣지 않습니다.

**💡 1회차가 특별한 이유:**
- 학습자가 전체 영화의 흐름과 분위기를 파악할 수 있도록 처음부터 시청
- 오프닝, 제작사 로고 등을 포함하여 완전한 경험 제공
- 미믹킹할 문장들의 컨텍스트 이해
- 2회차부터는 학습 효율성을 위해 바로 핵심 구간으로 시작

**예시:**

```json
// 1회차
"watching": {
  "start": "00:00:00,000",  // 0초부터 시작
  "end": "00:06:41,500"     // 마지막 미믹킹 끝 시간
}

// 2회차
"watching": {
  "start": "00:01:43,721",  // 첫 번째 미믹킹 시작 시간
  "end": "00:06:41,500"     // 마지막 미믹킹 끝 시간
}
```

### 3. fullSubtitles 필드 규칙

- **watching 구간의 전체 자막** (모든 대사 포함)
- watching 모드에서 CC 버튼 활성화 시 표시
- 노래 가사(♪)도 포함 (사용자 경험을 위해)
- 대화뿐만 아니라 배경음, 음악 가사 모두 포함
- SRT 파일에서 watching 구간만 필터링하여 자동 생성
- 평균 100~200개 자막

**💡 1회차 특별 처리:**
- 첫 번째 자막(0~5초)을 `"Mimicking is Fun"`으로 변경
- 브랜딩 메시지로 활용

```json
{
  "start": "00:00:00,000",
  "end": "00:00:05,000",
  "text": "Mimicking is Fun"
}
```

### 4. mimicking 필드 규칙

- 각 회차마다 **정확히 30개**의 문장
- 영화에서 실제로 사용된 **한 사람의 완전한 대화**만
- 시간 순서대로 정렬
- 3~12 단어, 길이 약 1.2~6초
- `. ? !` 로 끝나는 문장 선호

**넣지 않기:**
- 노래 가사(`♪`)
- 효과음 (`[crowd]`, `(sighs)`)
- 자막 워터마크 (`Downloaded from...`)
- 두 사람이 한 줄에 나온 대사 (`- A - B`)
- 소문자로 시작하는 잘린 말
- 쉼표/`and`/`like` 로만 끝나는 조각

**선별 순서:**
1. 영화 전체에서 위 조건을 통과한 대사를 시간순으로 모은다
2. 전체를 고르게 30×12 = 360개 고른다
3. 앞에서부터 30개씩 회차에 넣는다

```json
{
  "start": "00:01:43,721",
  "end": "00:01:46,124",
  "text": "Oh, my gosh."
}
```

### 5. guessing 필드 규칙

- 각 회차마다 **정확히 10개**의 문제
- 정답·오답 모두 **그 회차 mimicking 30개**에서만 고른다
- 각 문제는 3지선다 (A, B, C)
- `correctAnswer`는 정답 라벨 ("A", "B", "C")
- `video`는 정답 영상의 시작/종료 시간
- 오답 보기는 다른 미믹킹 문장에서 선택 (다른 장면 소리가 나는 것이 정상)

### 6. word 필드 규칙

- 각 회차마다 **10개**
- mimicking 30개 중 **게싱 정답으로 쓰지 않은 문장**에서 고른다
- `{ question, start, end, text }`

```json
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
```

---

## 🤖 AI 프롬프트 템플릿 (수동)

> **⚠️  참고:** 자동 생성 스크립트 사용을 권장합니다. 이 템플릿은 레퍼런스용입니다.

AI에게 다음 프롬프트와 템플릿을 복사해서 보여주세요:

### 프롬프트

```
아래 JSON 템플릿을 참고해서 [영화 제목]의 데이터를 만들어줘.

요구사항:
1. 12회차 전부 만들기 (lesson 배열에 12개 객체)
2. 각 회차마다 mimicking 30개, guessing 10개
3. 1회차 watching.start는 반드시 "00:00:00,000"
4. 2~12회차 watching.start는 해당 회차 첫 mimicking.start와 동일
5. 모든 회차의 watching.end는 해당 회차 마지막 mimicking.end와 동일
6. 시간 형식은 SRT 형식 (HH:MM:SS,mmm)
7. _comment 필드는 모두 제거하고 깨끗한 JSON으로 만들기
8. 영화 정보 채우기:
   - video.id: "[영화ID]"
   - video.title: "[영화 제목]"
   - video.url: "/videos/[영화파일명].mp4"
   - video.poster: "[포스터 이미지 URL]"
```

### JSON 템플릿 (복사해서 AI에게 보여주세요)

```json
{
  "_comment_usage": "==== 이 템플릿 사용법 ====",
  "_comment_usage_desc": "AI에게 이 파일 전체를 복사해서 보여주고, '이 형식대로 [영화 이름]의 데이터를 만들어줘. 미믹킹 문장 30개, 게싱 문제 10개로 12회차 전부 만들어줘'라고 요청하세요.",
  
  "_comment_structure": "==== JSON 구조 설명 ====",
  "_comment_structure_video": "video: 영화 기본 정보",
  "_comment_structure_lesson": "lesson: 12개의 회차 배열. 각 회차마다 watching(시청 범위), mimicking(따라말하기 30개), guessing(맞추기 10개) 포함",
  
  "_comment_watching": "==== watching 필드 규칙 ====",
  "_comment_watching_rule1": "1회차: start는 항상 '00:00:00,000' (0초부터 시작)",
  "_comment_watching_rule2": "2~12회차: start는 해당 회차의 첫 번째 mimicking의 start 값과 동일",
  "_comment_watching_rule3": "모든 회차: end는 해당 회차의 마지막 mimicking의 end 값과 동일",
  
  "_comment_mimicking": "==== mimicking 필드 규칙 ====",
  "_comment_mimicking_desc": "각 회차마다 30개의 문장. start/end는 SRT 시간 형식(HH:MM:SS,mmm), text는 영어 대사",
  
  "_comment_guessing": "==== guessing 필드 규칙 ====",
  "_comment_guessing_desc": "각 회차마다 10개의 문제. 각 문제는 3지선다(A, B, C). correctAnswer는 정답 라벨. video는 정답 영상의 시간 범위",
  
  "_comment_time_format": "==== 시간 형식 ====",
  "_comment_time_format_desc": "SRT 자막 형식: HH:MM:SS,mmm (예: 00:01:43,721 = 1분 43.721초)",

  "id": "001:1",
  "video": {
    "id": "001",
    "title": "Sing2",
    "url": "/videos/sing2.mp4",
    "poster": "https://i0.wp.com/www.nerdsandbeyond.com/wp-content/uploads/2021/11/sing-2-cover-image.jpg?fit=800%2C402&ssl=1"
  },
  "lesson": [
    {
      "_comment_lesson1": "==== 1회차 ====",
      "_comment_lesson1_watching": "1회차는 0초부터 시작! start: 00:00:00,000",
      "watching": {
        "start": "00:00:00,000",
        "end": "00:06:41,500"
      },
      "mimicking": [
        { "start": "00:01:43,721", "end": "00:01:46,124", "text": "Oh, my gosh." },
        { "start": "00:04:36,960", "end": "00:04:38,096", "text": "What's going on?" },
        { "start": "00:04:38,190", "end": "00:04:40,498", "text": "No time to explain. Run away." }
        // ... 27개 더 (총 30개)
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
        // ... 9개 더 (총 10개)
      ]
    },
    {
      "_comment_lesson2": "==== 2회차 ====",
      "_comment_lesson2_watching": "2회차부터는 첫 미믹킹 start부터 시작! start: 00:01:43,721",
      "watching": {
        "start": "00:01:43,721",
        "end": "00:06:41,500"
      },
      "mimicking": [
        { "start": "00:01:43,721", "end": "00:01:46,124", "text": "Oh, my gosh." }
        // ... 29개 더 (총 30개)
      ],
      "guessing": [
        {
          "question": 1,
          "correctAnswer": "A",
          "options": [
            { "label": "A", "text": "...", "start": "...", "end": "..." },
            { "label": "B", "text": "...", "start": "...", "end": "..." },
            { "label": "C", "text": "...", "start": "...", "end": "..." }
          ],
          "video": { "start": "...", "end": "..." }
        }
        // ... 9개 더 (총 10개)
      ]
    }
    // ... 3~12회차도 2회차와 동일한 구조
  ],
  
  "_comment_instruction": "==== AI에게 전달할 지시사항 ====",
  "_instruction_1": "위 형식을 참고하여 새로운 영화 데이터를 만들어주세요.",
  "_instruction_2": "lesson 배열에 12개의 회차를 모두 만들어주세요.",
  "_instruction_3": "각 회차마다 mimicking 30개, guessing 10개를 만들어주세요.",
  "_instruction_4": "1회차 watching.start는 00:00:00,000, 2~12회차는 첫 mimicking.start와 동일하게 해주세요.",
  "_instruction_5": "모든 watching.end는 마지막 mimicking.end와 동일하게 해주세요.",
  "_instruction_6": "_comment로 시작하는 필드는 설명용이므로 실제 데이터에는 제거하고 만들어주세요."
}
```

---

## 💡 예시

### Sing2 영화를 예시로 설명

**1회차 watching 설정:**
```json
{
  "watching": {
    "start": "00:00:00,000",  // 1회차는 0초부터!
    "end": "00:06:41,500"
  },
  "mimicking": [
    { "start": "00:01:43,721", "end": "00:01:46,124", "text": "Oh, my gosh." },
    // ... 29개 더
    { "start": "00:06:38,483", "end": "00:06:41,500", "text": "I'm not staying for the second half, so..." }
  ]
}
```

**2회차 watching 설정:**
```json
{
  "watching": {
    "start": "00:01:43,721",  // 2회차부터는 첫 미믹킹 start!
    "end": "00:06:41,500"
  },
  "mimicking": [
    { "start": "00:01:43,721", "end": "00:01:46,124", "text": "Oh, my gosh." },
    // ... 29개 더
  ]
}
```

---

## ✅ 체크리스트

새로운 영화 데이터를 만들 때 확인하세요:

- [ ] 12회차 모두 생성했는가?
- [ ] 각 회차마다 mimicking 30개, guessing 10개, word 10개인가?
- [ ] 시계 12등분이 아니라 대화 30개 묶음인가?
- [ ] 1회차 watching.start가 "00:00:00,000"인가?
- [ ] 2~12회차 watching.start가 첫 mimicking.start와 동일한가?
- [ ] 모든 watching.end가 마지막 mimicking.end와 동일한가?
- [ ] 미믹 문장에 ♪, 두 사람 한 줄, 잘린 말이 없는가?
- [ ] 시간 형식이 SRT 형식(HH:MM:SS,mmm)인가?
- [ ] JSON이 유효한가?

---

## 📁 파일 저장 위치

생성된 JSON 파일은 다음 위치에 저장하세요:

### 영화 정보 파일
```
public/movies/{영화이름}.json
```

### 회차별 데이터 파일
```
public/movies/{영화이름}/lesson-{n}.json
```

예시 (Sing2):
```
public/movies/
  ├── sing2.json                # 영화 정보
  └── sing2/
      ├── lesson-1.json         # 1회차
      ├── lesson-2.json         # 2회차
      ├── ...
      └── lesson-12.json        # 12회차
```

예시 (Frozen):
```
public/movies/
  ├── frozen.json               # 영화 정보
  └── frozen/
      ├── lesson-1.json
      └── ...
```

---

## 🔗 관련 파일

- `docs/movie-data-guide.md` - 이 가이드 문서 (템플릿 포함)
- `scripts/generate_lessons_from_srt.py` - 자막에서 12회차 생성
- `public/movies/sing2/original/` - 수동 선별 원본
- `public/movies/sing2.json` - 영화 정보 예시
- `public/movies/sing2/lesson-1.json` - 1회차 데이터

---

**마지막 업데이트:** 2025년 10월 6일

