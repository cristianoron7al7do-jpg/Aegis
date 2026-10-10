import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { DecryptedCredential } from '../types/vault';

interface CredentialCardProps {
  credential: DecryptedCredential;
  onDelete: (id: string) => Promise<void>;
}

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onDelete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const copyToClipboard = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 2000);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(credential.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const initial = credential.site.charAt(0).toUpperCase() || '?';

  // Format valid web URL
  const formattedUrl = credential.url
    ? credential.url.startsWith('http://') || credential.url.startsWith('https://')
      ? credential.url
      : `https://${credential.url}`
    : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between group">
      <div className="space-y-4">
        {/* Header: Monogram + Site Name + URL + Action buttons */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0 select-none">
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-100 truncate" title={credential.site}>
                {credential.site}
              </h3>
              {formattedUrl ? (
                <a
                  href={formattedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors truncate max-w-[200px] sm:max-w-[280px]"
                  title={credential.url}
                >
                  <span className="truncate">{credential.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-xs text-slate-500">Local credential</span>
              )}
            </div>
          </div>

          {/* Quick Actions (Delete) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Delete credential"
              aria-label="Delete credential"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Username Row */}
        {credential.username && (
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Username / Account</span>
            <div className="flex items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-2">
              <span className="text-xs sm:text-sm text-slate-200 truncate select-all" title={credential.username}>
                {credential.username}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(credential.username, 'username')}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                title="Copy username"
              >
                {copiedField === 'username' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Password Row */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Password</span>
          <div className="flex items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-2">
            <div className="min-w-0 flex-1">
              {showPassword ? (
                <span className="text-xs sm:text-sm font-mono text-emerald-300 break-all select-all">
                  {credential.password}
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-mono text-slate-400 tracking-widest select-none">
                  ••••••••••••••••
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(credential.password, 'password')}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer flex items-center gap-1"
                title="Copy password"
              >
                {copiedField === 'password' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notes (truncated preview with expand for very long values) */}
        {credential.notes && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Secure Notes</span>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
              >
                <span>{isExpanded ? 'Collapse' : 'Show full'}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <div
              className={`bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5 text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed ${
                isExpanded ? 'max-h-60 overflow-y-auto' : 'line-clamp-2'
              }`}
            >
              {credential.notes}
            </div>
          </div>
        )}
      </div>

      {/* Footer: unboxed metadata */}
      <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span>AES-256 encrypted</span>
        <span>
          {new Date(credential.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-100">Delete Credential?</h4>
                <p className="text-xs text-slate-400">
                  Are you sure you want to delete the record for <strong className="text-slate-200">{credential.site}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
