import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="parchment-card max-w-lg w-full rounded-3xl border-4 border-kerning-stroke p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border-2.5 border-red-500 text-red-500 flex items-center justify-center mx-auto text-3xl shadow-inner">
              🪦
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
                冒險者遭遇未知魔法風暴！
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                應用程式發生了非預期的錯誤，請點擊下方按鈕重新連線重生。
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/10 dark:bg-black/30 rounded-xl border border-red-500/30 text-left text-[11px] font-mono text-red-600 dark:text-red-300 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={this.handleReset}
              className="w-full mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新載入頁面</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
