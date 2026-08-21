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

const commonEngine = new CommonEngine({
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    'xn--80ajjteep7bg.xn--80akonecy.xn--p1ai',
    'xn--80akonecy.xn--p1ai',
    'пакетон.рф',
    'xn--80ajjteep7bg.xn--80akonecy.xn--p1ai:4000',  // на случай прямого обращения
    'xn--80akonecy.xn--p1ai:4000',
  ]
});

// ✅ Health check для Docker
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ✅ ИСПРАВЛЕНО: '*.*' вместо '**'
// Теперь статика отдаётся ТОЛЬКО для файлов с расширением
// (.js, .css, .png, .json, .txt, .ico и т.д.)
app.get(
  '*.*',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,  // ← ВАЖНО: не отдавать index.html для директорий
  }),
);

// ✅ Все остальные запросы (без точки) идут в Angular SSR
// /product/123, /category/pakety, / и т.д.
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