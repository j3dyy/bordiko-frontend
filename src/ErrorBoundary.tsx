import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// Top-level safety net: any error thrown while rendering shows a recoverable
// card instead of a blank white page. (React only routes render/lifecycle errors
// here — event-handler and async errors are handled where they happen.)
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Bordiko crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <img className="crash-mark" src="/bordiko-icon.svg" alt="" />
          <h1>Something broke</h1>
          <p>The app hit an unexpected error. Reloading usually fixes it.</p>
          <div className="crash-actions">
            <button onClick={() => window.location.reload()}>Reload</button>
            <button className="ghost" onClick={() => { window.location.href = "/"; }}>
              Back to home
            </button>
          </div>
          <details className="crash-details">
            <summary>Details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
        </div>
      </div>
    );
  }
}
