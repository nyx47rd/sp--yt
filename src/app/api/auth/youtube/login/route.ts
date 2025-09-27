import { NextResponse } from 'next/server';
import { youtubeOauth2Client, youtubeScopes } from '@/lib/youtube';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const state = uuidv4();

  const authorizeUrl = youtubeOauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: youtubeScopes,
    state: state,
    prompt: 'consent', // This ensures we get a refresh token every time
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('youtube_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
  });

  return response;
}