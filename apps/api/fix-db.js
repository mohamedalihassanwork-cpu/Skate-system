const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '1234', database: 'koshk_skate_test' });
  await pool.execute("DELETE FROM treasury_movements");
  await pool.execute("DELETE FROM expenses");
  console.log('Cleaned treasury records');
  process.exit(0);
}
run();
