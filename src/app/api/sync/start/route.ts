import { NextRequest, NextResponse } from 'next/server';
import { spotifyApi } from '@/lib/spotify';
import { youtube, youtubeOauth2Client } from '@/lib/youtube';
import Fuse from 'fuse.js';
import { getSessionFromRouteHandler } from '@/lib/session';
import { GaxiosError } from 'gaxios';

// Helper to get all items from a paginated Spotify endpoint
async function getAllSpotifyLikedSongs(accessToken: string) {
    spotifyApi.setAccessToken(accessToken);
    let tracks: SpotifyApi.SavedTrackObject[] = [];
    let offset = 0;
    const limit = 50;
    let response;

    do {
        response = await spotifyApi.getMySavedTracks({ limit, offset });
        tracks = tracks.concat(response.body.items);
        offset += limit;
    } while (response.body.next);

    return tracks;
}

// Helper to find a playlist or create it if it doesn't exist
async function findOrCreateYouTubePlaylist(playlistName: string): Promise<string> {
    const res = await youtube.playlists.list({
        part: ['snippet'],
        mine: true,
        maxResults: 50,
    });

    const existingPlaylist = res.data.items?.find(p => p.snippet?.title === playlistName);
    if (existingPlaylist?.id) {
        return existingPlaylist.id;
    }

    const newPlaylist = await youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
            snippet: {
                title: playlistName,
                description: 'Synced from Spotify Liked Songs by Spoti-Sync-App',
            },
            status: {
                privacyStatus: 'private',
            },
        },
    });

    if (!newPlaylist.data.id) {
        throw new Error('Could not create YouTube playlist');
    }
    return newPlaylist.data.id;
}

// Helper to get all video IDs from a YouTube playlist
async function getAllYouTubePlaylistItems(playlistId: string): Promise<Set<string>> {
    const videoIds = new Set<string>();
    let nextPageToken: string | undefined = undefined;

    do {
        const response = await youtube.playlistItems.list({
            part: ['snippet'],
            playlistId: playlistId,
            maxResults: 50,
            pageToken: nextPageToken,
        });

        response.data.items?.forEach(item => {
            if (item.snippet?.resourceId?.videoId) {
                videoIds.add(item.snippet.resourceId.videoId);
            }
        });

        nextPageToken = response.data.nextPageToken ?? undefined;
    } while (nextPageToken);

    return videoIds;
}

export async function GET(request: NextRequest) {
    const session = await getSessionFromRouteHandler();
    let {
        spotify_access_token,
        spotify_refresh_token,
        spotify_token_expires_in,
        youtube_access_token,
        youtube_refresh_token,
        youtube_token_expiry_date,
    } = session;

    if (!spotify_refresh_token || !youtube_refresh_token) {
        return new NextResponse('Missing refresh tokens. Please re-authenticate.', { status: 401 });
    }

    let sessionModified = false;

    // Refresh Spotify token if needed
    if (!spotify_access_token || !spotify_token_expires_in || Date.now() > spotify_token_expires_in) {
        console.log("Refreshing Spotify token...");
        try {
            spotifyApi.setRefreshToken(spotify_refresh_token);
            const data = await spotifyApi.refreshAccessToken();
            spotify_access_token = data.body['access_token'];
            session.spotify_access_token = spotify_access_token;
            session.spotify_token_expires_in = Date.now() + data.body['expires_in'] * 1000;
            sessionModified = true;
        } catch (error) {
            console.error('Could not refresh Spotify token:', error);
            return new NextResponse('Could not refresh Spotify token. Please re-authenticate.', { status: 401 });
        }
    }

    // Refresh YouTube token if needed
    if (!youtube_access_token || !youtube_token_expiry_date || Date.now() > youtube_token_expiry_date) {
        console.log("Refreshing YouTube token...");
        try {
            youtubeOauth2Client.setCredentials({ refresh_token: youtube_refresh_token });
            const { credentials } = await youtubeOauth2Client.refreshAccessToken();
            youtube_access_token = credentials.access_token!;
            session.youtube_access_token = credentials.access_token;
            session.youtube_token_expiry_date = credentials.expiry_date;
            if (credentials.refresh_token) {
                session.youtube_refresh_token = credentials.refresh_token;
            }
            sessionModified = true;
        } catch (error) {
            console.error('Could not refresh YouTube token:', error);
            return new NextResponse('Could not refresh YouTube token. Please re-authenticate.', { status: 401 });
        }
    }

    if (sessionModified) {
        await session.save();
    }

    // Initialize API clients
    spotifyApi.setAccessToken(spotify_access_token!);
    youtubeOauth2Client.setCredentials({
        access_token: youtube_access_token,
        refresh_token: youtube_refresh_token,
    });

    try {
        const spotifyTracks = await getAllSpotifyLikedSongs(spotify_access_token!);
        if (spotifyTracks.length === 0) {
            return NextResponse.json({ message: 'No liked songs found on Spotify.' });
        }

        const playlistId = await findOrCreateYouTubePlaylist('Spotify Liked Songs');
        const existingYouTubeVideoIds = await getAllYouTubePlaylistItems(playlistId);
        console.log(`Found ${existingYouTubeVideoIds.size} existing songs in the YouTube playlist.`);

        let successCount = 0;
        let skippedCount = 0;
        const failedTracks: string[] = [];

        for (const item of spotifyTracks) {
            const track = item.track;
            const query = `${track.name} ${track.artists[0].name}`;

            try {
                const searchResponse = await youtube.search.list({
                    part: ['snippet'],
                    q: query,
                    type: ['video'],
                    maxResults: 5,
                });

                if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                    failedTracks.push(`${track.name} by ${track.artists[0].name}`);
                    continue;
                }

                const fuse = new Fuse(searchResponse.data.items, { keys: ['snippet.title'], includeScore: true, threshold: 0.6 });
                const searchResults = fuse.search(query);

                if (searchResults.length === 0) {
                    failedTracks.push(`${track.name} by ${track.artists[0].name} (No good match)`);
                    continue;
                }

                const videoId = searchResults[0].item.id?.videoId;

                if (videoId) {
                    if (existingYouTubeVideoIds.has(videoId)) {
                        skippedCount++;
                        continue; // Skip if already in playlist
                    }

                    await youtube.playlistItems.insert({
                        part: ['snippet'],
                        requestBody: {
                            snippet: {
                                playlistId: playlistId,
                                resourceId: { kind: 'youtube#video', videoId: videoId },
                            },
                        },
                    });
                    existingYouTubeVideoIds.add(videoId); // Add to set to avoid duplicates in the same run
                    successCount++;
                } else {
                    failedTracks.push(`${track.name} by ${track.artists[0].name} (No video ID found)`);
                }
            } catch (error: any) {
                const gaxiosError = error as GaxiosError;
                if (gaxiosError.response?.status === 403 || gaxiosError.code === '403') {
                    console.error('YouTube API quota exceeded.');
                    return new NextResponse('YouTube API quota exceeded. Please try again later.', { status: 429 });
                }
                failedTracks.push(`${track.name} by ${track.artists[0].name} (API Error: ${gaxiosError.message})`);
            }
        }

        return NextResponse.json({
            message: `Sync complete. Added ${successCount} new songs. Skipped ${skippedCount} existing songs.`,
            added: successCount,
            skipped: skippedCount,
            total_spotify_liked: spotifyTracks.length,
            failures: failedTracks,
        });

    } catch (error) {
        console.error('An error occurred during sync:', error);
        return new NextResponse('An error occurred during sync.', { status: 500 });
    }
}