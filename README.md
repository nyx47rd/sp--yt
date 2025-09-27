# Spoti-Sync

Spoti-Sync is a full-stack web application that allows users to synchronize their "Liked Songs" from Spotify to a new playlist on YouTube Music. It's built with Next.js, TypeScript, and Tailwind CSS, and is designed to be deployed on Vercel.

## Features

-   **Spotify Integration**: Securely connect your Spotify account using OAuth 2.0.
-   **YouTube Music Integration**: Securely connect your YouTube account using OAuth 2.0.
-   **One-Way Sync**: Fetches all your liked songs from Spotify.
-   **Smart Matching**: Uses fuzzy string matching (`fuse.js`) to find the correct songs on YouTube.
-   **Playlist Management**: Automatically creates a "Spotify Liked Songs" playlist in your YouTube Music account if it doesn't exist.
-   **Duplicate Prevention**: Checks for existing songs in the playlist to avoid adding duplicates on subsequent syncs.
-   **Secure Session Management**: Encrypts and stores authentication tokens in secure, HTTP-only cookies using `iron-session`.

## Current Limitations

-   **Manual Sync Only**: This version of the application only supports manual synchronization initiated by the user by clicking the "Start Sync" button. The automatic background synchronization feature using Vercel Cron Jobs has been temporarily removed due to architectural complexities related to running background jobs without a user session. This feature may be added in a future release with a more robust architecture (e.g., using a database to store refresh tokens).

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   npm or yarn
-   A Spotify Developer account
-   A Google Cloud account

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd spoti-sync
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    -   Copy the example environment file:
        ```bash
        cp .env.example .env.local
        ```
    -   Open `.env.local` and fill in the required credentials. See the sections below for instructions on how to get your API keys.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Obtaining API Credentials

#### Spotify

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2.  Click "Create an App".
3.  Give your app a name and description.
4.  Once created, you will see your `Client ID`. Click "Show client secret" to get the `Client Secret`.
5.  Add these to your `.env.local` file as `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
6.  Go to "App Settings" and add a "Redirect URI": `http://localhost:3000/api/auth/spotify/callback`. Make sure this matches `SPOTIFY_REDIRECT_URI` in your `.env.local` file.

#### YouTube (Google Cloud)

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  In the sidebar, go to "APIs & Services" -> "Enabled APIs & services".
4.  Click "+ ENABLE APIS AND SERVICES" and search for "YouTube Data API v3". Enable it.
5.  Go to "APIs & Services" -> "Credentials".
6.  Click "+ CREATE CREDENTIALS" -> "OAuth client ID".
7.  If prompted, configure the consent screen. Choose "External" and fill in the required fields (app name, user support email, developer contact). You don't need to submit for verification for local testing.
8.  For the OAuth client ID, select "Web application".
9.  Under "Authorized redirect URIs", add `http://localhost:3000/api/auth/youtube/callback`.
10. Click "Create". You will be shown your `Client ID` and `Client Secret`.
11. Add these to your `.env.local` file as `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`.

### Generating a Session Secret

For session encryption, you need a strong, random secret key. You can generate one using OpenSSL in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it into the `SESSION_SECRET` field in your `.env.local` file.