const db = require('./db/database');

console.log('Clearing all demo records from travel_expenses and company_expenses...');

try {
  db.exec('DELETE FROM travel_expenses;');
  db.exec('DELETE FROM company_expenses;');
  console.log('✅ Successfully cleared all demo data from Expenses module!');
} catch (err) {
  console.error('❌ Error clearing expenses data:', err);
}
