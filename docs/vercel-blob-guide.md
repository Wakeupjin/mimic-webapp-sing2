# Vercel Blob 사용 가이드

## 📋 개요
Vercel Blob은 Vercel에서 제공하는 클라우드 스토리지 서비스입니다. 비디오, 이미지, 파일 등을 저장하고 CDN을 통해 전 세계에 배포할 수 있습니다.

## 🚀 초기 설정

### 1. Vercel CLI 설치
```bash
npm i -g vercel
```

### 2. Vercel 로그인
```bash
vercel login
```

### 3. 프로젝트 연결
```bash
vercel link
```

## 📁 파일 업로드

### 1. 단일 파일 업로드
```bash
# 비디오 파일 업로드
vercel blob put public/videos/sing2.mp4

# 이미지 파일 업로드
vercel blob put public/images/poster.jpg
```

### 2. 여러 파일 업로드
```bash
# 폴더 전체 업로드
vercel blob put public/videos/
```

## 🔧 코드에서 사용하기

### 1. 환경 변수 설정
`.env.local` 파일에 추가:
```env
BLOB_READ_WRITE_TOKEN=your_token_here
```

### 2. Vercel Blob 클라이언트 설정
```typescript
// app/lib/blob.ts
import { put, del, list } from '@vercel/blob';

export async function uploadVideo(file: File) {
  const blob = await put(file.name, file, {
    access: 'public',
  });
  return blob.url;
}

export async function deleteVideo(url: string) {
  await del(url);
}

export async function listVideos() {
  const { blobs } = await list();
  return blobs;
}
```

### 3. React 컴포넌트에서 사용
```typescript
// app/components/VideoPlayer.tsx
import { useState, useEffect } from 'react';

export default function VideoPlayer() {
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    // Vercel Blob에서 비디오 URL 가져오기
    const fetchVideoUrl = async () => {
      try {
        const response = await fetch('/api/video-url');
        const data = await response.json();
        setVideoUrl(data.url);
      } catch (error) {
        console.error('비디오 URL 가져오기 실패:', error);
      }
    };

    fetchVideoUrl();
  }, []);

  return (
    <video
      src={videoUrl}
      controls
      crossOrigin="anonymous"
      preload="auto"
    />
  );
}
```

## 🎯 실제 프로젝트에서의 사용법

### 1. 비디오 파일 업로드
```bash
# 프로젝트 루트에서 실행
vercel blob put public/videos/sing2.mp4
```

### 2. 업로드된 URL 확인
```bash
# 업로드된 파일 목록 확인
vercel blob list
```

### 3. 코드에서 URL 사용
```typescript
// app/sing2/guessing/page.tsx
const videoUrl = 'https://your-blob-url.vercel-storage.com/sing2.mp4';
```

## ⚠️ 주의사항

### 1. 대역폭 제한
- **무료 플랜**: 월 100GB 대역폭
- **Pro 플랜**: 월 1TB 대역폭
- **초과 시**: 추가 요금 발생

### 2. 파일 크기 제한
- **단일 파일**: 최대 4.5GB
- **총 저장 용량**: 무료 1GB, Pro 1TB

### 3. CORS 설정
```typescript
// 비디오 요소에 CORS 설정
<video
  src={videoUrl}
  crossOrigin="anonymous"
  preload="auto"
/>
```

## 🔍 문제 해결

### 1. 403 Forbidden 에러
```bash
# 파일 권한 확인
vercel blob list

# 파일 재업로드
vercel blob put public/videos/sing2.mp4
```

### 2. CORS 에러
```typescript
// 비디오 요소에 CORS 속성 추가
<video
  src={videoUrl}
  crossOrigin="anonymous"
  preload="auto"
/>
```

### 3. 대역폭 초과
```bash
# 사용량 확인
vercel blob usage

# 불필요한 파일 삭제
vercel blob del https://your-blob-url.vercel-storage.com/sing2.mp4
```

## 📊 사용량 모니터링

### 1. Vercel 대시보드에서 확인
- [Vercel Dashboard](https://vercel.com/dashboard)
- Storage → Blob 탭에서 사용량 확인

### 2. CLI로 확인
```bash
# 사용량 확인
vercel blob usage

# 파일 목록 확인
vercel blob list
```

## 🚀 최적화 팁

### 1. 비디오 압축
```bash
# FFmpeg로 비디오 압축
ffmpeg -i sing2.mp4 -c:v libx264 -crf 28 -c:a aac -b:a 128k sing2_compressed.mp4
```

### 2. preload 설정
```typescript
// 필요한 경우에만 preload="auto" 사용
<video
  src={videoUrl}
  preload="metadata" // 메타데이터만 미리 로드
  crossOrigin="anonymous"
/>
```

### 3. 캐싱 활용
```typescript
// 브라우저 캐싱 활용
<video
  src={videoUrl}
  preload="auto"
  crossOrigin="anonymous"
  // 브라우저가 자동으로 캐싱
/>
```

## 🔄 마이그레이션 (Bunny CDN으로 이동 시)

### 1. Vercel Blob 파일 삭제
```bash
# 기존 파일 삭제
vercel blob del https://your-blob-url.vercel-storage.com/sing2.mp4
```

### 2. Bunny CDN 설정
```typescript
// 새로운 CDN URL로 변경
const videoUrl = 'https://your-bunny-cdn.com/sing2.mp4';
```

## 📚 추가 자료

- [Vercel Blob 공식 문서](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob API 레퍼런스](https://vercel.com/docs/storage/vercel-blob/vercel-blob-api)
- [Vercel CLI 문서](https://vercel.com/docs/cli)

## 💡 코딩 초보를 위한 팁

### 1. 단계별 접근
1. 먼저 작은 파일로 테스트
2. 성공하면 큰 파일 업로드
3. 문제 발생 시 로그 확인

### 2. 에러 해결 순서
1. 콘솔 에러 메시지 확인
2. Vercel 대시보드에서 사용량 확인
3. 필요시 파일 재업로드

### 3. 백업 전략
- 로컬에 원본 파일 보관
- 여러 CDN 서비스 사용 고려
- 정기적인 사용량 모니터링

---

**주의**: 이 가이드는 학습 목적으로 작성되었으며, 실제 프로덕션 환경에서는 보안과 성능을 고려한 추가 설정이 필요할 수 있습니다.
