import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'spoti-sync-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
};

// This is the type of your session data.
// It can be anything you want, but should be serializable.
export interface SessionData extends IronSessionData {
  spotify_access_token?: string;
  spotify_refresh_token?: string;
  spotify_token_expires_in?: number;
  youtube_access_token?: string;
  youtube_refresh_token?: string;
  youtube_token_expiry_date?: number;
}


export async function getSession(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  return session;
}

// A helper to get the session from a Route Handler
export async function getSessionFromRouteHandler() {
    return getIronSession<SessionData>(cookies(), sessionOptions);
}