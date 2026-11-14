# Security: scope and evidence

Historical review of 12 November 2026, covering the local static application as it stood at that time. The browser runs React and Three.js; the application did not include accounts, its own API or a database at that review. Scores, progress and reports in `localStorage` are editable by the user: they are not trusted records or secrets. The later NASA intermediary and its separate security considerations are described in [the NASA and JPL integration guide](apis-nasa.md).

| Control | Status and evidence at the review |
| --- | --- |
| Dependencies | `npm ci` uses the lockfile. `npm audit` reported no known vulnerabilities on that date; advisories change and this does not prove the absence of flaws. |
| Stored data | Transit state, landing zones and reports are checked for expected structure and limits. Report links outside the expected scientific domain are rejected. If storage fails, rewards remain idempotent during the session; persistence across sessions is not guaranteed. |
| Interface injection | React renders text; a static search found no use of `eval`, `innerHTML` or `dangerouslySetInnerHTML`. This is not a penetration test. |
| Content policy | Production builds insert a CSP restricting scripts and connections to the origin. Inline styles remain permitted for existing dynamic styles. A meta CSP does not provide HSTS or `frame-ancestors`; these require hosting-provider headers. Later image-source changes are documented separately. |
| Publishing workflow | Actions are pinned to SHAs, checkout does not persist credentials, and Pages and identity permissions are assigned to the deployment job. `actionlint` passed. The workflow was not run or published as part of this historical review. |
| Secrets | A static search for private-key, AWS-key and GitHub-token patterns found no matches in project files. This was a partial review and does not guarantee that no other secrets exist. |
| Local access | The workspace launcher binds to `127.0.0.1` and the assigned port; it does not deliberately expose Vite on other interfaces. Production requires a separate hosting and configuration review. |
| Voice | Speech synthesis uses voices supplied by the browser or operating system. Availability, quality and processing depend on that environment. |

No independent security audit was performed and no regulatory compliance is claimed. If accounts, personal data or additional external services are introduced, design and test the relevant authentication, authorisation and session controls before enabling them.
