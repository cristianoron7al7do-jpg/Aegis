import React from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';

interface UnsupportedNoticeProps {
  reason: 'crypto' | 'indexeddb' | 'general';
  errorMessage?: string;
  onRetry: () => void;
}

export const UnsupportedNotice: React.FC<UnsupportedNoticeProps> = ({
  reason,
  errorMessage,
  onRetry,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Environment Requirement Not Met</h1>
            <p className="text-xs text-slate-400">Secure cryptographic context required</p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed space-y-2">
          {reason === 'crypto' && (
            <>
              <p className="font-medium text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Web Crypto API Unavailable
              </p>
              <p className="text-xs text-slate-400">
                AegisVault performs all encryption and key derivations client-side via{' '}
                <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">window.crypto.subtle</code>.
                This API requires a secure context (HTTPS or localhost).
              </p>
            </>
          )}

          {reason === 'indexeddb' && (
            <>
              <p className="font-medium text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                IndexedDB Storage Restricted
              </p>
              <p className="text-xs text-slate-400">
                Local database storage is either unavailable, full, or blocked by strict browser privacy settings
                (such as extreme incognito/private mode isolation).
              </p>
            </>
          )}

          {reason === 'general' && (
            <p className="text-xs text-slate-400">
              {errorMessage || 'An error occurred while initializing the local security environment.'}
            </p>
          )}
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">How to resolve:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            <li>Ensure the page is served over HTTPS or localhost</li>
            <li>Allow local site storage in your browser settings</li>
            <li>Try reloading the page or using a modern browser</li>
          </ul>
        </div>

        <button
          onClick={onRetry}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Recheck Browser Environment
        </button>
      </div>
    </div>
  );
};
