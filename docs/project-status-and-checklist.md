# ORBITAL COMMAND: implementation and outstanding work

This is a code-based status record, not a claim of expert validation. “Partial” means that an initial implementation exists but does not meet the full original brief. Game telemetry and scientific results are simulated unless a NASA source is explicitly identified.

## Foundation and experience

- [x] Existing React, TypeScript, Vite and Three.js application retained; mission progress and reports use local browser storage.
- [x] Responsive navigation, light/dark themes, larger controls, full-screen visualisations and a visible skippable mission setup guide.
- [x] Commander transmissions, browser speech synthesis, replay, speech and subtitle controls, and English/Spanish selection for the commander. Browser voice availability varies.
- [~] Localisation: English is the default and the principal navigation and some screens are bilingual; destination briefings, transit controls and planetary-lab layer descriptions are bilingual, but many exploration texts, legacy reports, API responses and controls are not fully translated.
- [~] 3D solar system, spacecraft variants, procedural surface scenes, orbital visualisations, atmospheric/solar models, lighting, exploration controls and synthetic ambience. They are educational approximations, not AAA-quality models or scientifically complete reconstructions.
- [~] Accessibility: automated checks cover selected views and combinations. Independent assistive-technology testing, human testing and a full WCAG review remain outstanding.
- [~] Telescope design now has a 20-second procedural Three.js launch cinematic with design-specific optics, instruments, power and thermal hardware, synthesized countdown/engine audio, orbital deployment and first-light title. Other campaign launch/landing cinematics, final return sequence, recorded voice acting and an original cinematic score remain outstanding; this scene is not photorealistic production footage.

## Campaign and exploration

- [x] Sequential destination unlocking and distinct mission descriptions for Earth, Moon, Mercury, Venus, Mars, Jupiter, Europa, Saturn, Titan, Uranus, Neptune and Sun.
- [x] Campaign completion verifies every mission in the existing catalogue, transmitted reports and the Moon's three analyzed samples. Completion grants one persistent Galactic Explorer Medal and archives a data-based campaign summary; replay clears current mission state while preserving medal and campaign history. The optional asteroid mission is included in the completion check.
- [~] Earth observation, lunar and Martian surface activity, rover/walking controls, orbital scanning, samples, simulated lab readings and report transmission exist. Campaign objectives still share simplified mechanics and do not implement every activity in the original request.
- [~] Planetary lab and probe views provide educational representations; a full continuous, instrumented atmospheric descent and complete internal-layer and solar research gameplay remain outstanding.
- [x] Restrictions distinguish accessible exploration from remote observation in selected environments; the Sun cannot be entered by a conventional craft in the model.
- [~] Reports include synthetic readings and sources, and transmitted missions receive a limited debrief. Failed transit attempts and selected exploration failures are saved and explained separately; comprehensive failure analysis and the final cinematic return sequence remain outstanding.

## Engineering, travel and learning

- [x] Spacecraft, instrument, energy, communications, thermal protection and launcher choices affect simplified mass, cost, power, data, downlink and launch validation.
- [x] Launchers have different costs, payload limits and starting fuel. Three illustrative orbital profiles affect payload, flight time, generated data and downlink.
- [x] Guided, standard and challenging settings alter transit reserves and consumption. Failure during transit is possible when power or integrity is exhausted or no required correction can be made; retry and design review are available.
- [~] Mission difficulty labels are not a complete difficulty model across all exploration mechanics. Exploration ends at zero integrity or critically low power in a non-surface orbit; failure conditions and consequences are not comprehensive on every surface or in every mode.
- [x] Mission transit displays simulated time and resources, includes pause/time acceleration and stops at a required decision. Launch windows are illustrative and are not computed from real ephemerides.
- [x] Designs can be saved locally, compared and shared as validated JSON for the same mission. No shared online design library exists.
- [~] Scoring exists but does not yet incorporate every requested measure of scientific value, efficiency and decision quality.
- [~] An isolated mission experiment lab permits invalid designs and repeated what-if transit simulations with explanatory scoring; it does not simulate every exploration event.
- [ ] Separate configurable batteries, onboard computing and attitude-control subsystems; full mission-specific orbital coverage and communications simulation.

## NASA data and infrastructure

- [x] NASA/JPL source browser and dated public snapshots; optional EONET event selection provides real-world context for the Earth mission. Game scan indices are clearly identified as simulated.
- [x] Static Pages builds read a generated snapshot index and only request available published snapshots directly; a local proxy can request supported live data with a private environment key. Secrets are not embedded in the public site.
- [~] Third-party availability, image delivery, upstream schema changes and API-key quotas can affect data. Snapshots are not live; translated API responses are not currently available.
- [x] GitHub Pages deployment workflow, pinned actions and Node 24 build. The browser attempts one bounded reload after an obsolete lazy-loaded asset fails following a deployment.
- [~] The Three.js build produces a large-chunk warning; real-device performance profiling and further bundle optimisation are outstanding.

