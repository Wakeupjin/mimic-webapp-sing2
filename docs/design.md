# 디자인 요구사항 명세서 (Design Requirements Specification)

## 1. 컬러 시스템 (Color System)

### 주요 컬러
- **미믹색 (Mimic Color)**: `#60D96C` - 주요 액션, 강조 요소
- **미믹색 호버**: `#4CAF50` - 미믹색 호버 상태
- **미믹색 배경**: `#2A602F` - 미믹색 배경, 호버 효과
- **카멜레온 색상**: `#66FF00` - 밝은 라임 그린 (Subject.png 이미지 색상)

### 중성 컬러
- **회색 테두리**: `#201E1E` - 기본 배경
- **회색 호버**: `#2A602F` - 호버 효과
- **화이트**: `#ffffff` - 버튼 배경
- **화이트 호버**: `#f8f8f8` - 버튼 호버 배경

## 2. 타이포그래피 (Typography)

### 폰트 시스템
- **기본 폰트**: `Encode Sans` - 모든 텍스트 (Google Fonts)
- **특수 폰트**: `Jolly Lodger` - 무음재생 버튼의 'm' 글자만

### 폰트 크기
- **영화 제목**: `text-xl` (1.25rem)
- **액션 버튼**: `1.5rem` (24px)
- **사이드바 텍스트**: `text-sm` (14px)
- **상단 버튼**: `text-sm` (14px)

## 3. 버튼 시스템 (Button System)

### 액션버튼 기본 (Again Button)
```css
className="rounded-2xl border-8 border-gray-300 px-10 py-5 text-black font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-gray-400"
style={{ backgroundColor: 'white', fontFamily: 'Encode Sans, sans-serif', fontSize: '1.5rem' }}
```
- **테두리**: 8px 회색 (`border-gray-300`)
- **호버 테두리**: 진한 회색 (`hover:border-gray-400`)
- **배경**: 화이트 → 호버 시 연한 회색 (`#f8f8f8`)

### 액션버튼 미믹 (Next Button)
```css
className="relative rounded-2xl border-8 border-[#60D96C] px-10 py-5 text-black font-bold transition-all duration-200 hover:brightness-100 hover:shadow-lg"
style={{ backgroundColor: 'white', fontFamily: 'Encode Sans, sans-serif', fontSize: '1.5rem' }}
```
- **테두리**: 8px 미믹색 (`border-[#60D96C]`) - 호버 시 변경 없음
- **배경**: 화이트 → 호버 시 연한 회색 (`#f8f8f8`)
- **호버 효과**: 밝기 유지 (`hover:brightness-100`) + 그림자
- **특수 요소**: 카멜레온 이미지 오버레이 (Subject.png)

### 카멜레온 이미지 오버레이
```css
className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
style={{ maxWidth: '80px', height: 'auto' }}
```
- **위치**: Next 버튼 위 48px (`-top-12`)
- **크기**: 최대 80px 너비, 비율 유지
- **테두리**: 없음 (원본 이미지 그대로)

## 4. 레이아웃 시스템 (Layout System)

### 메인 컨테이너
- **패딩**: `px-4 py-4` (16px)
- **배경**: 동적 (`#1a1a1a` 기본, `#0a0a0a` dimmed)

### 비디오 플레이어 영역
- **사이드바 열림**: `w-[85%]`
- **사이드바 닫힘**: `w-[70%]`
- **배경**: `#1a1a1a` (기본), `#0a0a0a` (dimmed)

### 사이드바
- **너비**: `200px` (고정)
- **높이**: `540px` (고정)
- **버튼 높이**: `40px` (고정)
- **텍스트**: "SENTENCE [번호]" 또는 "번호. [자막]"

## 5. 인터랙션 시스템 (Interaction System)

### 호버 효과
- **스케일**: `hover:scale-105` (5% 확대)
- **그림자**: `hover:shadow-lg`
- **색상 변화**: 배경색, 테두리색 변경
- **트랜지션**: `transition-all duration-200`

### 포커스 상태
- **키보드 접근성**: `aria-label` 속성
- **포커스 링**: 기본 브라우저 스타일 유지

## 6. 반응형 디자인 (Responsive Design)

### 브레이크포인트
- **모바일**: 기본 (1열)
- **데스크톱**: `lg:` (1024px+) - 2열 그리드

### 그리드 시스템
```css
grid grid-cols-1 gap-4 transition-all duration-300
lg:grid-cols-[1fr_200px] (사이드바 열림)
lg:grid-cols-1 (사이드바 닫힘)
```

## 7. 애니메이션 시스템 (Animation System)

### 트랜지션
- **기본**: `transition-all duration-200`
- **레이아웃**: `transition-all duration-300`
- **호버**: `hover:scale-105`

### 오버레이 애니메이션
- **dimmed 효과**: `bg-black/80`
- **버튼 등장**: 즉시 표시
- **배경 변화**: 부드러운 전환

## 8. 접근성 (Accessibility)

### ARIA 라벨
- **사이드바 버튼**: `aria-current="true"` (현재 선택)
- **재생 버튼**: `aria-label="재생"`
- **방향 버튼**: `aria-label="이전 문장"`, `aria-label="다음 문장"`

### 키보드 네비게이션
- **단축키**: 스페이스바 (재생/일시정지)
- **포커스**: Tab 키로 순차 이동
- **활성화**: Enter/Space 키

## 9. 컴포넌트 명명 규칙 (Component Naming)

### 버튼 타입
- **액션버튼 기본**: Again 버튼 스타일 (회색 테두리)
- **액션버튼 미믹**: Next 버튼 스타일 (미믹색 테두리)

### CSS 클래스
- **공통**: `rounded-2xl`, `px-10`, `py-5`, `text-black`, `font-bold`
- **애니메이션**: `transition-all`, `duration-200`, `hover:scale-105`
- **레이아웃**: `relative`, `absolute`, `flex`, `items-center`

## 10. 디자인 토큰 (Design Tokens)

### 색상 토큰
```css
--mimic-color: #60D96C;
--mimic-hover: #4CAF50;
--mimic-bg: #2A602F;
--chameleon-color: #66FF00;
--gray-border: #201E1E;
--white: #ffffff;
--white-hover: #f8f8f8;
```

### 크기 토큰
```css
--border-thick: 8px;
--button-padding-x: 2.5rem; /* px-10 */
--button-padding-y: 1.25rem; /* py-5 */
--button-font-size: 1.5rem;
--sidebar-width: 200px;
--sidebar-height: 540px;
```

### 애니메이션 토큰
```css
--transition-fast: 200ms;
--transition-normal: 300ms;
--hover-scale: 1.05;
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024년 12월  
**작성자**: AI Assistant  
**검토자**: 개발팀
