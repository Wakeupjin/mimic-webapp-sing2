"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from './contexts/AuthContext';
import { signOut } from './lib/auth';
import ControlTriangle from './components/ControlTriangle';
import { MONTH_FEATURES, MONTH_LABEL_EN } from './lib/monthCatalog';

type FeatureId = (typeof MONTH_FEATURES)[number]['id'];

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedId, setSelectedId] = useState<FeatureId>('movie');
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const selected =
    MONTH_FEATURES.find((item) => item.id === selectedId) ?? MONTH_FEATURES[0];

  const openSelected = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    window.location.href = selected.href;
  };

  const selectByOffset = (offset: number) => {
    const index = MONTH_FEATURES.findIndex((item) => item.id === selectedId);
    const next = (index + offset + MONTH_FEATURES.length) % MONTH_FEATURES.length;
    setSelectedId(MONTH_FEATURES[next].id);
  };

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
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-8 sm:p-8 lg:mr-80" style={{ height: '100vh', maxHeight: '100vh' }}>
                  {/* 상단 메뉴 항목들 */}
                  <div className="p-4">
                    <nav className="space-y-0">
                      <div className="relative">
                        <a
                          href="#"
                          className={`block py-4 text-2xl flex items-center justify-between pl-2 sm:pl-8 sm:text-4xl lg:text-6xl`}
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
                          <span className="text-[#60D96C] mr-2 text-4xl transition-all duration-300 lg:mr-4 lg:text-8xl">{activeModal === 'menu1' ? '×' : '+'}</span>
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
                          className="block py-4 text-2xl text-white flex items-center justify-between pl-2 sm:pl-8 sm:text-4xl lg:text-6xl"
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
                          <span className="text-white mr-2 text-4xl transition-all duration-300 lg:mr-4 lg:text-8xl">{activeModal === 'menu2' ? '×' : '+'}</span>
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
                          className="block py-4 text-2xl text-white flex items-center justify-between pl-2 sm:pl-8 sm:text-4xl lg:text-6xl"
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
                          <span className="text-white mr-2 text-4xl transition-all duration-300 lg:mr-4 lg:text-8xl">{activeModal === 'menu3' ? '×' : '+'}</span>
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
                          className="block py-4 text-2xl text-white flex items-center justify-between pl-2 sm:pl-8 sm:text-4xl lg:text-6xl"
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
                          <span className="text-white mr-2 text-4xl transition-all duration-300 lg:mr-4 lg:text-8xl">{activeModal === 'menu4' ? '×' : '+'}</span>
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
                <div className="fixed right-0 top-0 z-40 hidden h-full w-80 flex-col items-center justify-center border-l-2 border-[rgb(32,30,30)] bg-black p-6 lg:flex">
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
      <main className="flex min-h-dvh flex-col bg-black px-4 py-5 sm:px-6 sm:py-8">
        {/* 헤더: 로고 · THIS MONTH · 로그인+메뉴 */}
        <div className="relative mb-4 flex shrink-0 items-center justify-between gap-3 sm:mb-6">
          <p
            className="shrink-0 text-2xl text-[#60D96C] sm:text-3xl"
            style={{ fontFamily: '"Jolly Lodger", cursive', lineHeight: 1 }}
          >
            MimiC
          </p>

          <h1
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-xl font-bold tracking-[0.12em] text-white sm:text-3xl md:text-4xl"
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            {MONTH_LABEL_EN}
          </h1>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {profile?.role === 'academy' && (
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="hidden px-4 bg-gray-800 hover:bg-gray-700 transition-all duration-200 items-center justify-center text-[#60D96C] sm:flex"
                style={{
                  height: '30px',
                  borderRadius: '50px',
                  fontFamily: 'var(--font-bm-hanna-pro), sans-serif',
                  fontSize: '18px',
                  fontWeight: '200'
                }}
              >
                학생 현황
              </button>
            )}
            {loading ? (
              <div className="w-20 h-6 bg-gray-700 rounded animate-pulse"></div>
            ) : isLoggingOut && user ? (
              <span
                className="hidden text-white text-lg font-bold md:inline"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  animation: 'fadeOut 4s ease-out forwards'
                }}
              >
                See you soon!
              </span>
            ) : user ? (
              <span className="hidden max-w-[20vw] truncate text-white text-base font-bold lg:inline" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Hi, {user.email?.split('@')[0] || 'User'}!
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
              className="px-4 btn-mimic transition-all duration-200 flex items-center justify-center"
              style={{
                height: '30px',
                borderRadius: '50px',
                fontFamily: 'var(--font-bm-hanna-pro), sans-serif',
                fontSize: '20px',
                fontWeight: '200'
              }}
            >
              {loading ? '...' : user ? '로그아웃' : '로그인'}
            </button>
            <button
              type="button"
              className="flex items-center justify-center cursor-pointer transition-colors duration-200"
              style={{ width: '32px', height: '32px' }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="메뉴 열기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#60D96C" />
                <path d="M9 11H23" stroke="black" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 16H23" stroke="black" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 21H23" stroke="black" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* 히어로 + 캐러셀 */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:gap-7">
          <div className="relative w-full max-w-4xl px-2 sm:px-8">
            {/* 스포트라이트 */}
            <div
              className="pointer-events-none absolute -bottom-2 left-[8%] h-40 w-40 rounded-full opacity-70 blur-2xl sm:h-56 sm:w-56"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-2 right-[8%] h-40 w-40 rounded-full opacity-70 blur-2xl sm:h-56 sm:w-56"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }}
              aria-hidden
            />

            <button
              type="button"
              onClick={openSelected}
              className="group relative mx-auto block w-full max-w-3xl overflow-hidden rounded-2xl border border-[#4a4a4a] bg-[#111] shadow-[0_0_40px_rgba(96,217,108,0.08)] transition-transform duration-300 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60D96C]"
              aria-label={`${selected.title} 시작하기`}
            >
              <div
                className={`relative w-full overflow-hidden ${
                  selected.kind === 'book'
                    ? 'mx-auto aspect-[3/4] max-h-[52vh] max-w-sm sm:max-h-[56vh]'
                    : 'aspect-video max-h-[52vh] sm:max-h-[56vh]'
                }`}
              >
                <Image
                  key={selected.coverSrc}
                  src={selected.coverSrc}
                  alt={selected.coverAlt}
                  fill
                  className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span
                    className="px-4 text-center text-lg font-bold text-white sm:text-2xl"
                    style={{ fontFamily: 'Encode Sans, sans-serif' }}
                  >
                    {selected.hint}
                  </span>
                </div>
              </div>

              {/* 초록 리본 */}
              <span
                className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[28px] border-t-[28px] border-l-transparent border-t-[#60D96C] sm:border-l-[36px] sm:border-t-[36px]"
                aria-hidden
              />
            </button>

            {/* 카멜레온 마스코트 */}
            <Image
              src="/Subject.png"
              alt=""
              width={72}
              height={72}
              className="pointer-events-none absolute bottom-[-6px] left-[2%] z-10 h-12 w-12 object-contain sm:bottom-[-10px] sm:left-[4%] sm:h-16 sm:w-16 md:h-[72px] md:w-[72px]"
              aria-hidden
            />
            <Image
              src="/Subject.png"
              alt=""
              width={72}
              height={72}
              className="pointer-events-none absolute bottom-[-6px] right-[2%] z-10 h-12 w-12 scale-x-[-1] object-contain sm:bottom-[-10px] sm:right-[4%] sm:h-16 sm:w-16 md:h-[72px] md:w-[72px]"
              aria-hidden
            />
          </div>

          {/* 콘텐츠 선택 바 — 미믹킹 PlaybackControls와 동일 토큰/스타일 */}
          <div className="w-full max-w-3xl overflow-x-auto px-2 md:px-8">
            <div
              className="mx-auto flex w-max max-w-full items-center justify-center rounded-lg bg-[var(--bar)] px-1 py-1 sm:px-2"
              style={{ gap: 'var(--ctrl-gap)' }}
            >
              <ControlTriangle
                direction="left"
                onClick={() => selectByOffset(-1)}
                label="이전 콘텐츠"
              />
              {MONTH_FEATURES.map((item) => {
                const isActive = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.title}
                    aria-pressed={isActive}
                    onClick={() => setSelectedId(item.id)}
                    className={`flex shrink-0 items-center justify-center rounded-[10px] transition-transform duration-200 hover:scale-105 ${
                      isActive ? 'scale-105' : ''
                    }`}
                    style={{
                      width: 'var(--ctrl-size)',
                      height: 'var(--ctrl-size)',
                      background: isActive ? 'var(--mimic)' : 'var(--mute)',
                    }}
                  >
                    {item.icon === 'play' ? (
                      <span className="ctrl-play-icon" aria-hidden />
                    ) : (
                      <span className="ctrl-mute-letter" aria-hidden>
                        m
                      </span>
                    )}
                  </button>
                );
              })}
              <ControlTriangle
                direction="right"
                onClick={() => selectByOffset(1)}
                label="다음 콘텐츠"
              />
            </div>
          </div>

          <p
            className="text-center text-base font-semibold text-white sm:text-lg"
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            {selected.title}
          </p>

          {profile?.role === 'academy' && (
            <button
              type="button"
              onClick={() => {
                window.location.href = '/sing2/selecting?id=002:1';
              }}
              className="text-xs text-gray-500 underline-offset-2 hover:text-[#60D96C] hover:underline sm:text-sm"
              style={{ fontFamily: 'Encode Sans, sans-serif' }}
            >
              Hard 테스트 (원장)
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              document.getElementById('home-start')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#60D96C] transition hover:scale-105"
            aria-label="아래로 스크롤"
          >
            <span
              className="mt-[-2px] block h-0 w-0 border-x-[7px] border-t-[10px] border-x-transparent border-t-black"
              aria-hidden
            />
          </button>
        </div>

        {/* 스크롤 아래: 시작 CTA */}
        <section
          id="home-start"
          className="mt-10 flex min-h-[40vh] flex-col items-center justify-center gap-4 border-t border-[#222] pb-10 pt-12"
        >
          <p
            className="text-sm tracking-[0.2em] text-gray-500"
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            {selected.caption}
          </p>
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            {selected.title}
          </h2>
          <p
            className="max-w-md text-center text-gray-400"
            style={{ fontFamily: 'Encode Sans, sans-serif' }}
          >
            {selected.hint}
          </p>
          <button
            type="button"
            onClick={openSelected}
            className="mt-2 px-8 btn-mimic transition-all duration-200"
            style={{
              height: '44px',
              borderRadius: '50px',
              fontFamily: 'var(--font-bm-hanna-pro), sans-serif',
              fontSize: '22px',
              fontWeight: '200'
            }}
          >
            시작하기
          </button>
        </section>
      </main>
    </div>
  );
}