## Collaboration and impact

- [~] Accounts, teams, four-player cap and roles use Supabase. Private Realtime presence carries player identity/role, readiness and movement; the team launch gate checks every roster member is connected, assigned a role and ready before the host can start. The launch synchronizes mission, ship/design and transition into the exploration scene. The solar-system and exploration scenes render teammate avatars. The `202611150004_authoritative_coop_sessions.sql` migration must be applied in Supabase before this flow works remotely. Sessions, readiness, leadership handoff, action IDs, collective objectives and team resource counters are persisted and validated by RPC. High-frequency avatar poses still use private Realtime Presence, while detailed spacecraft physics and local simulator resources remain per-client; this is not a full authoritative flight server. Cross-device live verification remains pending. Competition and verified scores remain unavailable.
- [x] Fictional Dominican tracking context, international collaboration narrative and optional device-local learning assessment with consent, export and deletion.
- [ ] Independent scientific review, accessibility review by specialists and users, real participant studies and verified reach or impact evidence. Local self-selected assessment results do not establish impact.

## External project integration

- [x] Added the `ORBITAL DEVELOPERS` area to the existing navigation and mission home, with capability/template discovery, a bilingual project form, bounded text attachments, private draft review, explicit public consent, unlisted read-only links and a branded preview route. Existing mission screens remain in place.
- [x] Added REST `/api/v1` endpoints, deterministic proposal generation, input/size validation, API-key ownership, SHA-256 hashed preview tokens, public/private/unlisted access checks, revocation, origin controls and per-process rate limits. The first generator is explicitly not AI and flags missing information.
- [x] Added MCP 2025-11-25 Streamable HTTP JSON-RPC (`POST /mcp`, `GET` returns 405, no SSE server stream), six typed tools and public read-only capability/template tools.
- [x] Added Supabase migration `202611150005_external_gamification_projects.sql`, OpenAPI 3.1 at `/openapi.yaml`, Node integration example, quick-start and deployment/security notes.
- [~] Supabase persistence and the REST/MCP handlers are implemented, but production URLs/secrets are not present in this workspace. Apply migration 005 and deploy a Node backend before calling cross-device links live. GitHub Pages alone cannot run the backend.
- [~] Current preview is an interactive proposal/mission briefing rendered by the existing React application. It does not generate arbitrary Three.js scenes or join project previews to the live co-op session. The cooperative capability remains marked experimental.
- [ ] Comprehensive redesign of all 18 product areas, authenticated self-service API-key issuance, configurable AI providers, production rate limiting/monitoring, external penetration/security review and live tests against deployed Supabase/MCP clients remain outstanding.

## Verification and operations

- Automated unit tests: `npm test`.
- External platform unit test: `node --test tests/orbital-platform.test.mjs`; two-context browser smoke test with mock API: `npm run build` using `VITE_ORBITAL_PLATFORM_API_URL`, then `npm run test:developers`. The mocked browser test does not exercise a real Supabase project or physical device.
- Production build: `npm run build`.
- Browser tests in a configured local environment: `npm run test:browser`, `npm run test:campaign`, `npm run test:telescope`, `npm run test:engineering`, `npm run test:reliability`, `npm run test:accessibility`, `npm run test:impact`; additional language and guidance scripts are in `tests/`.
- Campaign ceremony browser regression: run `npm run build` before `npm run test:campaign`; Playwright serves the compiled assets directly, so no preview server is needed.
- Telescope role browser regression: run `npm run build` before `npm run test:telescope`; it verifies astronaut progress isolation, gamma detector compatibility and the simulated telescope launch flow. The 3D cinematic requires a WebGL-capable browser and was build-verified, not visually reviewed on a physical device.
- To test the static build locally, run `VITE_NASA_MODE=snapshot npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4188 --strictPort` in another terminal, followed by `npm run test:reliability`. This test uses the workspace Playwright installation.
- GitHub Pages: the deployment workflow sets `VITE_NASA_MODE=snapshot`; regular local development defaults to the proxy and falls back to snapshots.
- External platform tests: `node --test tests/orbital-platform.test.mjs`; backend setup and endpoint contracts: [`orbital-developers.md`](orbital-developers.md), [`../public/openapi.yaml`](../public/openapi.yaml).
- A stale browser tab can reference a hashed asset removed by a later deployment. The application reloads once, with a 30-second limit, and the error boundary offers manual reload if recovery cannot complete.
- Next priorities: secure identity and hosted real-time collaboration; full localisation including source responses; meaningful mission-specific mechanics and failure analysis; expert and user evaluation; device and performance testing.
