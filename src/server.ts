import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();

// ✅ ИСПРАВЛЕНО: Добавляем allowedHosts в конструктор CommonEngine
const commonEngine = new CommonEngine({
  allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0'] // Разрешаем локальные хосты
});

// Health check для Docker
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 1. Раздача статики (CSS, JS, картинки, JSON)
app.get(
  '*.*',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
  }),
);

// ✅ 2. ЩИТ ОТ МУСОРНЫХ ЗАПРОСОВ
app.use((req, res, next) => {
  if (
    req.path.startsWith('/.') || 
    req.path === '/robots.txt' || 
    req.path === '/sitemap.xml' ||
    req.path.includes('wp-admin') ||
    req.path.includes('.php')
  ) {
    res.status(404).send('Not found');
  } else {
    next();
  }
});

// 3. Все остальные запросы (HTML страницы) идут в Angular SSR
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;