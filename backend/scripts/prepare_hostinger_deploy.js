const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '../..');
const frontendDir = path.join(rootDir, 'frontend');
const distDir = path.join(frontendDir, 'dist-hostinger');

console.log('=== BUILDING REACT SPA PACKAGE FOR HOSTINGER ===\n');

try {
  console.log('  🔨 Executing Vite Build (npm run build)...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  console.log('  ✅ React SPA built successfully into frontend/dist-hostinger (index.html created)');
} catch (err) {
  console.error('❌ Failed to build React SPA:', err.message);
  process.exit(1);
}

// 1. Inject Production API Config
const configContent = `// Production Render Backend API URL Config
window.ENV = {
  API_BASE_URL: 'https://ems-hidden-lamp-1.onrender.com'
};
`;
fs.writeFileSync(path.join(distDir, 'config.js'), configContent, 'utf8');
console.log('  ✅ Injected Production config.js with API URL https://ems-hidden-lamp-1.onrender.com');

// 2. Create Hostinger SPA .htaccess File (Fixes 403 Forbidden & 404 on page refresh)
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # Serve static files if they exist
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Fallback to index.html for React Router SPA
  RewriteRule ^ index.html [L]
</IfModule>

Options -Indexes
DirectoryIndex index.html
`;
fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf8');
console.log('  ✅ Created Hostinger React SPA .htaccess file with DirectoryIndex index.html');

console.log('\n====================================================');
console.log('   REACT SPA HOSTINGER PACKAGE READY AT frontend/dist-hostinger ');
console.log('====================================================');
