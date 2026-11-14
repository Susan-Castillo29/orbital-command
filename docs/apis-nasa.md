# NASA and JPL data sources

The **NASA** menu opens an observatory separate from simulated missions. Results come from the stated services and retain their original structure; they do not replace the game's orbital model and are not presented as the player's own measurements. The astronomy image of the day is shown when NASA supplies a compatible image and links to its original publication.

## Local configuration

Node.js 24 or later is required. The existing local key is stored in `.env.local` with `0600` permissions; that file is excluded from Git. The key is not included in source code, the build, documentation or local API responses. For another installation, create `.env.local` containing:

```dotenv
NASA_API_KEY=your_private_key_here
```

Do not share the file or add the key to a `VITE_*` variable, as Vite exposes those variables to the browser. The original PDF contains a key and should remain in a private location. If the key is accidentally disclosed, request a replacement.

```sh
npm ci
npm run dev
# Alternatively, build and run the local production server:
npm run build
PORT=4175 npm run serve
```

The workspace manager starts Vite on its assigned port. During development and preview, `vite.config.ts` registers the intermediary; `npm run serve` serves `dist/` and the API from the same origin on `127.0.0.1` only. Set `PORT` to change the server port. Existing environment variables take precedence over the local file.

GitHub Pages serves static files and **does not run the intermediary**. If a live request is unavailable, the observatory therefore falls back to public responses in `public/nasa-data/`. It shows the retrieval time and identifies them as published snapshots, not live data. If no snapshot exists for a source, it reports the failure. Refreshing the page does not automatically renew these responses.

To refresh the snapshots locally with a private key:

```sh
npm run nasa:update
# Selected sources only:
node scripts/update-nasa-snapshots.mjs apod neows
```

The script requests NASA data server-side, checks that the key does not appear in the files, saves successful responses and retains the previous version when a source fails. The APOD image is downloaded only from the authorised origin. Review usage rights and credits before making scientific files or images public.

To refresh snapshots during GitHub Pages deployments, a repository administrator can create the Actions secret `NASA_API_KEY` under **Settings → Secrets and variables → Actions**. The workflow passes it to the update process; if it is absent, the existing dated files are retained. GitHub encrypts secrets, but anyone able to modify the workflow could write code that reads them, so restrict that access. Never store the key or a decryption key in repository files. Subsequent deployment results should be checked in Actions; the existence or contents of a configured secret cannot be inferred from this document.

Live queries require a Node server or equivalent function and a same-origin reverse proxy to `/api/nasa`, with `NASA_API_KEY` configured as a provider secret. No public intermediary or reverse proxy is included in the GitHub Pages deployment.

## Implemented catalogue

The selector uses predefined options. NeoWs and DONKI dates are calculated from the current day. The interface shows the JSON response and retrieval time; it does not expose every parameter from the source APIs.

| Service | Interface options | Key required |
| --- | --- | --- |
| APOD | Current publication and image; new `science.nasa.gov/wp-json/wp/v2/apod-basic/` API | Yes |
| NeoWs | Previous seven-day feed, Eros and the first catalogue page | Yes |
| DONKI | FLR, CME, GST, IPS, SEP, MPC, RBE, HSS and notifications, previous seven days | Yes |
| EPIC | Recent natural-colour image metadata | Yes |
| TechPort | Project list | Yes |
| TechTransfer | Engine patent search using the current public API | No |
| NASA Images | Earth and Mars rover image searches | No |
| EONET | Open events and categories | No |
| Exoplanet Archive | 20 recent planetary-table records | No |
| Earthdata CMR | Ten collections related to sea level | No |
| Earthdata GIBS | WMTS capabilities check and received size | No |
| JPL Horizons | Mars heliocentric vector for recent dates | No |
| JPL CAD, SBDB, Sentry, Fireball, Scout | Close approaches, Ceres, impact risks, fireballs and recent objects | No |

EPIC displays public JPEGs from its official archive using the returned metadata; the NASA library displays thumbnails linked to the originals. The browser must be able to reach the official image domains. The application does not yet mount GIBS WMTS layers or provide free-text searches, arbitrary historical queries or full catalogue browsing. NASA has archived the former Mars rover photos endpoint; the game identifies it as archived rather than presenting it as an operational service. The former InSight weather and Earth APIs are also omitted.

## Security and behaviour

`server/nasa-proxy.mjs` accepts only known identifiers and constructs URLs server-side; it does not accept arbitrary client-supplied URLs. It permits GET only, rejects requests marked as cross-site, limits each local address to 30 requests per minute, caches results for five minutes, uses a 12-second timeout, limits response size and does not follow redirects. Errors do not return URLs containing the key. JSON responses are checked to redact literal occurrences of the key. The APOD image is fetched only from `assets.science.nasa.gov`, after an APOD request, with allowed image formats and a size limit. Remote HTML is not rendered.

These controls suit local operation. Before public exposure, configure TLS, HTTP headers, shared rate limits and reverse-proxy controls. A key sent to NASA in a query string may appear in provider or network infrastructure logs; the application does not log that URL. NASA's own limits also apply and may produce HTTP 429 responses. External services can change, fail, return no records or be archived.

## Verification record

- `npm test`: 27 tests passed at the recorded review, including rejected destinations and methods, caching, cross-site requests and key redaction using a simulated provider.
- `npm run build`: build passed.
- During the recorded live local review, 26 of 28 preset datasets responded successfully. `DONKI/FLR` returned 404; the former TechTransfer link redirected to another domain and was replaced with NASA's documented public API, which was tested successfully without sending the key. Availability can change and a successful response may contain an empty list.
- APOD and the actual JPEG image returned HTTP 200. The panel, APOD and EONET were checked in a browser; captures, when generated, are in `artifacts/nasa-1440.png` and `artifacts/nasa-390.png`.
- NASA data and images can have their own copyright or attribution requirements; consult the original publication.

Official references: [NASA Open APIs](https://api.nasa.gov/), [APOD and rover API notice](https://api.nasa.gov/assets/html/header.html), [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3), [JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html), [NASA Technology Transfer](https://technology.nasa.gov/api/).

## Pages snapshot preparation

The recorded preparation saved responses for 28 datasets and the APOD image using live requests. `DONKI/FLR` returned 404, so that option has no snapshot from that run. Data files have their own retrieval times and can become stale; static hosting does not update them live. The key is not included in those files.

## Galleries and complete responses

APOD, EPIC and the image library provide galleries with titles, dates and links to originals. Images load lazily; **Show more images** displays additional items from the current response. **Download complete data** exports the full JSON received, even when the on-screen preview is limited for performance. Queries still use preset parameters and do not automatically traverse every catalogue page.

The CSP permits images only from the site itself, `images-assets.nasa.gov`, `assets.science.nasa.gov` and `epic.gsfc.nasa.gov`. The key is not appended to these image URLs. If NASA or the network cannot serve an image, its card links to the original. See the [official EPIC documentation](https://epic.gsfc.nasa.gov/about/api) and [NASA image library documentation](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf).
