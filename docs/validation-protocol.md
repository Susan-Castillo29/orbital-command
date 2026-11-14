# Science, accessibility and impact validation

This protocol supports external review; it does not claim that specialists or participants have already validated the game. Obtain permission and informed consent before recruiting, collecting or publishing any information. Do not ask participants to submit names or other identifying details through the game.

## Current implementation

In Earth mission engineering, a player may select a NASA EONET event. The selected event changes the first orbital scan target and, after that scan and transmission, its identifier, event date, retrieval date, source link and live/snapshot status appear in the report. The event is external source context. The spacecraft scan, generated index and game outcome are simulated: they are **not** measurements of the event. Old scans are not attributed to a newly selected event. If EONET is unavailable or its data fail validation, players can continue with the existing simulated mission.

The optional learning assessment in Reports asks three questions before a mission and again after another mission report is transmitted (a replay also counts). Participation requires an explicit checkbox. Answers are stored only in the browser; no automatic submission occurs. The player can delete the assessment or export an individual score summary, dates and mission counts without individual answers. Local data are editable and self-selected. The summary is not independently verified, and deleting browser data also deletes locally stored records. An exported file is controlled by whoever receives it; avoid combining it with identifying information.

A three-question repeated quiz is an exploratory instrument, not a validated measure of learning or population impact. Repetition, selection bias, timing and prior knowledge may affect scores. No user counts, educational gains or expert endorsement are claimed without independently collected evidence.

## Suggested user study

1. Define the educational question, study population, accessibility needs, success measures and analysis plan before collecting results. Do not claim representation beyond the participants recruited.
2. Explain the purpose, voluntary nature, local storage, deletion and optional export. Obtain appropriate consent; involve a responsible adult where required for minors. Avoid collecting names, contact details or unnecessary sensitive information.
3. Ask participants to complete the initial assessment before a mission, play or replay and transmit that mission, then complete the follow-up. Document completion and errors separately from the game-generated score. Avoid helping only one group or reporting test data as real participants.
4. Record the number invited, consenting, completing and withdrawing; report the questions, aggregate outcomes, missing results and limitations. Where possible use a suitable comparison group and independently review the instrument. Do not infer that a score change was caused by the game without a suitable study design.
5. If participants choose to share exported summaries, collect and process them through a separately approved channel and apply an appropriate retention and deletion policy. This project does not send those files to a server or automatically aggregate them.

## Specialist review

Invite an appropriate space-science educator, a person with EONET/data-provenance experience and accessibility practitioners, including people who use assistive technology, through channels approved by the project owner. Provide a reproducible build, mission walkthrough, source links and a checklist. Record the reviewer’s role, date, consent, exact findings, unresolved issues and verification of fixes. Do not describe a person as an endorser without their permission. No such review is recorded yet.

Review especially:

- Whether the EONET event date, source and retrieved/snapshot date are presented correctly, and whether a user can distinguish source observations from synthetic game readings. Consult the [NASA EONET v3 documentation](https://eonet.gsfc.nasa.gov/docs/v3) for event and geometry fields.
- Scientific constraints for the Sun, Venus, the gas giants, Europa and the other destinations; acknowledge simplified trajectories, signal delays and environments.
- Keyboard-only operation, screen readers, focus order, visible focus, contrast, zoom, reduced motion, touch targets and use of the 3D views without relying solely on colour or gestures.
- Mission completion, resource constraints, reports, confusing language, error recovery, network failure and age-appropriate consent.

## Reproducible checks

```sh
npm ci
npm test
npm run build
npm run test:browser
npm run test:impact
npm run test:accessibility
npm audit
```

Browser checks require the project server and the workspace Playwright/Chromium tools; `ORBITAL_TEST_URL` and `ORBITAL_PLAYWRIGHT_MODULE` may select another server or Playwright installation. `test:impact` uses synthetic fixtures, not people. `test:accessibility` runs axe-core against operations, Earth engineering and Reports at 1440 px and 390 px in light and dark modes. Automated scans cannot establish complete WCAG conformance, scientific accuracy, usability or real-world impact.

The broad campaign regression uses fixtures for long transit and some lunar progress. Passing it does not establish that every chapter has every requested activity or that the entire campaign has been manually completed in sequence. The English/Spanish localisation requested for the full product also remains incomplete; this should be tested as a separate release requirement.
