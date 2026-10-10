import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, KeyRound, AlertCircle, Trash2 } from 'lucide-react';

interface UnlockScreenProps {
  onUnlock: (password: string) => Promise<void>;
  onResetVault: () => Promise<void>;
  isLoading: boolean;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  onUnlock,
  onResetVault,
  isLoading,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter your master password.');
      return;
    }

    try {
      await onUnlock(password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid master password or corrupted cryptographic payload.'
      );
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onResetVault();
      setShowResetConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset vault database.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 text-emerald-400 mb-2 border border-slate-700/60">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Unlock AegisVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Your encrypted credentials are saved locally in IndexedDB. Enter your master password to decrypt.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs sm:text-sm text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter master password"
                required
                autoFocus
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || password.length === 0}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying & Decrypting...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Unlock Vault</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>PBKDF2 SHA-256 · AES-GCM 256-bit</span>
          </div>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-slate-500 hover:text-red-400 transition-colors underline cursor-pointer"
            >
              Reset local vault completely
            </button>
          ) : (
            <div className="w-full p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-left space-y-2">
              <p className="font-medium text-red-300">Permanent reset warning</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                This will purge all local IndexedDB records permanently. Stored passwords cannot be recovered without the original master password.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleConfirmReset}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {isResetting ? 'Purging...' : 'Confirm Wipe & Reset'}
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
