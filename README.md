# CI/CD Browser Gate

A small TypeScript/Express CI/CD lab inspired by the Traversy Media CI/CD starter, with an additional hard gate: the application must render and behave correctly in real Chromium before deployment is allowed.

## Pipeline

push / pull request
  -> install
  -> typecheck
  -> unit/API tests
  -> build
  -> start
  -> real Chromium browser gate
  -> deployment gate
  -> deployed browser verification

## Local

```bash
npm install
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

Deployment is intentionally provider-neutral until a hosting provider and authentication mechanism are explicitly selected.
