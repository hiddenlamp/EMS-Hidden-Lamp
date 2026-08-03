const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../..');
const distDir = path.join(rootDir, 'frontend', 'dist-hostinger');

console.log('=== PREPARING HOSTINGER FRONTEND PACKAGE AT frontend/dist-hostinger ===\n');

// Ensure clean dist directory inside frontend/
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy frontend public assets to frontend/dist-hostinger/public
const copyDir = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const frontendPublic = path.join(rootDir, 'frontend', 'public');
const distPublic = path.join(distDir, 'public');
copyDir(frontendPublic, distPublic);
console.log('  ✅ Copied frontend/public assets (CSS, Images, Logos)');

// Copy frontend views to frontend/dist-hostinger/views
const frontendViews = path.join(rootDir, 'frontend', 'views');
const distViews = path.join(distDir, 'views');
copyDir(frontendViews, distViews);
console.log('  ✅ Copied frontend/views EJS templates');

// Create Hostinger Client Config
const configContent = `// Hostinger Production API Configuration
window.ENV = {
  API_BASE_URL: 'https://hiddenlamp-payroll-api.onrender.com'
};
`;
fs.writeFileSync(path.join(distDir, 'config.js'), configContent, 'utf8');
console.log('  ✅ Created Hostinger config.js');

// Create Entry Point index.html (Prevents Hostinger from falling back to main domain hiddenlamp.in)
const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EMS - Hidden Lamp Payroll Management System</title>
  <meta http-equiv="refresh" content="0; url=https://hiddenlamp-payroll-api.onrender.com">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .loader {
      width: 48px;
      height: 48px;
      border: 5px solid #2563eb;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
      margin-bottom: 1.5rem;
    }
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    a { color: #60a5fa; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <h2>Connecting to Hidden Lamp Payroll Management Portal...</h2>
  <p>If you are not redirected automatically, <a href="https://hiddenlamp-payroll-api.onrender.com">Click Here to Launch EMS Portal</a></p>
  <script>
    window.location.href = "https://hiddenlamp-payroll-api.onrender.com";
  </script>
</body>
</html>
`;
fs.writeFileSync(path.join(distDir, 'index.html'), indexHtmlContent, 'utf8');
console.log('  ✅ Created Hostinger index.html entry point');

// Create Hostinger .htaccess file with subdomain isolation
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

DirectoryIndex index.html index.php
Options -Indexes
`;
fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf8');
console.log('  ✅ Created Hostinger .htaccess file');

console.log('\n====================================================');
console.log('   HOSTINGER FRONTEND PACKAGE READY AT frontend/dist-hostinger ');
console.log('====================================================');
