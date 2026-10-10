import React, { useState, useMemo } from 'react';
import {
  Shield,
  Lock,
  Plus,
  Search,
  X,
  AlertTriangle,
  KeyRound,
  Database,
  ExternalLink,
} from 'lucide-react';
import { DecryptedCredential, RawCredentialPayload } from '../types/vault';
import { CredentialCard } from './CredentialCard';
import { AddCredentialModal } from './AddCredentialModal';

interface VaultDashboardProps {
  credentials: DecryptedCredential[];
  corruptedCount: number;
  onLock: () => void;
  onAddCredential: (payload: RawCredentialPayload) => Promise<void>;
  onDeleteCredential: (id: string) => Promise<void>;
}

export const VaultDashboard: React.FC<VaultDashboardProps> = ({
  credentials,
  corruptedCount,
  onLock,
  onAddCredential,
  onDeleteCredential,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Alphabetical sort by site name (case-insensitive). Duplicate site entries permitted.
  const sortedCredentials = useMemo(() => {
    return [...credentials].sort((a, b) =>
      a.site.localeCompare(b.site, undefined, { sensitivity: 'base' })
    );
  }, [credentials]);

  // Real-time filter across site, username, url, and notes
  const filteredCredentials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedCredentials;

    return sortedCredentials.filter((c) => {
      return (
        c.site.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.url.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
      );
    });
  }, [sortedCredentials, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Security Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base tracking-tight">AegisVault</span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  AES-256-GCM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Zero-knowledge client-side encryption
              </p>
            </div>
          </div>

          {/* Quick Stats & Lock Vault Button */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-medium text-slate-300">
                {credentials.length} {credentials.length === 1 ? 'credential' : 'credentials'} stored
              </p>
              <p className="text-[10px] text-slate-500">IndexedDB local vault</p>
            </div>

            <button
              type="button"
              onClick={onLock}
              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700/60 transition-colors cursor-pointer"
              title="Lock vault immediately"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock Vault</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Corrupted records warning if any individual record failed decryption */}
        {corruptedCount > 0 && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-200">
                Decryption Notice
              </h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {corruptedCount} {corruptedCount === 1 ? 'record' : 'records'} in your local database could not be decrypted.
                They may have been encrypted with a different key or tampered with. To ensure safety, they were skipped and the vault remains operational.
              </p>
            </div>
          </div>
        )}

        {/* Toolbar: Search & Add Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search site, username, or notes..."
              className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Credential</span>
            </button>
          </div>
        </div>

        {/* Credentials Grid or Empty States */}
        {credentials.length === 0 ? (
          /* Empty Vault */
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl p-8 bg-slate-900/30 space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-emerald-400 border border-slate-700/60">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">Your vault is empty</h3>
              <p className="text-xs text-slate-400">
                Start securing your logins. Every credential is encrypted with AES-GCM before saving to your device's IndexedDB.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Credential</span>
            </button>
          </div>
        ) : filteredCredentials.length === 0 ? (
          /* Search Yielded No Results */
          <div className="py-12 text-center border border-slate-800 rounded-xl p-8 bg-slate-900/20 space-y-3">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-300">No matching credentials found</h3>
              <p className="text-xs text-slate-500">
                No saved logins match &quot;{searchQuery}&quot;. Try a different keyword or check spelling.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-emerald-400 hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Credentials Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCredentials.map((cred) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                onDelete={onDeleteCredential}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer / Offline status */}
      <footer className="border-t border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>Local IndexedDB · Fully offline · Zero telemetry</span>
        </div>
        <div>
          <span>Non-extractable derived keys · BroadcastChannel cross-tab lock</span>
        </div>
      </footer>

      {/* Add Credential Modal */}
      <AddCredentialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddCredential}
      />
    </div>
  );
};
