# ORBITAL COMMAND — THE LAST HORIZON

ORBITAL COMMAND is an educational space exploration game built with React, TypeScript, Vite and Three.js. The campaign links spacecraft design, mission planning, exploration and scientific reporting to a central purpose: learning about the Solar System to understand and protect our home planet.

The original mission centre and 3D navigation remain in place. Campaign chapters unlock progressively, beginning with Earth. The player can configure a spacecraft, manage resources, travel using simulated mission time, explore suitable surfaces or remote environments, and transmit a scientific report.

## Scientific scope

The planetary environments, launch windows, transit profiles, simulated sensor readings and mission results are educational models. They are not current ephemerides, scientific measurements or predictions. The in-game NASA observatory separately displays data obtained from NASA and JPL, with the source and retrieval time. On GitHub Pages, it falls back to dated published snapshots when a live server is unavailable.

Earth-based cooperation is part of the story. The Dominican tracking station is fictional; real tracking stations appear only as educational context and are not connected to the game. [Texture credits and limitations](public/textures/README.md) and [vector artwork details](public/illustrations/README.md) accompany the assets.

## AI-assisted development and voice

AI-assisted development was used when creating parts of the software, including the code for the commander experience and procedural 3D Solar System visualisation. The planets and vehicles are rendered by Three.js using code, geometry and credited textures; they are not presented as scientifically accurate generative models.

The commander's speech uses the browser's speech synthesis service. The available voices and whether they use neural or other synthesis depend on the player's browser and operating system. The project does not guarantee a particular accent, human performer or AI voice engine.

## Run locally

Requirements: Node.js 24 or later and a browser with WebGL. Available voices depend on the browser and operating system.

```sh
npm ci
npm run dev
npm run build
npm test
# With the project server and browser test tools running:
npm run test:developers
npm run test:impact
npm run test:accessibility
```

Open the address printed by Vite. In this workspace, `./scripts/gestor-local.sh start orbital-command` starts the registered project on an available port beginning at 4174.

The NASA observatory uses a server-side intermediary for requests requiring a key. Configure `NASA_API_KEY` in `.env.local`; do not commit that file or use a `VITE_` prefix. For a production build served locally:

```sh
npm run build
PORT=4175 npm run serve
```

GitHub Pages cannot run the intermediary. It displays dated snapshots instead. A GitHub Actions secret named `NASA_API_KEY` can be used to refresh snapshots during a deployment; it does not turn Pages into a live API server. See the [NASA and JPL integration guide](docs/apis-nasa.md) for the catalogue, security boundaries and deployment details.

## ORBITAL DEVELOPERS

The application includes a project-integration area, versioned REST contract, deterministic proposal generator, MCP Streamable HTTP endpoint and branded read-only preview. Persistent cross-device previews require the Node backend and Supabase migration described in the [developer setup guide](docs/orbital-developers.md); the static GitHub Pages site alone cannot store project submissions. The proposal generator is rule based, does not use an AI model and does not validate scientific claims.

## Gameplay

- The commander introduces the mission centre, spacecraft engineering and launch preparation. The guide may be skipped or reopened. Voice, subtitles, effects and volume can be adjusted; voice availability and word highlighting depend on the browser.
- Engineering choices affect mass, budget, power, scientific output, storage and communications. In orbit, observation, sensor and telemetry data can be prioritised for transmission.
- Transit supports pause and time acceleration. A required mid-course decision stops the clock. A saved journey can be resumed in a paused state with the same configuration.
- Surface exploration is available on the Moon, Mars, Mercury and Titan. The Moon and Mars permit walking as well as rover travel. Venus and the gas giants are studied remotely; the solar observatory does not allow physical entry into the Sun.
- The laboratory displays educational planetary layers and simulated readings. In Earth mission preparation, players may select an EONET event as the first observation target. The report cites the real event and labels the game scan as simulated. Reports also offer a voluntary, device-local before/after questionnaire; its scores are not a validated impact study.

## Controls

- Drag to steer the ship, rotate the orbital camera or orient the rover. Click a celestial body to select it; click empty space to set a waypoint.
- **Start route** engages the automatic route; **W/A/S/D** cancels it. **W/S** apply forward or reverse thrust; **A/D** apply lateral thrust in flight or turn the rover on the surface.
- **Shift** provides a temporary boost; **F** switches the cockpit camera; the mouse wheel controls zoom.
- On a compatible destination, choose a landing zone and deploy the rover. Approach a marker and press **E** to scan it, then use the action again to collect a sample.
- Return to the station to recharge, analyse samples and transmit results. Orbital missions use the instrument panel or **E** to scan three sectors before sending their report.
- Fuel, energy, integrity, storage, communications and mission time appear in the HUD. A confirmed mission abort resets that campaign's resources and progress.

