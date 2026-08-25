import React, { createContext, useContext, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info, Copy } from 'lucide-react';

export type AlertType = 'info' | 'warning' | 'error' | 'success' | 'confirm' | 'prompt';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

interface AlertContextType {
  showAlert: (options: string | AlertOptions) => Promise<void>;
  showConfirm: (options: string | AlertOptions) => Promise<boolean>;
  showPrompt: (options: string | AlertOptions) => Promise<string | null>;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AlertOptions>({ message: '', type: 'info' });
  const [promptInput, setPromptInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const resolveRef = useRef<((value: any) => void) | null>(null);

  const showAlert = (opts: string | AlertOptions): Promise<void> => {
    const options = typeof opts === 'string' ? { message: opts, type: 'info' as AlertType } : opts;
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
      setConfig({
        title: options.title || '系統提示',
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || '我知道了',
      });
      setIsOpen(true);
    });
  };

  const showConfirm = (opts: string | AlertOptions): Promise<boolean> => {
    const options = typeof opts === 'string' ? { message: opts, type: 'confirm' as AlertType } : opts;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = (val: boolean) => resolve(val);
      setConfig({
        title: options.title || '請確認操作',
        message: options.message,
        type: 'confirm',
        confirmText: options.confirmText || '確認',
        cancelText: options.cancelText || '取消',
        isDanger: options.isDanger ?? false,
      });
      setIsOpen(true);
    });
  };

  const showPrompt = (opts: string | AlertOptions): Promise<string | null> => {
    const options = typeof opts === 'string' ? { message: opts, type: 'prompt' as AlertType } : opts;
    return new Promise<string | null>((resolve) => {
      resolveRef.current = (val: string | null) => resolve(val);
      setPromptInput(options.defaultValue || '');
      setCopiedPrompt(false);
      setConfig({
        title: options.title || '請輸入內容',
        message: options.message,
        type: 'prompt',
        confirmText: options.confirmText || '送出',
        cancelText: options.cancelText || '關閉',
        defaultValue: options.defaultValue,
        placeholder: options.placeholder,
      });
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (config.type === 'confirm') {
        resolveRef.current(true);
      } else if (config.type === 'prompt') {
        resolveRef.current(promptInput);
      } else {
        resolveRef.current(undefined);
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (config.type === 'confirm') {
        resolveRef.current(false);
      } else if (config.type === 'prompt') {
        resolveRef.current(null);
      } else {
        resolveRef.current(undefined);
      }
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptInput);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // ignore
    }
  };

  const getIcon = () => {
    switch (config.type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />;
      case 'confirm':
        return <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'prompt':
        return <Info className="w-6 h-6 text-sky-500 shrink-0" />;
      default:
        return <Info className="w-6 h-6 text-amber-500 shrink-0" />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleCancel()}>
        <DialogContent maxWidthClass="max-w-sm sm:max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              {getIcon()}
              <span>{config.title || '提示'}</span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-3 pt-2">
            <p className="text-sm font-bold text-[#3E2F20] dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {config.message}
            </p>

            {config.type === 'prompt' && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder={config.placeholder}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="parchment"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="text-xs shrink-0"
                    title="複製內容"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPrompt ? '已複製' : '複製'}</span>
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            {(config.type === 'confirm' || config.type === 'prompt') && (
              <Button type="button" variant="parchment" size="sm" onClick={handleCancel}>
                {config.cancelText || '取消'}
              </Button>
            )}
            <Button
              type="button"
              variant={config.isDanger ? 'danger' : 'gold'}
              size="sm"
              onClick={handleConfirm}
              className="font-black"
            >
              {config.confirmText || '確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert 必須在 AlertProvider 內部使用！');
  }
  return context;
};
