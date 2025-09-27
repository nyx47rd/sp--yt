import { NextResponse } from 'next/server';
import { getSessionFromRouteHandler } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionFromRouteHandler();

    const { spotify_access_token, youtube_access_token } = session;

    return NextResponse.json({
      isSpotifyAuthenticated: !!spotify_access_token,
      isYouTubeAuthenticated: !!youtube_access_token,
    });
  } catch (error) {
    console.error('Error getting auth status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}