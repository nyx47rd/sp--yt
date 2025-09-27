import { NextRequest, NextResponse } from 'next/server';
import { spotifyApi } from '@/lib/spotify';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get('spotify_auth_state')?.value;

  if (state === null || state !== storedState) {
    return new NextResponse('State mismatch', { status: 400 });
  }

  if (!code) {
    return new NextResponse('Code not found', { status: 400 });
  }

  // Clear the state cookie
  cookies().delete('spotify_auth_state');

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);

    session.spotify_access_token = access_token;
    session.spotify_refresh_token = refresh_token;
    session.spotify_token_expires_in = Date.now() + expires_in * 1000;

    await session.save();

    return NextResponse.redirect(new URL('/?login=success', request.url));

  } catch (error) {
    console.error('Error getting spotify tokens:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}