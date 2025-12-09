import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import {
  autoSync,
  manualSync,
  hasRemoteData,
  getLastSyncTime
} from '../lib/sync';

interface SyncProps {
  onSyncComplete?: () => void;
}

export default function Sync({ onSyncComplete }: SyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const [hasRemote, setHasRemote] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const time = await getLastSyncTime();
        const remote = await hasRemoteData();

        setLastSyncTimeState(time ? new Date(time) : null);
        setHasRemote(remote);
      } catch (error) {
        console.error('Error checking sync status:', error);
      }
    };

    checkSyncStatus();

    // Set up auto-sync interval
    if (autoSyncEnabled) {
      const interval = setInterval(async () => {
        try {
          await autoSync();
          const time = await getLastSyncTime();
          setLastSyncTimeState(time ? new Date(time) : null);
        } catch (error) {
          console.error('Error during auto-sync:', error);
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoSyncEnabled]);

  const handleManualSync = async (preferLocal: boolean = false) => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncMessage('');

    try {
      const success = await manualSync(preferLocal);

      if (success) {
        setSyncStatus('success');
        setSyncMessage(preferLocal
          ? 'Your data has been uploaded to the cloud.'
          : 'Your data has been synced with the cloud.');

        // Update last sync time
        const time = await getLastSyncTime();
        setLastSyncTimeState(time ? new Date(time) : null);

        // Check if remote data exists now
        const remote = await hasRemoteData();
        setHasRemote(remote);

        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setSyncStatus('error');
        setSyncMessage('Sync failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
      setSyncStatus('error');
      setSyncMessage('An error occurred during sync.');
    } finally {
      setIsSyncing(false);

      // Clear status message after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    }
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Cross-Device Sync
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Last sync:
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatLastSyncTime()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Remote data:
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {hasRemote ? 'Available' : 'None'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Auto-sync:
          </span>
          <button
            onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSyncEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {syncMessage && (
          <div className={`flex items-start gap-2 p-2 rounded-md ${syncStatus === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : syncStatus === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
            }`}>
            {syncStatus === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {syncStatus === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {syncStatus === 'idle' && <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <span className="text-xs">{syncMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          {hasRemote && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-3 h-3" />
              <span>Remote data found. Choose how to sync:</span>
            </div>
          )}

          <div className="flex gap-2">
            {hasRemote && (
              <button
                onClick={() => handleManualSync(false)}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    Download
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleManualSync(true)}
              disabled={isSyncing}
              className={`${hasRemote ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudOff className="w-4 h-4" />
                  {hasRemote ? 'Upload' : 'Sync Now'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sync uses Chrome's storage to keep your tasks consistent across devices.
            Changes are automatically synced every 5 minutes when enabled.
          </p>
        </div>
      </div>
    </div>
  );
}