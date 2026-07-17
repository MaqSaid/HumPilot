import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2 className="error-boundary__title">Something went wrong</h2>
          <p className="error-boundary__message">
            The game encountered an unexpected error.
          </p>
          <button className="btn btn--primary" onClick={this.handleReset}>
            Tap to restart
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
