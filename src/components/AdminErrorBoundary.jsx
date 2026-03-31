import React from 'react';
import { safeStorage } from '@/utils/safeStorage';

const isDev = Boolean(import.meta?.env?.DEV);

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Admin panel crashed:', error, info);
  }

  handleReset = () => {
    safeStorage.removeItem('simple_admin_token');
    safeStorage.removeItem('simple_admin_user');
    if (typeof window !== 'undefined') {
      window.location.href = '/admin-login';
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Unknown error';
    const stack = this.state.error?.stack || '';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">Admin panel error</h1>
          <p className="text-sm text-slate-500 mt-2">
            Something went wrong while loading the admin panel. Try resetting the admin session.
          </p>
          <p className="text-xs text-slate-400 mt-3">{message}</p>
          {isDev && stack && (
            <pre className="mt-3 max-h-40 overflow-auto text-left text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">
              {stack}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Reset admin session
          </button>
        </div>
      </div>
    );
  }
}

export default AdminErrorBoundary;
