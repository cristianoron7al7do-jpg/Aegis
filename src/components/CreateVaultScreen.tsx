import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

interface CreateVaultScreenProps {
  onVaultCreated: (password: string) => Promise<void>;
  isLoading: boolean;
}

export const CreateVaultScreen: React.FC<CreateVaultScreenProps> = ({
  onVaultCreated,
  isLoading,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evaluate password strength criteria
  const hasMinLength = password.length >= 10;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMetCount = [
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: 'Empty', color: 'text-slate-500' };
    if (criteriaMetCount <= 2) return { label: 'Weak', color: 'text-red-400' };
    if (criteriaMetCount <= 4) return { label: 'Moderate', color: 'text-amber-400' };
    return { label: 'Strong', color: 'text-emerald-400' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Master password must be at least 8 characters long (10+ recommended).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    try {
      await onVaultCreated(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize encrypted vault.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Create Encrypted Vault
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Zero-knowledge architecture. Your master password encrypts all credentials client-side with AES-256-GCM.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-xs sm:text-sm text-red-300">
            {error}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong, memorable master password"
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

            {/* Strength meter indicator */}
            {password.length > 0 && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Strength</span>
                  <span className={`font-medium ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 h-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-full rounded-full transition-colors ${
                        criteriaMetCount >= level
                          ? criteriaMetCount <= 2
                            ? 'bg-red-500'
                            : criteriaMetCount <= 4
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Confirm Master Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your master password"
                required
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Guidelines checklist */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-2">
            <p className="text-xs font-medium text-slate-400">Password Requirements</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>10+ characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Uppercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lowercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber && hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Numbers & symbols</span>
              </div>
            </div>
          </div>

          {/* Zero knowledge warning */}
          <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs text-amber-300/90 leading-relaxed">
            <span className="font-semibold text-amber-200">Important:</span> AegisVault has no servers or recovery keys.
            If you forget your master password, your stored vault cannot be recovered by anyone.
          </div>

          <button
            type="submit"
            disabled={isLoading || password.length === 0}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deriving Key & Initializing...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Create & Encrypt Vault</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
