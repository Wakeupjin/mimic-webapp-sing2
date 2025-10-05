"use client";

import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">영화 선택</h1>
      <p className="mt-2 text-sm text-gray-600">연습할 영화를 선택하세요.</p>

      {/* 중앙 영화 화면 */}
      <div className="mt-8 flex justify-center">
        <div 
          className="relative w-[70%] aspect-video rounded-lg overflow-hidden border-4 border-gray-800 hover:border-[#60D96C] transition-all duration-300 cursor-pointer group"
          onClick={() => window.location.href = '/sing2/selecting'}
        >
          <Image
            src="/sing2Poster.jpg"
            alt="Sing 2 영화 포스터"
            fill
            className="object-cover group-hover:opacity-50 transition-opacity duration-300"
            priority={true}
          />
          {/* 호버링 시 미믹킹 시작 메시지 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-2xl font-bold text-center" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              미믹킹을 시작할까요?
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
