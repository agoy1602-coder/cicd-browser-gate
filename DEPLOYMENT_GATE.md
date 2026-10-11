# Deployment Quality Gate: Detection vs. Release Blocking

## Detection layer in this repository

The `CD - Verify Deployed URL` workflow verifies a successful GitHub deployment-status event, a manually supplied deployment URL and commit SHA, or the configured production URL on its six-hour schedule. It checks the deployed HTTP response and runs the generic Playwright browser smoke test against that URL. The workflow keeps evidence in a GitHub Actions artifact.

That proves only the assertions included in the tests. It is not an automatic rollback system and does not, by itself, guarantee the production domain was held while the tests ran.

## To block a broken Vercel release

For a Vercel-connected app, use Vercel's deployment-check or staged-promotion mechanism rather than assuming a post-deploy GitHub workflow will block traffic:

1. Make the candidate deployment available at a unique preview/staged deployment URL.
2. Run application-specific Playwright tests against that exact URL and source commit.
3. Configure Vercel Deployment Checks so production promotion waits for the corresponding check to succeed.
4. Only promote the deployment after checks pass. Verify the resulting production URL afterward.
5. Keep a rollback procedure available if post-promotion monitoring reports new runtime failures.

Consult the current official guide before wiring the host integration: https://vercel.com/docs/deployment-checks

Do not add a Vercel token or other deployment secret until the project, team scope, deployment trigger, and release strategy are explicitly configured. Store secrets in GitHub's protected environment/repository secret storage and expose them only to the steps that need them.

## Required feature tests

The smoke test cannot know whether a product-specific workflow worked. Add E2E tests for the features users actually rely on. Each should:

- establish the starting state;
- perform the user action through the UI;
- assert the resulting UI/state;
- assert the expected API response/side effect;
- capture diagnostics on failure; and
- use deterministic fixtures or explicitly controlled test credentials when external services are involved.

Example: a voice-generation test should submit a valid test input, assert that the intended API request succeeds, assert that an audio result is produced, and verify that the audio can be loaded/played. Merely asserting that the homepage loads is not enough.

For production checks, avoid destructive actions and avoid using real customer data. If a workflow needs a paid external API, decide whether to stub it in CI and separately run a controlled integration check with a dedicated test credential.
