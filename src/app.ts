import express from 'express';

const app = express();

app.get('/', (_request, response) => {
  const version = process.env.APP_VERSION ?? 'development';

  response.type('html').send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CI/CD Browser Gate</title>
      </head>
      <body>
        <main>
          <h1>CI/CD Browser Gate</h1>
          <p>The application is running.</p>
          <p>Version ${version}</p>
        </main>
      </body>
    </html>
  `);
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

export default app;
