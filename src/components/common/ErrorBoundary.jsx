import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600 }}>
          <h1 style={{ color: '#dc2626', marginBottom: 16 }}>Something went wrong</h1>
          <pre style={{ background: '#fef2f2', padding: 16, overflow: 'auto', fontSize: 14 }}>
            {this.state.error.toString()}
          </pre>
          <p style={{ marginTop: 16, color: '#6b7280' }}>Check the browser console for more details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
