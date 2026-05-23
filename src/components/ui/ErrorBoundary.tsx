import { ShieldAlert, RefreshCcw } from 'lucide-react';
import Button from './Button';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-4">
           <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto text-danger">
              <ShieldAlert size={24} />
           </div>
           <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Interface Fault</h3>
              <p className="text-[11px] text-white/40 mt-1">The {this.props.name || 'module'} encountered a runtime error.</p>
           </div>
           <Button
             variant="outline"
             className="py-2 text-[10px]"
             onClick={() => this.setState({ hasError: false })}
           >
              <RefreshCcw size={12} className="mr-2" />
              Reset Module
           </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