Planetary sizes and distances are not to scale. Free flight compresses time; transit profiles and communication delays are simplified for educational use. They must not be used for real mission planning.

## Project structure

- `src/components/SolarSystemScene.tsx` and `ExplorationScene.tsx`: 3D visualisation, navigation and exploration.
- `src/components/Commander.tsx`, `PlanetaryLab.tsx`, `MissionReports.tsx` and `NASAData.tsx`: guidance, virtual models, reports and external data.
- `src/systems/engineering.ts`, `transit.ts`, `communications.ts` and `lunarCampaign.ts`: mission design, simulated time, communications and campaign state.
- `src/data/`: mission, celestial-body and narrative data.
- `server/nasa-proxy.mjs`, `server/orbital-platform.mjs`: server-side NASA intermediary and external-project REST/MCP services.
- `supabase/migrations/202611150005_external_gamification_projects.sql`: private project storage and revocable preview links.
- `public/openapi.yaml`, `docs/orbital-developers.md`: REST contract and third-party setup.
- `public/textures/` and `public/illustrations/`: credited presentation textures and original vector artwork.
- `tests/`: domain and browser checks.
- `.github/workflows/pages.yml`: build and GitHub Pages deployment.

For the workspace browser regression, start the project using the local manager and run `npm run test:browser`. The script uses the workspace Playwright installation by default. Set `ORBITAL_TEST_URL` and `ORBITAL_PLAYWRIGHT_MODULE` to use a different server or Playwright installation.

## Deployment and known limits

GitHub Actions builds and deploys changes pushed to `main` or `master` when GitHub Pages is enabled for the repository. `node_modules`, `dist` and private environment files must not be committed. The [security review](docs/seguridad.md) describes the controls checked and their limits.

The language selector defaults to UK English and translates the main navigation, parts of the home screen, and key controls and headings in mission engineering, science reports and the NASA observatory. The remainder of the interface, narration, mission content and API responses are not yet fully translated; selecting Spanish restores the original Spanish labels in the translated areas. This is not yet a complete AAA production. Mission-specific activities, continuous probe descent, the cinematic return, professional voice acting and broad testing on physical devices remain incomplete. The [implementation status](docs/evolucion.md), [initial audit](docs/auditoria-y-plan.md), [observatory review](docs/auditoria-observatorio.md) and [delivery record](docs/entrega-the-last-horizon.md) contain further detail. The [validation protocol](docs/validation-protocol.md) describes voluntary learning evidence and independent review.

The commander supports English and Spanish browser speech synthesis, subject to available browser voices and user activation. A skippable visual guide points to mission selection, preparation, design and configuration; it can be restarted from the commander transmission log. Mission reports provide a debrief based on recorded results. Team presence, readiness, shared mission phase and visible avatars are available when Supabase and the required migrations are configured; spacecraft physics still run on each client, so this is not a single authoritative flight simulation. Competitive play, a full exploration sandbox and persistent analysis of exploration failures are not implemented. Failed transit attempts are recorded and explained in Reports. The isolated mission experiment lab previews both valid and invalid designs without changing campaign progress.

Mission engineering offers three educational orbital profiles and three transit difficulty settings. Orbital profiles affect launch payload capacity, transit estimates, science data per scan and downlink capacity; the factors are illustrative rather than flight-certified orbit predictions. The selected difficulty changes transit reserves and energy consumption. Exhausted transit energy, zero integrity or an impossible mandatory manoeuvre results in a mission failure, with retry and design review. A design can be saved locally, compared and shared as validated JSON for the same mission. Exploration can fail on zero integrity or critically low energy in a non-surface orbital mission; not every failure scenario is represented. Online accounts, multiplayer and team competition remain unimplemented. Run `npm run test:engineering` for the browser regression (requires Playwright as described above).

For a requirement-by-requirement implementation status, limitations and verification commands, see [project status and checklist](docs/project-status-and-checklist.md).

Accounts, private campaign backup, shared team planning and cooperative presence require Supabase setup. The external developer API requires its own Node backend configuration, server-only service-role secret, per-team API keys and migration; see [Supabase setup](docs/supabase-setup.md) and [ORBITAL Developers](docs/orbital-developers.md). These cloud services are disabled until configured. The [implementation checklist](docs/project-status-and-checklist.md) separates completed code from production configuration and remaining work.
