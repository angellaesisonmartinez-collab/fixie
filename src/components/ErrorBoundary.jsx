import React from 'react';

/**
 * Robust Error Boundary component to prevent whole-page unmounting
 * if any child component throws an unexpected runtime error.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Fixie ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '28px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #D5DDD8',
          margin: '20px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ color: '#0A2916', margin: '0 0 8px 0', fontFamily: 'Barlow Semi Condensed, Cambria, sans-serif' }}>
            Something went wrong loading this section
          </h2>
          <p style={{ color: '#4A5568', margin: '0 0 16px 0', fontSize: '14px' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: '#0B301D',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13.5px'
            }}
          >
            Retry Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
