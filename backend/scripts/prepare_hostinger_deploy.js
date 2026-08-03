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

// Create Hostinger Client Config inside frontend/dist-hostinger
const configContent = `// Hostinger Production API Configuration
window.ENV = {
  API_BASE_URL: process.env.RENDER_API_URL || 'https://hiddenlamp-payroll-api.onrender.com'
};
`;
fs.writeFileSync(path.join(distDir, 'config.js'), configContent, 'utf8');
console.log('  ✅ Created Hostinger config.js');

// Create Hostinger .htaccess file inside frontend/dist-hostinger
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# Prevent directory browsing
Options -Indexes
`;
fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf8');
console.log('  ✅ Created Hostinger .htaccess file');

console.log('\n====================================================');
console.log('   HOSTINGER FRONTEND PACKAGE READY AT frontend/dist-hostinger ');
console.log('====================================================');
