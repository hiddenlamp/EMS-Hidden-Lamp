const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../..');
const distDir = path.join(rootDir, 'frontend', 'dist-hostinger');

console.log('=== PREPARING FULL-STACK EJS NODE.JS PACKAGE FOR HOSTINGER ===\n');

// Clean dist directory inside frontend/
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy public assets (CSS, Images, JS)
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
console.log('  ✅ Copied frontend/public assets (css/style.css, images/logo.png)');

// Copy views
const frontendViews = path.join(rootDir, 'frontend', 'views');
const distViews = path.join(distDir, 'views');
copyDir(frontendViews, distViews);
console.log('  ✅ Copied frontend/views EJS templates (dashboard, employees, payroll, payslips, expenses, analytics)');

// Create .htaccess file
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

Options -Indexes
`;
fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf8');
console.log('  ✅ Created Hostinger .htaccess file');

console.log('\n====================================================');
console.log('   FULL EJS NODE.JS PACKAGE READY AT frontend/dist-hostinger ');
console.log('====================================================');
