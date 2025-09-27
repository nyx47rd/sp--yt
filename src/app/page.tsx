"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface SyncResult {
  message: string;
  added?: number;
  skipped?: number;
  total_spotify_liked?: number;
  failures: string[];
}

export default function Home() {
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false);
  const [isYouTubeAuthenticated, setIsYouTubeAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const searchParams = useSearchParams();

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      if (response.ok) {
        setIsSpotifyAuthenticated(data.isSpotifyAuthenticated);
        setIsYouTubeAuthenticated(data.isYouTubeAuthenticated);
      }
    } catch (error) {
      console.error("Failed to fetch auth status", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check auth status on initial load and when the `login=success` param is present
    checkAuthStatus();
  }, [searchParams]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/sync/start');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred during sync.');
      }
      setSyncResult(data);
    } catch (error: any) {
      setSyncResult({
        message: "Synchronization failed.",
        failures: [error.message],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
            <p className="text-lg">Loading authentication status...</p>
        </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Spoti-Sync</h1>
        <p className="text-lg text-gray-400 mb-8">Sync your Spotify Liked Songs to YouTube Music effortlessly.</p>
      </div>

      <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
        <div className="space-y-4">
          {!isSpotifyAuthenticated ? (
            <a href="/api/auth/spotify/login" className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded transition duration-300">
              1. Login with Spotify
            </a>
          ) : (
            <div className="flex items-center justify-center bg-green-700 text-white font-bold py-3 px-4 rounded">
              <span>✓ Spotify Connected</span>
            </div>
          )}

          {!isYouTubeAuthenticated ? (
            <a href="/api/auth/youtube/login" className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition duration-300">
              2. Login with YouTube
            </a>
          ) : (
            <div className="flex items-center justify-center bg-red-800 text-white font-bold py-3 px-4 rounded">
              <span>✓ YouTube Connected</span>
            </div>
          )}
        </div>

        {isSpotifyAuthenticated && isYouTubeAuthenticated && (
          <div className="mt-8">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Start Sync'}
            </button>
          </div>
        )}

        {syncResult && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Sync Status</h3>
            <p className="text-gray-300">{syncResult.message}</p>
            {typeof syncResult.added === 'number' && (
                <p className="text-sm text-green-400">Songs added: {syncResult.added}</p>
            )}
            {typeof syncResult.skipped === 'number' && (
                <p className="text-sm text-gray-400">Skipped (already in playlist): {syncResult.skipped}</p>
            )}
            {syncResult.failures && syncResult.failures.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold">Details:</h4>
                <ul className="list-disc list-inside text-sm text-red-400 max-h-40 overflow-y-auto">
                  {syncResult.failures.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}