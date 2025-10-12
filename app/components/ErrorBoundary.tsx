'use client';

import React, { Component, ReactNode, useEffect, useState } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
              오류가 발생했습니다
            </h2>
            <p className="text-gray-300 mb-4">
              {this.state.error?.message || '페이지를 새로고침하거나 다시 시도해주세요.'}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-4 py-2 bg-[#60D96C] text-black rounded hover:bg-[#4CAF50] transition-colors"
                style={{ fontFamily: 'Encode Sans, sans-serif' }}
              >
                다시 시도
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                style={{ fontFamily: 'Encode Sans, sans-serif' }}
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 함수형 에러 바운더리 (React 18+ 호환)
export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setError(event.error);
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(new Error(String(event.reason)));
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Encode Sans, sans-serif' }}>
            오류가 발생했습니다
          </h2>
          <p className="text-gray-300 mb-4">
            {error?.message || '페이지를 새로고침하거나 다시 시도해주세요.'}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
              }}
              className="px-4 py-2 bg-[#60D96C] text-black rounded hover:bg-[#4CAF50] transition-colors"
              style={{ fontFamily: 'Encode Sans, sans-serif' }}
            >
              다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              style={{ fontFamily: 'Encode Sans, sans-serif' }}
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
