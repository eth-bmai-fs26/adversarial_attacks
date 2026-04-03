import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <p
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 16,
                color: '#94a3b8',
              }}
            >
              Something went wrong with this view. Try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 14,
                color: '#f1f5f9',
                backgroundColor: '#131c2e',
                border: '1px solid #94a3b8',
              }}
            >
              Refresh
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
