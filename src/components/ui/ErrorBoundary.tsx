import { ShieldAlert, RefreshCcw, AlertTriangle } from 'lucide-react';
import Button from './ButtonLegacy';
import { Component, ErrorInfo, ReactNode } from 'react';
import Logo from './Logo';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Full screen error for App Root
      if (this.props.name === 'App Root') {
        return (
          <div className="fixed inset-0 z-[500] bg-[#050507] flex items-center justify-center p-6 text-center">
             <div className="max-w-md w-full space-y-10">
                <div className="scale-125 flex justify-center">
                   <Logo />
                </div>

                <div className="relative w-full">
                  <div className="absolute inset-0 bg-danger/10 blur-3xl rounded-full" />
                  <div className="relative bg-[#12121A] border border-danger/20 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                     <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-3xl flex items-center justify-center mx-auto text-danger shadow-inner">
                        <AlertTriangle size={40} />
                     </div>

                     <div className="space-y-3">
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">System Terminal Failure</h2>
                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-relaxed px-4">
                           The core application encountered a critical runtime exception. This state has been recorded for review.
                        </p>
                        {this.state.error && (
                           <p className="text-[9px] font-mono text-danger/60 bg-danger/5 p-3 rounded-xl border border-danger/10 break-all uppercase mt-4">
                              ERROR_LOG: {this.state.error.message}
                           </p>
                        )}
                     </div>

                     <button
                        onClick={() => window.location.reload()}
                        className="w-full py-5 bg-white text-black font-black uppercase italic tracking-[0.2em] text-[10px] rounded-2xl hover:bg-danger hover:text-white transition-all duration-500 shadow-xl flex items-center justify-center gap-3"
                     >
                        <RefreshCcw size={16} /> Re-Initialize Core
                     </button>
                  </div>
                </div>

                <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.4em]">
                   Critical Error Recovery Protocol
                </p>
             </div>
          </div>
        );
      }

      return (
        <div className="p-10 rounded-[2.5rem] bg-[#12121A] border border-white/5 text-center space-y-6 shadow-2xl">
           <div className="w-16 h-16 rounded-3xl bg-danger/10 flex items-center justify-center mx-auto text-danger border border-danger/10">
              <ShieldAlert size={32} />
           </div>
           <div className="space-y-2">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Runtime Violation</h3>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">The {this.props.name || 'component'} encountered a logical error.</p>
           </div>
           <Button
             variant="outline"
             className="w-full py-4 text-[10px] font-black uppercase tracking-widest border-white/5 hover:bg-danger/10 hover:text-danger hover:border-danger/20 rounded-xl"
             onClick={() => this.setState({ hasError: false, error: null })}
           >
              <RefreshCcw size={14} className="mr-2" />
              Reboot Logic
           </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
