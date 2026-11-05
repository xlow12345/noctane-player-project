# Noctane

Noctane is a Windows desktop music discovery and playback app built with Tauri 2, React, TypeScript, Vite, Tailwind CSS, Motion, Zustand, and Rust. YouTube video playback uses the official embedded player, and local audio plays through the Windows WebView media engine.

## Provider research and supported scope

Noctane presents one player and one navigation experience while keeping each provider's playback implementation and identifiers intact:

| Provider | Official capabilities | Noctane status |
| --- | --- | --- |
| **YouTube / YouTube Music** | The YouTube Data API searches videos and playlists. The official IFrame Player can play eligible videos, subject to owner, region, account, and policy restrictions. There is no public YouTube Music catalog API here, so results are YouTube videos—not verified YouTube Music tracks. Desktop embedded players must send an HTTPS `Referer` identifying the installed app. | **Unified in-app search and official embedded playback.** YouTube playback started in Noctane is recorded locally; YouTube does not provide a listening-history endpoint to this app. An API key is required for search. |
| **Spotify** | The Web API provides OAuth, library, catalog, recently-played, and top-listening endpoints. The official Web Playback SDK plays audio in a browser player and requires an eligible Premium account. | **Unified in-app search, account library, provider history, and playback.** OAuth PKCE and Web Playback SDK remain provider-specific internally; results and mixed-provider playback queue use Noctane's shared track model. |
| **SoundCloud** | The API offers public-resource search and its official Widget API. Track availability and playback vary. | **Not connected.** No SoundCloud catalog or playback integration exists; Noctane does not invent results or hand off a separate search experience. |
| **Audius** | The public discovery API exposes track search, metadata, artwork, and streaming endpoints. Read-only search does not require an account or API key. | **Unified search only.** Audius tracks appear alongside other providers with their original IDs and canonical web links. In-app Audius playback and Autoplay are not integrated yet; no stream playback is claimed here. |
| **Apple Music (future candidate)** | MusicKit provides documented catalog and playback capabilities subject to Apple developer setup, user authorization, subscription, and territory requirements. | Not implemented; assess Apple’s current [MusicKit documentation](https://developer.apple.com/documentation/musickit) and terms before any integration. |

Provider connections are managed in Settings. Search requests all available sources together, while a subtle source label and the original provider ID preserve provider identity. Audius is a public, read-only search source in this phase; its playback integration is not complete. Switching between Spotify, YouTube, and local tracks does not clear the shared queue. Spotify's developer policy and SDK/commercial terms still apply; obtain Spotify's required approval before any commercial or broad public distribution.

Other useful official references:

- [YouTube Data API `search.list`](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube API Terms](https://developers.google.com/youtube/terms/api-services-terms-of-service) and [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [Spotify Web API search](https://developer.spotify.com/documentation/web-api/reference/search), [authorization](https://developer.spotify.com/documentation/web-api/concepts/authorization), and [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [SoundCloud API guide](https://developers.soundcloud.com/docs/api/guide) and [Widget API](https://developers.soundcloud.com/docs/api/html5-widget)
- [Audius API reference](https://docs.audius.co/api/) and [Audius](https://audius.co/)

### Sonora reference investigation

The [Sonora provider documentation](https://sonorahq.org/docs/providers) describes browser-based authorization returning to a loopback callback at `127.0.0.1:8989`, Premium-only playback, and an app-local Spotify device. Sonora's public source depends on `librespot` for its Spotify session, library, and playback stack; its docs also note that Spotify may refuse playback keys for some accounts. Noctane does not copy Sonora source or reuse its Client ID. The implementation here uses Spotify's documented OAuth PKCE, Web API, and Web Playback SDK rather than librespot's unofficial protocol, so audio is rendered by Spotify's official player SDK in Noctane's WebView.

The official SDK creates Noctane's own Spotify playback device. OAuth refresh credentials are kept in Windows Credential Manager; access tokens are supplied to Spotify's SDK only as needed. Playlist and library reads use allowlisted Rust API operations rather than an arbitrary URL proxy. The Spotify Web API's development mode currently requires the app owner to have Premium and allows up to five allowlisted users. As of May 15, 2025, new extended-quota requests are limited to organizations meeting Spotify's published criteria. Spotify also says its Web Playback SDK may not be used in commercial projects without prior written approval.

## Current implementation

- **Unified search:** one debounced query searches Spotify, YouTube videos and playlists, Audius public tracks, and matching local tracks. Provider results arrive independently, are interleaved in one list, and keep their original IDs. Per-provider failures do not block other sources. SoundCloud is not connected.
- **YouTube playback:** results and playlists load into the official IFrame Player inside Noctane. The compact player remains visible while playing and pauses when closed; YouTube video cannot be turned into audio-only playback here. The Windows WebView2 request hook sets the HTTPS app-identity `Referer`; the player receives the current WebView origin. YouTube may still block individual videos due to owner, region, age, or account restrictions. A successful build alone does not establish live playback.
- **Unified Home and Library:** Home displays only real mixed listening history, provider/local playlists, actual Spotify top tracks, and dated local imports. A local event database distinguishes Spotify-supplied history from playback recorded by Noctane; duplicate event IDs are ignored. Library combines local tracks and playlists with Spotify saved tracks and playlists. Missing artwork uses a neutral icon.
- **Local music:** import audio files or folders into a library saved under the app's per-user data directory. Create persistent local playlists, queue tracks, and control shuffle and repeat. No audio files are copied or uploaded. Metadata and embedded artwork are read when available; playback format support depends on Windows WebView2 codecs.
- **Spotify:** connect in Settings through Spotify's browser authorization page with PKCE and the `127.0.0.1:8989/callback` redirect. The official recently-played endpoint requires `user-read-recently-played`; top tracks, playlists, saved tracks, and catalog search use supported Web API operations. The official Web Playback SDK creates a Noctane player device and streams inside the app. Playback requires Spotify Premium and supported account/region access. Account-based runtime testing is still required.
- **SoundCloud:** no integration or separate search handoff.
- **Audius:** public read-only catalog search is included in unified search. No account or API key is required. In-app playback and Autoplay are not integrated yet.
- **No YouTube account login:** YouTube’s search API key is not a user account token.
- **No fabricated content:** Home, Search, Library, and Playlists render only provider or local data. Empty states appear when there is no real data.

For the installed application, set `NOCTANE_YOUTUBE_API_KEY` as a Windows user or system environment variable, then fully restart Noctane. The previous `NOCTURNE_YOUTUBE_API_KEY` variable is still accepted for existing setups. The key is read by the native Rust process at runtime and is not embedded in the installer.

The YouTube API `search.list` endpoint costs 100 quota units per request. Searching videos or playlists uses one request per settled query; the standard 10,000-unit daily project quota therefore allows about 100 such searches before other API calls. See [YouTube quota costs](https://developers.google.com/youtube/v3/determine_quota_cost) and configure quota limits in Google Cloud.

## Configure Spotify in-app playback

1. Create a Spotify app in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) using your own developer account.
2. Add this exact Redirect URI to the app: `http://127.0.0.1:8989/callback`.
3. Copy the app's Client ID into **Settings → Spotify** in Noctane. A client secret is not used or requested.
4. If Spotify's app is in Development Mode, the app owner needs Premium and the Spotify account you authorize must be added as an allowed user in the dashboard (up to five users total).
5. Select **Connect Spotify**, approve the requested account/library/playback permissions in the browser, and return to Noctane.

Noctane does not ask for a Spotify client secret. Disconnecting removes the refresh credential from Windows Credential Manager; you can also revoke the app under your Spotify account's app connections. Spotify playback requires Premium. A Spotify app still in development mode is limited to its allowlist; expanded public access requires Spotify approval, and commercial use of the Web Playback SDK requires prior written approval. Recommendation availability and SDK playback eligibility are determined by Spotify, not Noctane.

## Configure YouTube search (PowerShell)

1. Create a Google Cloud project, enable **YouTube Data API v3**, and create an API key. Restrict the key to the YouTube Data API and set suitable quota limits. Desktop API keys cannot be treated as confidential; do not embed a production key in source code or distribute an unrestricted shared key.
2. Set `NOCTANE_YOUTUBE_API_KEY` in the environment of the Noctane process. For a development session:

   ```powershell
   $env:NOCTANE_YOUTUBE_API_KEY = "YOUR_RESTRICTED_API_KEY"
   npm install
   npm run tauri dev
   ```

   Restart the app after changing the environment variable. For a local-only browser preview use `npm run dev`; provider search intentionally requires the installed Tauri app.

3. Before public distribution, provide a published privacy-policy URL and maintainer contact, complete YouTube API client identity requirements, and have the API client reviewed for policy compliance. The in-app notice describes the app’s search and embedded-player data flows; it is not a substitute for the publisher’s final legal/privacy documentation.

YouTube search terms are sent to Google’s Data API. Search results are held in memory for the current app session. Embedded playback loads YouTube’s official player and may process device information or cookies under Google’s own policies. Spotify data is retrieved from Spotify only after user authorization, and Spotify playback is isolated from other provider playback.

## Windows requirements and commands

- Node.js 20.19+ or 22.12+ with npm
- Rust stable using the MSVC toolchain
- Microsoft C++ Build Tools with **Desktop development with C++**
- Microsoft Edge WebView2 Runtime

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run tauri dev
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run build:windows
```

`npm test` covers Spotify normalization plus unified history ordering/deduplication, local playback history, provider routing, missing artwork, empty Home, mixed search ordering, Audius query/normalization/failure isolation, and playback-preserving navigation.
`npm run build:windows` creates the production NSIS installer and copies it to `installer/Noctane-Setup.exe`. The installer creates a Noctane Start Menu entry and a desktop shortcut. It installs per-user by default; WebView2 is handled by the Tauri Windows installer if it is missing.

**Verification note:** the YouTube integration requires a valid API key and network access for live-provider testing. A successful frontend build does not verify a Google API key, quota, video availability, or embedded playback; those must be tested separately in the Windows desktop app.
