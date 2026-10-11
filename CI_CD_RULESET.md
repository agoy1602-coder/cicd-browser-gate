# CI/CD Browser-Gate Ruleset

## Purpose

Reusable CI/CD foundation inspired by the Traversy Media CI/CD lab concept and strengthened with real Chromium browser verification and post-deployment diagnostics.

## Non-negotiable rules

1. No guessing. A green build is evidence only for the checks that actually ran.
2. Build success is not application success. TypeScript compilation and unit/API tests cannot replace browser verification.
3. Every critical user workflow must have an application-specific real-browser test using Playwright and Chromium.
4. Generic smoke checks verify a non-empty document, a title, health endpoint, browser console/runtime errors, failed requests, and critical HTTP failures.
5. HTTP 4xx/5xx responses from same-origin resources and Fetch/XHR calls must be reported unless a narrowly scoped exception is documented.
6. Critical API behavior must be asserted through browser-visible user paths; a health endpoint alone is insufficient.
7. Fail closed. If a required gate fails, the release must not be promoted.
8. Never weaken tests to obtain green CI.
9. Prefer accessible roles, labels, and stable test IDs over fragile selectors.
10. Preserve Playwright reports, JSON diagnostics, screenshots, traces/videos, and logs when available.
11. Local/preview verification and deployed verification are separate gates.
12. Post-deployment monitoring is useful detection but is not a rollback or pre-release blocker by itself.
13. Vercel production release-blocking checks must start from `vercel.deployment.ready` and publish a result against the exact deployed commit before promotion.
14. A Vercel repository-dispatch event must be checked against the configured project ID before testing; never trust a URL or commit SHA without validation.
15. The exact source commit tested against a deployment must match the commit that produced the deployment.
16. A release must not be called verified from build output or hosting-provider status alone.
17. Secrets belong in GitHub/hosting secret stores, never in source or browser diagnostics.
18. Deployment jobs must depend on the complete verification job, and production promotion must depend on the host's configured release gate.

## Required pipeline

For Vercel production release blocking, use `.github/workflows/vercel-deployment-check.yml` with the `vercel.deployment.ready` repository-dispatch event and configure its generated GitHub status as a required Vercel Deployment Check. Keep `deploy-verify.yml` as the post-deployment detection path.


Install -> dependency audit -> typecheck -> unit/API tests -> build -> start -> real Chromium smoke test -> deployment-specific HTTP/browser verification -> evidence.

Application-specific E2E tests must exercise every critical customer flow added by the product. Tests should assert both the action and the resulting state, not just that a page loads.

## Deployed verification requirements

- Resolve a deployment URL from an explicit manual input, a deployment-status event, or a configured production URL.
- Accept only a public HTTPS DNS hostname, and require an exact 40-character source commit SHA.
- Check out and verify the deployment's own source commit, not the current default branch by assumption.
- Retry transient HTTP failures before treating the deployment as unavailable.
- Fail on unsuccessful page navigation, empty/broken rendering, health-check failures, uncaught browser errors, failed critical requests, and critical HTTP 4xx/5xx responses.
- Preserve evidence without intentionally uploading secrets or authentication state.
- Optionally run scheduled synthetic checks against `PRODUCTION_BASE_URL`.

## Release-blocking limitation

A regular post-deployment workflow can detect a failure only after its trigger fires. It does not inherently prevent an already-live production alias from serving the release. A production release must use a hosting-provider deployment check or staged-promotion flow that explicitly waits for deployment-specific verification before assigning the production domain. Test the exact deployment artifact/commit that will be released.

## Change rule

When a critical user path is added, its test must be added before that path is considered CI-protected. A generic landing-page smoke test never substitutes for real feature-flow tests.
