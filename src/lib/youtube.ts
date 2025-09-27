import { google } from 'googleapis';

export const youtubeOauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

export const youtubeScopes = [
  'https://www.googleapis.com/auth/youtube',
];

export const youtube = google.youtube({
  version: 'v3',
  auth: youtubeOauth2Client,
});