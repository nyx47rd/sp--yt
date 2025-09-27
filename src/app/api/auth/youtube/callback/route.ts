import { NextRequest, NextResponse } from 'next/server';
import { youtubeOauth2Client } from '@/lib/youtube';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get('youtube_auth_state')?.value;

  if (state === null || state !== storedState) {
    return new NextResponse('State mismatch', { status: 400 });
  }

  if (!code) {
    return new NextResponse('Code not found', { status: 400 });
  }

  // Clear the state cookie
  cookies().delete('youtube_auth_state');

  try {
    const { tokens } = await youtubeOauth2Client.getToken(code);
    const { access_token, refresh_token, expiry_date } = tokens;

    if (!access_token) {
        return new NextResponse('Access token not found', { status: 400 });
    }

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);

    session.youtube_access_token = access_token;
    if (refresh_token) {
      session.youtube_refresh_token = refresh_token;
    }
    if (expiry_date) {
        session.youtube_token_expiry_date = expiry_date;
    }

    await session.save();

    return NextResponse.redirect(new URL('/?login=success', request.url));

  } catch (error) {
    console.error('Error getting youtube tokens:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}