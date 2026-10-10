/**
 * Cross-tab synchronization via BroadcastChannel.
 * Guarantees that locking the vault in any open tab instantly locks all other tabs.
 */

const CHANNEL_NAME = 'aegis_vault_sync_channel';

type SyncMessage =
  | { type: 'LOCK' }
  | { type: 'VAULT_UPDATED' }
  | { type: 'VAULT_RESET' };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!('BroadcastChannel' in window)) return null;

  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
}

/**
 * Broadcasts a lock event to all open tabs.
 */
export function broadcastLock(): void {
  const ch = getChannel();
  ch?.postMessage({ type: 'LOCK' } as SyncMessage);
}

/**
 * Broadcasts a change event (e.g. credential added or deleted) so other open tabs can refresh.
 */
export function broadcastVaultUpdated(): void {
  const ch = getChannel();
  ch?.postMessage({ type: 'VAULT_UPDATED' } as SyncMessage);
}

/**
 * Subscribes to cross-tab vault messages.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToSync(
  onLock: () => void,
  onUpdate: () => void,
  onReset: () => void
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handleMessage = (event: MessageEvent<SyncMessage>) => {
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
      case 'LOCK':
        onLock();
        break;
      case 'VAULT_UPDATED':
        onUpdate();
        break;
      case 'VAULT_RESET':
        onReset();
        break;
    }
  };

  ch.addEventListener('message', handleMessage);

  return () => {
    ch.removeEventListener('message', handleMessage);
  };
}
