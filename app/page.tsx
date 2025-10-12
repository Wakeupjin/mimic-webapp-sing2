"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from './contexts/AuthContext';
import { signOut } from './lib/auth';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  return (
    <div className="relative">
      {/* 햄버거 메뉴 오버레이 */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-500 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsMenuOpen(false)}
      >
        {/* 메뉴 패널 */}
        <div
          className={`fixed top-0 left-0 h-full w-full bg-gray-800 shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`animate-in slide-in-from-left-4 fade-in ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`} style={{ animationDuration: '800ms', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
            {/* X 버튼 */}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute flex items-center justify-center cursor-pointer transition-colors duration-200"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                top: '20px',
                left: '24px',
                zIndex: 100
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#60D96C" />
                <path d="M12 12L20 20" stroke="black" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 12L12 20" stroke="black" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* 메뉴 항목들 */}
            <div className="h-full bg-black flex flex-col">
              {/* 상단 메뉴 영역 */}
              <div className="flex flex-1">
                {/* 왼쪽 메뉴 */}
                <div className="flex-1 p-8 flex flex-col pt-8 mr-80 overflow-y-auto" style={{ height: '100vh', maxHeight: '100vh' }}>
                  {/* 상단 메뉴 항목들 */}
                  <div className="p-4">
                    <nav className="space-y-0">
                      <div className="relative">
                        <a
                          href="#"
                          className={`block py-4 text-6xl flex items-center justify-between pl-8`}
                          onMouseEnter={() => setIsHovering(true)}
                          onMouseLeave={() => setIsHovering(false)}
                          onClick={(e) => { e.preventDefault(); setActiveModal(activeModal === 'menu1' ? null : 'menu1'); }}
                        >
                          <span className="text-[#60D96C] group" style={{ fontFamily: 'var(--font-bm-hanna-pro), sans-serif', fontWeight: '300' }}>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '0ms' : '0ms' }}>미</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '50ms' : '0ms' }}>믹</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '100ms' : '0ms' }}>이</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '150ms' : '0ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '200ms' : '0ms' }}>바</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '250ms' : '0ms' }}>꾸</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '300ms' : '0ms' }}>어</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '350ms' : '0ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '400ms' : '0ms' }}>나</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '450ms' : '0ms' }}>가</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '500ms' : '0ms' }}>는</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '550ms' : '0ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '600ms' : '0ms' }}>세</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: isHovering ? '650ms' : '0ms' }}>상</span>
                          </span>
                          <span className="text-[#60D96C] text-8xl mr-4 transition-all duration-300">{activeModal === 'menu1' ? '×' : '+'}</span>
                        </a>
                        <div
                          className="w-full bg-black rounded-lg shadow-lg mt-2 overflow-hidden transition-[max-height] duration-[1000ms]"
                          style={{
                            maxHeight: activeModal === 'menu1' ? '400px' : '0px',
                            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <div
                            className="p-6 transform origin-top transition-all"
                            style={{
                              transform: activeModal === 'menu1' ? 'translateY(0) scaleY(1)' : 'translateY(-12px) scaleY(0.98)',
                              opacity: activeModal === 'menu1' ? 1 : 0,
                              transitionDuration: '1000ms',
                              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">비전</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">미션</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">가치</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">목표</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">비전</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">미션</span>
                              </div>
                            </div>
                            <div className="mt-4 text-center">
                              <h3 className="text-white text-lg font-bold mb-2">미믹이 바꾸어 나가는 세상</h3>
                              <p className="text-gray-300 text-sm">언어 학습의 새로운 패러다임을 제시합니다.</p>
                            </div>
                            {/* 내부 구분선 제거: 외부 단일 구분선만 사용 */}
                          </div>
                        </div>
                        {/* 그리드 아래 구분선 - 그리드 밖으로 이동 */}
                        <div className="w-full h-[2px] bg-[rgb(32,30,30)] mt-2"></div>
                      </div>

                      <div className="relative">
                        <a
                          href="#"
                          className="block py-4 text-6xl text-white flex items-center justify-between pl-8"
                          onClick={(e) => { e.preventDefault(); setActiveModal(activeModal === 'menu2' ? null : 'menu2'); }}
                        >
                          <span className="text-white group" style={{ fontFamily: 'var(--font-bm-hanna-pro), sans-serif', fontWeight: '300' }}>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200">더</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '50ms' }}>욱</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '100ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '150ms' }}>재</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '200ms' }}>밌</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '250ms' }}>고</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '300ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '350ms' }}>다</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '400ms' }}>양</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '450ms' }}>한</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '500ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '550ms' }}>콘</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '600ms' }}>텐</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '650ms' }}>츠</span>
                          </span>
                          <span className="text-white text-8xl mr-4 transition-all duration-300">{activeModal === 'menu2' ? '×' : '+'}</span>
                        </a>
                        <div
                          className="w-full bg-black rounded-lg shadow-lg mt-2 overflow-hidden transition-[max-height] duration-500"
                          style={{
                            maxHeight: activeModal === 'menu2' ? '400px' : '0px',
                            transitionTimingFunction: 'ease-out'
                          }}
                        >
                          <div
                            className="p-6 transform origin-top transition-all duration-500"
                            style={{
                              transform: activeModal === 'menu2' ? 'translateY(0) scaleY(1)' : 'translateY(-8px) scaleY(0.99)',
                              opacity: activeModal === 'menu2' ? 1 : 0,
                              transitionTimingFunction: 'ease-out'
                            }}
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">영화</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">드라마</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">뉴스</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">다큐</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">애니</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">예능</span>
                              </div>
                            </div>
                            <div className="mt-4 text-center">
                              <h3 className="text-white text-lg font-bold mb-2">더욱 재밌고 다양한 콘텐츠</h3>
                              <p className="text-gray-300 text-sm">다양한 장르의 콘텐츠로 영어 실력을 향상시켜보세요.</p>
                            </div>
                            {/* 내부 구분선 제거: 외부 단일 구분선만 사용 */}
                          </div>
                        </div>
                        <div className="w-full h-[2px] bg-[rgb(32,30,30)] mt-2"></div>
                      </div>

                      <div className="relative">
                        <a
                          href="#"
                          className="block py-4 text-6xl text-white flex items-center justify-between pl-8"
                          onClick={(e) => { e.preventDefault(); setActiveModal(activeModal === 'menu3' ? null : 'menu3'); }}
                        >
                          <span className="text-white group" style={{ fontFamily: 'var(--font-bm-hanna-pro), sans-serif', fontWeight: '300' }}>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200">혼</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '50ms' }}>자</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '100ms' }}>도</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '150ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '200ms' }}>좋</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '250ms' }}>아</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '300ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '350ms' }}>같</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '400ms' }}>이</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '450ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '500ms' }}>하</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '550ms' }}>면</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '600ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '650ms' }}>더</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '700ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '750ms' }}>좋</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '800ms' }}>아</span>
                          </span>
                          <span className="text-white text-8xl mr-4 transition-all duration-300">{activeModal === 'menu3' ? '×' : '+'}</span>
                        </a>
                        <div
                          className="w-full bg-black rounded-lg shadow-lg mt-2 overflow-hidden transition-[max-height] duration-[1000ms]"
                          style={{
                            maxHeight: activeModal === 'menu3' ? '400px' : '0px',
                            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <div
                            className="p-6 transform origin-top transition-all"
                            style={{
                              transform: activeModal === 'menu3' ? 'translateY(0) scaleY(1)' : 'translateY(-12px) scaleY(0.98)',
                              opacity: activeModal === 'menu3' ? 1 : 0,
                              transitionDuration: '1000ms',
                              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">혼자</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">그룹</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">피드백</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">초대</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">챌린지</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">랭킹</span>
                              </div>
                            </div>
                            <div className="mt-4 text-center">
                              <h3 className="text-white text-lg font-bold mb-2">혼자도 좋아 같이 하면 더 좋아</h3>
                              <p className="text-gray-300 text-sm">혼자 학습하거나 친구들과 함께 그룹 학습을 진행할 수 있습니다.</p>
                            </div>
                            {/* 내부 구분선 제거: 외부 단일 구분선만 사용 */}
                          </div>
                        </div>
                        <div className="w-full h-[2px] bg-[rgb(32,30,30)] mt-2"></div>
                      </div>

                      <div className="relative">
                        <a
                          href="#"
                          className="block py-4 text-6xl text-white flex items-center justify-between pl-8"
                          onClick={(e) => { e.preventDefault(); setActiveModal(activeModal === 'menu4' ? null : 'menu4'); }}
                        >
                          <span className="text-white group" style={{ fontFamily: 'var(--font-bm-hanna-pro), sans-serif', fontWeight: '300' }}>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200">내</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '50ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '100ms' }}>주</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '150ms' }}>변</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '200ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '250ms' }}>미</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '300ms' }}>믹</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '350ms' }}>&nbsp;</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '400ms' }}>플</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '450ms' }}>레</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '500ms' }}>이</span>
                            <span className="inline-block group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200" style={{ transitionDelay: '550ms' }}>스</span>
                          </span>
                          <span className="text-white text-8xl mr-4 transition-all duration-300">{activeModal === 'menu4' ? '×' : '+'}</span>
                        </a>
                        <div
                          className="w-full bg-black rounded-lg shadow-lg mt-2 overflow-hidden transition-[max-height] duration-[1000ms]"
                          style={{
                            maxHeight: activeModal === 'menu4' ? '400px' : '0px',
                            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <div
                            className="p-6 transform origin-top transition-all"
                            style={{
                              transform: activeModal === 'menu4' ? 'translateY(0) scaleY(1)' : 'translateY(-12px) scaleY(0.98)',
                              opacity: activeModal === 'menu4' ? 1 : 0,
                              transitionDuration: '1000ms',
                              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">서울</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">부산</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">대구</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">광주</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">대전</span>
                              </div>
                              <div className="bg-gray-800 h-12 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">인천</span>
                              </div>
                            </div>
                            <div className="mt-4 text-center">
                              <h3 className="text-white text-lg font-bold mb-2">내 주변 미믹 플레이스</h3>
                              <p className="text-gray-300 text-sm">전국 주요 도시에 위치한 미믹 학습 센터를 찾아보세요.</p>
                            </div>
                            {/* 내부 구분선 제거: 외부 단일 구분선만 사용 */}
                          </div>
                        </div>
                        <div className="w-full h-[2px] bg-[rgb(32,30,30)] mt-2"></div>
                      </div>
                    </nav>
                  </div>

                  {/* 하단 소셜 미디어 섹션 */}
                  <div className="text-center mt-6 p-4 h-32 flex flex-col justify-center">
                    <p className="text-white text-sm mb-4">다른 곳에서도 만나요.</p>
                    <div className="flex space-x-4 justify-center">
                      {/* 트위터 */}
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                        <span className="text-white text-sm">🐦</span>
                      </div>
                      {/* 인스타그램 */}
                      <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📷</span>
                      </div>
                      {/* 페이스북 */}
                      <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">f</span>
                      </div>
                      {/* 블로그 */}
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                        <span className="text-white text-xs">blog</span>
                      </div>
                      {/* 유튜브 */}
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                        <span className="text-white text-sm">▶</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 오른쪽 QR코드 섹션 */}
                <div className="fixed right-0 top-0 w-80 h-full p-6 border-l-2 border-[rgb(32,30,30)] flex flex-col items-center justify-center bg-black z-40">
                  <div className="text-center">
                    <h3
                      className="text-white font-bold mb-6"
                      style={{ fontSize: '20px' }}
                    >
                      앱에서도 만나보세요
                    </h3>
                    <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center border-4 border-[#60D96C] relative mx-auto">
                      {/* QR코드 패턴 */}
                      <div className="absolute inset-1 grid grid-cols-25 gap-0.5">
                        {/* QR코드 모듈들 - 복잡한 패턴 */}
                        {Array.from({ length: 625 }, (_, i) => {
                          const row = Math.floor(i / 25);
                          const col = i % 25;

                          // QR코드의 3개 코너 패턴 (왼쪽 위, 오른쪽 위, 왼쪽 아래)
                          if ((row < 9 && col < 9) || (row < 9 && col > 15) || (row > 15 && col < 9)) {
                            return (
                              <div
                                key={i}
                                className={`w-0.5 h-0.5 ${
                                  // 코너 패턴의 정사각형 테두리
                                  (row === 0 || row === 8 || col === 0 || col === 8) ? 'bg-black' :
                                    // 코너 패턴의 내부 흰색 영역
                                    (row === 1 || row === 7 || col === 1 || col === 7) ? 'bg-white' :
                                      // 코너 패턴의 내부 검은색 영역
                                      (row === 2 || row === 6 || col === 2 || col === 6) ? 'bg-black' :
                                        // 코너 패턴의 내부 흰색 영역
                                        (row === 3 || row === 5 || col === 3 || col === 5) ? 'bg-white' :
                                          // 코너 패턴의 중앙 검은색 영역
                                          'bg-black'
                                  }`}
                              />
                            );
                          }

                          // 중앙 로고 영역 (7x7)
                          if (row >= 9 && row <= 15 && col >= 9 && col <= 15) {
                            return (
                              <div
                                key={i}
                                className="w-0.5 h-0.5 bg-[rgb(32,30,30)]"
                              />
                            );
                          }

                          // 타이밍 패턴 (9번째 행과 열)
                          if (row === 8 || col === 8) {
                            return (
                              <div
                                key={i}
                                className={`w-0.5 h-0.5 ${(row + col) % 2 === 0 ? 'bg-black' : 'bg-white'}`}
                              />
                            );
                          }

                          // 정렬 패턴 (오른쪽 아래)
                          if (row > 17 && col > 17) {
                            return (
                              <div
                                key={i}
                                className={`w-0.5 h-0.5 ${
                                  // 정렬 패턴의 테두리
                                  (row === 18 || row === 24 || col === 18 || col === 24) ? 'bg-black' :
                                    // 정렬 패턴의 내부 흰색
                                    (row === 19 || row === 23 || col === 19 || col === 23) ? 'bg-white' :
                                      // 정렬 패턴의 내부 검은색
                                      (row === 20 || row === 22 || col === 20 || col === 22) ? 'bg-black' :
                                        // 정렬 패턴의 중앙 흰색
                                        'bg-white'
                                  }`}
                              />
                            );
                          }

                          // 복잡한 데이터 패턴 (더 현실적인 QR코드 패턴)
                          const pattern = (row * 25 + col) % 11;
                          const isBlack = pattern === 0 || pattern === 2 || pattern === 4 || pattern === 6 || pattern === 8 || pattern === 10;

                          return (
                            <div
                              key={i}
                              className={`w-0.5 h-0.5 ${isBlack ? 'bg-black' : 'bg-white'}`}
                            />
                          );
                        })}
                      </div>
                      {/* 중앙 로고 영역 */}
                      <div className="w-12 h-12 bg-[#000] rounded-lg flex items-center justify-center z-10">
                        <Image
                          src="/Subject.png"
                          alt="Mimic Logo"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <p
                      className="text-center mt-4"
                      style={{
                        color: '#60D96C',
                        textAlign: 'center',
                        fontFamily: '"Jolly Lodger"',
                        fontSize: '48px',
                        fontStyle: 'normal',
                        fontWeight: '400',
                        lineHeight: 'normal'
                      }}
                    >
                      #MimiC
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ⬆️ 여기가 햄버거 메뉴 오버레이 닫는 태그! */}

      {/* 메인 콘텐츠 - 오버레이 밖으로 이동 */}
      <main className="min-h-screen px-6 py-10 bg-black">
          {/* 헤더 - 로그인/햄버거 버튼만 */}
        <div className="mb-8 flex items-center justify-between">
          {/* 햄버거 버튼 - 왼쪽 */}
          <button
            className="flex items-center justify-center cursor-pointer transition-colors duration-200"
            style={{ width: '32px', height: '32px', transform: 'translateY(-20px)' }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#60D96C" />
              <path d="M9 11H23" stroke="black" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 16H23" stroke="black" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 21H23" stroke="black" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* 로그인/로그아웃 버튼 - 오른쪽 */}
          <div className="flex items-center gap-3" style={{ transform: 'translateY(-20px)' }}>
            {loading ? (
              <div className="w-20 h-6 bg-gray-700 rounded animate-pulse"></div>
            ) : isLoggingOut && user ? (
              <span 
                className="text-white text-lg font-bold" 
                style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  animation: 'fadeOut 4s ease-out forwards'
                }}
              >
                <span className="inline-block animate-bounce" style={{ animationDelay: '0ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>S</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '150ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>e</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '300ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>e</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '450ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>&nbsp;</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '600ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>y</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '750ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>o</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '900ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>u</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1050ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>&nbsp;</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1200ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>s</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1350ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>o</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1500ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>o</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1650ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>n</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1800ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>,</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '1950ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>&nbsp;</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '2100ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>{user.email?.split('@')[0] || 'User'}</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '2250ms', animationDuration: '2s', animationIterationCount: 'infinite' }}>!</span>
              </span>
            ) : user ? (
              <span className="text-white text-lg font-bold" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                <span className="inline-block animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s', animationIterationCount: 'infinite' }}>H</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s', animationIterationCount: 'infinite' }}>i</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s', animationIterationCount: 'infinite' }}>,</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '450ms', animationDuration: '1s', animationIterationCount: 'infinite' }}>&nbsp;</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '600ms', animationDuration: '1s', animationIterationCount: 'infinite' }}>{user.email?.split('@')[0] || 'User'}</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '750ms', animationDuration: '1s', animationIterationCount: 'infinite' }}>!</span>
              </span>
            ) : null}
            <button
              onClick={() => {
                if (user) {
                  setIsLoggingOut(true);
                  signOut().then(() => {
                    router.push('/');
                    setTimeout(() => setIsLoggingOut(false), 4000);
                  });
                } else {
                  router.push('/auth/login');
                }
              }}
              className="px-4 bg-[#60D96C] hover:bg-[#4CAF50] transition-all duration-200 flex items-center justify-center text-black"
              style={{
                height: '30px',
                borderRadius: '50px',
                fontFamily: 'var(--font-bm-hanna-pro), sans-serif',
                fontSize: '22px',
                fontWeight: '200'
              }}
            >
              {loading ? '...' : user ? '로그아웃' : '로그인'}
            </button>
          </div>
        </div>

      {/* 중앙 영화 화면 */}
        <div className="mt-0 flex justify-center">
        <div 
            className="relative w-[70%] aspect-video rounded-lg overflow-hidden border-8 border-[#555555] hover:border-[#60D96C] transition-all duration-300 cursor-pointer group"
          onClick={() => {
            if (!user) {
              router.push('/auth/login');
              return;
            }
            window.location.href = '/sing2/selecting';
          }}
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
    </div>
  );
}