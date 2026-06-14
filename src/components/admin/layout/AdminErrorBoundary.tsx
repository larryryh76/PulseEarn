import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AdminInternal] Module Crash Detected:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 min-h-[400px] flex items-center justify-center">
          <div className="max-w-md w-full bg-[#0A0A0F] border border-danger/20 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl">
            <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-3xl flex items-center justify-center mx-auto text-danger shadow-2xl">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white uppercase italic tracking-tighter">Module Initialization Failure</h2>
              <p className="text-xs text-text-tertiary leading-relaxed font-medium">
                The administrative sub-system encountered a logic violation and was terminated to protect database integrity.
              </p>
              {this.state.error && (
                <p className="text-[10px] font-mono text-danger/60 bg-danger/5 p-3 rounded-lg border border-danger/10 break-all">
                  ERR_ID: {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2 italic"
              >
                <RefreshCcw size={14} /> Re-Initialize
              </button>
              <button
                onClick={() => window.location.href = '/admin/overview'}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all italic text-white/40"
              >
                Ops Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
