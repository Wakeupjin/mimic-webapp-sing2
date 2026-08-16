// 미믹킹 모드 상수
export const MIMICKING_REPEAT_COUNT = 8; // 반복 횟수
export const MIMICKING_SEQUENCE_DELAY = 1000; // 시퀀스 간 딜레이 (ms)
export const MIMICKING_NEXT_SENTENCE_DELAY = 1000; // 다음 문장으로 이동 딜레이 (ms)
export const MIMICKING_SEQUENCE_LAST_INDEX = 7; // 0-based last index for 8-step sequence
export const MIMICKING_ACTIVE_GREEN_INDICES = [3, 5, 7] as const; // indices that highlight green
export const MIMICKING_LAST_SENTENCE_INDEX = 29; // 30 sentences (0-29)
export const MIMICKING_FULLSCREEN_SCALE = 1.2; // fullscreen scale factor
export const MIMICKING_FULLSCREEN_MARGIN_LEFT_PX = 130; // left margin in px when fullscreen
export const MIMICKING_CONTROLS_MARGIN_TOP_PX = -20; // controls block margin-top in px

// Watching page constants
export const WATCHING_VIDEO_DURATION_SECONDS = 401.5; // total video duration for progress bar
export const WATCHING_NAVIGATION_DELAY_MS = 100; // delay before navigation after sessionStorage

// Selecting page constants
export const SELECTING_CHAPTER_COUNT = 12; // total number of chapters
export const SELECTING_DROPDOWN_MAX_HEIGHT_PX = 200; // dropdown max height
export const SELECTING_SCROLL_THRESHOLD_PX = 10; // scroll detection threshold

// 게싱 모드 상수
export const GUESSING_VIDEO_PLAYS = 3; // 무음 영상 재생 횟수
export const GUESSING_AUTO_PLAY_DELAY = 1250; // A/B/C 자동 재생 시작 전 딜레이 (ms)
export const GUESSING_ANSWER_FEEDBACK_DURATION = 2000; // "Correct" 또는 "Again" 표시 시간 (ms)
export const GUESSING_NEXT_QUESTION_DELAY = 500; // 다음 문제로 이동 딜레이 (ms)
export const GUESSING_VIDEO_REPLAY_DELAY = 250; // 무음 영상 반복 간 딜레이 (ms)
export const GUESSING_OPTION_LABELS = ['A', 'B', 'C'] as const; // Guessing options order

// 비디오 플레이어 상수
export const VIDEO_LOAD_DELAY = 100; // 비디오 로딩 딜레이 (ms)
export const VIDEO_SEGMENT_END_CHECK_INTERVAL = 50; // 구간 종료 체크 간격 (ms)
export const VIDEO_DEBOUNCE_DELAY = 500; // 중복 재생 방지 디바운스 (ms)
export const VIDEO_SUPPRESS_END_CHECK_DURATION = 500; // seek 후 종료 체크 억제 시간 (ms)
export const VIDEO_ONPLAY_TIMEOUT = 1000; // onPlay 이벤트 대기 최대 시간 (ms)
export const VIDEO_ONPLAY_BUTTON_DELAY = 200; // onPlay 후 버튼 색상 변경 딜레이 (ms)
export const VIDEO_END_THRESHOLD = 0.001; // segment end detection threshold (seconds)

// 오디오 재시도 상수
export const AUDIO_RETRY_DELAY = 500; // 오디오 재시도 간격 (ms)
export const AUDIO_MAX_RETRIES = 20; // 최대 재시도 횟수

// 트랜지션 및 애니메이션 상수
export const TRANSITION_DURATION = 300; // 기본 트랜지션 시간 (ms)
export const LONG_TRANSITION_DURATION = 1000; // 긴 트랜지션 시간 (ms)
export const FADE_TRANSITION_DURATION = 800; // 페이드 트랜지션 시간 (ms)

// UI 애니메이션 상수
export const BOUNCE_ANIMATION_DURATION = 200; // 바운스 애니메이션 시간 (ms)
export const SCALE_HOVER_EFFECT = 1.05; // 호버 시 크기 배율
export const SCALE_BOUNCE_EFFECT = 1.1; // 바운스 시 크기 배율

// 사운드 이펙트 상수
export const ATTENTION_SOUND_DURATION = 600; // 주의 소리 지속 시간 (ms)
export const CORRECT_SOUND_NOTE_DURATION = 300; // 정답 멜로디 각 음표 길이 (ms)
export const WRONG_SOUND_NOTE_DURATION = 400; // 오답 멜로디 각 음표 길이 (ms)

// 풀스크린 복원 딜레이
export const FULLSCREEN_RESTORE_RETRY_1 = 100; // 첫 번째 재시도 (ms)
export const FULLSCREEN_RESTORE_RETRY_2 = 500; // 두 번째 재시도 (ms)
export const FULLSCREEN_RESTORE_RETRY_3 = 1000; // 세 번째 재시도 (ms)
