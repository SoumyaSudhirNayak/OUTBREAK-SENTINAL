import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {}

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error && typeof this.state.error === 'object' && 'message' in this.state.error
        ? String(this.state.error.message)
        : String(this.state.error || 'Unknown error');

    return (
      <div style={{ minHeight: '100vh', background: '#060b1a', color: '#e2e8f0', padding: 24, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#f87171' }}>UI crashed</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16 }}>{message}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Open DevTools → Console for the full stack trace.</div>
        </div>
      </div>
    );
  }
}

