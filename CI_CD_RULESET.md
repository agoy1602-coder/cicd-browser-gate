# CI/CD Browser-Gate Ruleset

## Purpose

Reference CI/CD system based on the Traversy Media CI/CD lab concept, strengthened with a real Chromium browser gate.

## Non-negotiable rules

1. No guessing. A green build is evidence only for the checks that actually ran.
2. Build success is not application success. TypeScript compilation and unit/API tests cannot replace browser verification.
3. Every critical web workflow must have a real-browser test using Playwright and Chromium.
4. Verify rendering: successful navigation, non-blank document, and critical UI visibility.
5. Verify browser runtime health: console errors, uncaught page errors, and failed network requests must fail the gate when critical.
6. Verify critical API behavior through the browser context.
7. Fail closed. If a required gate fails, deployment must not proceed.
8. Never weaken tests to obtain green CI.
9. Prefer accessible roles, labels, and stable test IDs over fragile selectors.
10. Preserve Playwright reports, screenshots, traces/videos, and server logs on failure.
11. Local and deployed verification are separate gates.
12. Production verification is required after production deployment.
13. Never claim the application works from build output alone.
14. Secrets belong in GitHub/hosting secret stores, never in source.
15. Deployment jobs must depend on the complete verification job.

## Required pipeline

Install -> typecheck -> unit/API tests -> build -> start -> real Chromium -> deployment -> deployed HTTP check -> deployed Chromium verification.

## Deployed verification rule

A deployment is not considered verified because the hosting provider reports success. The exact deployed URL must be tested with the browser gate. The deployed verification workflow must fail closed on invalid URLs, failed HTTP responses, blank/broken rendering, critical browser errors, or failed critical requests.

The deployment provider must be selected and configured explicitly before an automatic deployment job is added. Do not invent provider commands, tokens, hooks, or secrets.

## Change rule

When a new critical user path is added, its browser test must be added before that path is considered CI-protected.
