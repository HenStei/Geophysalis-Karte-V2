import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-700 text-xs rounded-xl text-center">
          <p className="font-bold mb-1">Fehler beim Laden der Karte 🗺️</p>
          <p className="opacity-75">{this.state.error.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
