# CI/CD Browser Gate

A small TypeScript/Express CI/CD lab with a real Chromium browser gate and diagnostics intended to make failed releases easier to explain.

## Pipeline

### Before release
Pull request / push to `main`  
→ deterministic dependency install  
→ high-severity dependency audit  
→ typecheck  
→ unit/API tests  
→ production build  
→ start the built application  
→ real Chromium smoke test  
→ preserve reports, traces, screenshots, video, and server logs.

### After a deployment
Successful deployment event or manual verification  
→ resolve the exact deployment URL and source commit  
→ validate the target URL and commit SHA  
→ verify the checked-out source is the deployed commit  
→ retry the deployed HTTP check  
→ run the Chromium smoke gate against that deployed URL  
→ preserve browser diagnostics.

The deployment verification workflow also runs every six hours **when both** repository variables `PRODUCTION_BASE_URL` and `PRODUCTION_DEPLOYMENT_SHA` are configured. This is a synthetic smoke check, not a substitute for application-specific monitoring.

## What this catches

The browser gate checks for an empty/broken document, missing title, unhealthy `/api/health`, browser console errors, uncaught page errors, failed browser requests, and same-origin or Fetch/XHR HTTP responses with status 4xx/5xx. Likely query-string credentials are redacted from diagnostic URLs. Trace, screenshot, video, JSON diagnostics, and reports are retained in the GitHub Actions artifact when available.

Use `HEALTHCHECK_PATH` if your health endpoint differs from `/api/health`. The default app in this repository implements a `GET /api/health` response containing `{ "status": "ok" }`.

## What a green run does NOT prove

A generic smoke test cannot prove that every product feature works. Each critical customer path needs an application-specific Playwright test that performs the action and checks the outcome. Examples include sign-in, saving and reloading data, generating playable audio, submitting a form, or loading a required API-backed result.

A post-deployment verification run **detects** a bad release; it does not automatically stop a hosting provider from having already assigned the production domain. For a true pre-release blocker, configure your host's deployment-check or staged-promotion feature so the tested deployment is not promoted until its deployment-specific browser checks pass. See [DEPLOYMENT_GATE.md](./DEPLOYMENT_GATE.md).

## Pre-promotion release gate (Vercel)

The separate `.github/workflows/vercel-deployment-check.yml` is designed for Vercel Deployment Checks. Vercel sends the `vercel.deployment.ready` repository-dispatch event after the deployment is built and before configured checks run. The workflow validates the deployment metadata, tests the exact deployment commit in Chromium, and reports its outcome on that commit using Vercel's status action pinned to a verified commit.

**Before merging this workflow or making its status a required Vercel check:**

1. In GitHub **Settings → Secrets and variables → Actions → Variables**, create `VERCEL_PROJECT_ID` with the exact project ID shown by Vercel for this repository. This is a non-secret identifier. The workflow fails closed if it is missing or does not match the deployment event.
2. Confirm Vercel is connected to this repository and that the expected deployment-ready repository-dispatch event is arriving.
3. Once a dispatch run succeeds and the corresponding commit status appears, open Vercel **Project Settings → Build & Deployment → Deployment Checks** and add the exact GitHub check context produced by the workflow as a required production check.
4. Keep production domain auto-assignment enabled so Vercel can assign the production domains only after the required checks pass. Never use Force Promote to work around a failed gate without explicitly accepting the risk.

The status context is generated from the workflow/job name and deployment project/environment. Keep that name stable after selecting it in Vercel; changing the workflow or job name can change the check context. The dispatch workflow runs from the repository's default branch, so this workflow must be merged to that branch before Vercel can trigger it.

The existing `CD - Verify Deployed URL` workflow remains useful for **post-deployment detection and scheduled smoke checks**. It is not itself a pre-promotion release blocker.

Manual execution of the blocking workflow requires an exact HTTPS Vercel deployment URL and its 40-character source SHA. Manual runs are diagnostic only and do not publish a Vercel blocking status.

## Configure scheduled smoke monitoring

In GitHub repository **Settings → Secrets and variables → Actions → Variables**, add:

- `PRODUCTION_BASE_URL`: the public HTTPS base URL of the production application.
- `PRODUCTION_DEPLOYMENT_SHA`: the exact 40-character Git commit SHA currently serving production. Update it after each production release unless your deployment integration updates it automatically.

The scheduled workflow skips itself when either variable is absent. It checks out the recorded live commit rather than assuming the latest `main` commit is deployed. The manual workflow requires both the exact deployed HTTPS URL and the 40-character Git commit SHA that produced it. Deployment-status-triggered verification uses the source SHA from the GitHub deployment event.

## Local

```bash
npm ci
npm audit --audit-level=high
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm start
```

In another terminal:

```bash
BASE_URL=http://127.0.0.1:3000 npm run e2e
```

This template is provider-neutral. Credentials and production integrations must be configured explicitly in the hosting provider and GitHub, never committed into this repository.
