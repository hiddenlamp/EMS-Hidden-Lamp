const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../..');
const frontendDir = path.join(rootDir, 'frontend');
const distDir = path.join(frontendDir, 'dist-hostinger');

console.log('=== PREPARING FULL WORKING FRONTEND PACKAGE FOR HOSTINGER ===\n');

// 1. Clean destination directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Helper function to recursively copy directories
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

// 2. Copy Public Assets (CSS, JS, Logos, Images)
const publicSrc = path.join(frontendDir, 'public');
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, distDir);
  console.log('  ✅ Copied Full Working Public Assets (css/style.css, images/logo.png)');
}

// 3. Copy Views (EJS Templates)
const viewsSrc = path.join(frontendDir, 'views');
const viewsDest = path.join(distDir, 'views');
if (fs.existsSync(viewsSrc)) {
  copyDir(viewsSrc, viewsDest);
  console.log('  ✅ Copied Full Working EJS Templates (dashboard, employees, payroll, payslips, expenses, analytics)');
}

// 4. Inject Production API Config
const configContent = `// Production Render Backend API URL Config
window.ENV = {
  API_BASE_URL: 'https://ems-hidden-lamp-1.onrender.com'
};
`;
fs.writeFileSync(path.join(distDir, 'config.js'), configContent, 'utf8');
console.log('  ✅ Injected Production config.js with API URL https://ems-hidden-lamp-1.onrender.com');

// 5. Create Hostinger .htaccess File
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
console.log('   FULL WORKING FRONTEND PACKAGE READY AT frontend/dist-hostinger ');
console.log('====================================================');
