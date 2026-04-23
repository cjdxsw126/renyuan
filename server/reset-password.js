const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const newPassword = 'password';
const saltRounds = 10;

bcrypt.hash(newPassword, saltRounds, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err);
    db.close();
    return;
  }
  
  console.log('New password hash:', hashedPassword);
  
  db.run(
    'UPDATE users SET password = ? WHERE username = ?',
    [hashedPassword, 'admin'],
    function(err) {
      if (err) {
        console.error('Error updating password:', err);
      } else {
        console.log(`✅ Password updated for admin. Rows changed: ${this.changes}`);
      }
      db.close();
    }
  );
});
