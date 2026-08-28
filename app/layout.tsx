import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./design-system.css";
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary, { ErrorBoundaryWrapper } from './components/ErrorBoundary';
import RotateGate from './components/RotateGate';

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
  title: "MimiC",
  description: "영화와 원서로 완성하는 영어 리듬 학습",
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
              <RotateGate />
              {children}
            </AuthProvider>
          </ErrorBoundary>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
