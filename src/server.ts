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

// ✅ 1. ВАЖНО: Сообщаем Express, что он работает за прокси (Nginx). 
// Это гарантирует корректное определение req.protocol и req.headers.host
app.set('trust proxy', 1);

const commonEngine = new CommonEngine({
  allowedHosts: [
    'localhost', 
    '127.0.0.1', 
    '0.0.0.0', 
    // Варианты в кодировке Punycode (ASCII)
    'xn--80akonecy.xn--p1ai', 
    'xn--80ajjteep7bg.xn--80akonecy.xn--p1ai', 
    'xn--o1ab.xn--80akonecy.xn--p1ai',
    // ✅ 2. ДОБАВЬТЕ варианты в кириллице. 
    // Прокси-серверы часто передают хост именно так, и это вызывает рассинхронизацию
    'пакетон.рф',
    'песочница.пакетон.рф',
    'рп.пакетон.рф'
  ] 
});

// Health check для Docker
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 1. Раздача статики
app.get(
  '*.*',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
  }),
);

// 2. Щит от мусорных запросов
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

// 3. Все остальные запросы идут в Angular SSR
// 3. Все остальные запросы идут в Angular SSR
app.get('**', (req, res, next) => {
  console.log('🔍 Входящий Host:', req.headers.host);
  console.log('🔍 Протокол (req.protocol):', req.protocol);
  console.log('🔍 X-Forwarded-Proto:', req.get('x-forwarded-proto'));

  // ✅ КРИТИЧЕСКИ ВАЖНО: Если снаружи HTTPS, заставляем Angular использовать HTTPS.
  // Это предотвращает блокировку ресурсов браузером (Mixed Content).
  const finalProtocol = (req.get('x-forwarded-proto') === 'https' || req.protocol === 'https') 
    ? 'https' 
    : 'http';

  const { originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${finalProtocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => {
      // Выводим полную ошибку, а не только сообщение, для надежной отладки
      console.error('❌ Ошибка Angular SSR (полная):', err);
      next(err);
    });
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;