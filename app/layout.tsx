import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./design-system.css";
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary, { ErrorBoundaryWrapper } from './components/ErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jollyLodger = {
  className: "font-jolly-lodger",
  style: {
    fontFamily: "Jolly Lodger, cursive",
  },
};

const bmHannaPro = localFont({
  src: "../public/fonts/BMHANNAPro.ttf",
  variable: "--font-bm-hanna-pro",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mimicenglish.vercel.app"),
  title: "MimiC | 아이가 영어에 빠져드는 공간",
  description: "모국어 습득 원리를 바탕으로 영화와 원서 속 이야기를 듣고 따라 말하며 영어에 몰입하는 온·오프라인 공간.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MimiC | 아이가 영어에 빠져드는 공간",
    description: "영화와 원서, 그리고 우리만의 영어 공간. 듣고 따라 말하며 영어를 내 목소리로 만듭니다.",
    url: "/",
    siteName: "MimiC",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "MimiC — 아이가 영어에 빠져드는 공간" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MimiC | 아이가 영어에 빠져드는 공간",
    description: "영화와 원서, 그리고 우리만의 영어 공간.",
    images: ["/og.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bmHannaPro.variable} antialiased`}
      >
        <ErrorBoundaryWrapper>
          <ErrorBoundary>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ErrorBoundary>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
