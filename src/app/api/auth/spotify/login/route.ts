import { NextResponse } from 'next/server';
import { spotifyApi, scopes } from '@/lib/spotify';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const state = uuidv4();
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

  const response = NextResponse.redirect(authorizeURL);
  response.cookies.set('spotify_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
  });

  return response;
}