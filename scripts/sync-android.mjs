import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const androidAssetsPublic = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

if (!fs.existsSync(distDir)) {
  console.error('dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}

fs.rmSync(androidAssetsPublic, { recursive: true, force: true });
fs.mkdirSync(androidAssetsPublic, { recursive: true });
fs.cpSync(distDir, androidAssetsPublic, { recursive: true });

// Rewrite absolute /assets/... and /src/assets/... paths in index.html so WebViewAssetLoader resolves under /public/
const indexHtmlPath = path.join(androidAssetsPublic, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  html = html
    .replaceAll('href="/assets/', 'href="/public/assets/')
    .replaceAll('src="/assets/', 'src="/public/assets/')
    .replaceAll('href="/favicon.ico"', 'href="/public/favicon.ico"')
    .replaceAll('href="/apple-touch-icon.png"', 'href="/public/apple-touch-icon.png"')
    .replaceAll('href="/manifest.webmanifest"', 'href="/public/manifest.webmanifest"');
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
}

// Rewrite image paths inside JS bundle so /src/assets/... resolves under /public/src/assets/...
const assetsDir = path.join(androidAssetsPublic, 'assets');
if (fs.existsSync(assetsDir)) {
  for (const file of fs.readdirSync(assetsDir)) {
    if (file.endsWith('.js')) {
      const fullPath = path.join(assetsDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      fs.writeFileSync(
        fullPath,
        content.replaceAll('"/src/assets/', '"/public/src/assets/'),
        'utf8'
      );
    }
  }
}

console.log('Synced dist/ to android/app/src/main/assets/public/ successfully.');
