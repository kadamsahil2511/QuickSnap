import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isConfigError = this.state.error?.message.includes('Missing Supabase environment variables');
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">
                {isConfigError ? 'Configuration Required' : 'Something went wrong'}
              </h2>
            </div>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            {isConfigError && (
              <div className="text-sm text-gray-500">
                <p className="mb-2">To fix this:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Create a .env file in your project root</li>
                  <li>Add your Supabase URL and anon key:</li>
                </ol>
                <pre className="bg-gray-100 p-2 mt-2 rounded text-xs">
                  VITE_SUPABASE_URL=your_url_here{'\n'}
                  VITE_SUPABASE_ANON_KEY=your_key_here
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}