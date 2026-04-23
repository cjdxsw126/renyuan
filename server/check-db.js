const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
console.log('Opening database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Database opened successfully');
});

db.all('SELECT id, username, role, enabled, password FROM users', (err, rows) => {
  if (err) {
    console.error('Error querying users:', err);
  } else {
    console.log('\n=== Users in database ===');
    rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Username: ${row.username}`);
      console.log(`Role: ${row.role}`);
      console.log(`Enabled: ${row.enabled}`);
      console.log(`Password (hashed): ${row.password.substring(0, 20)}...`);
      console.log('---');
    });
    console.log(`Total users: ${rows.length}\n`);
  }
  db.close();
});
