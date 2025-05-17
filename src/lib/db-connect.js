// Import the 'pg' library
const { Client } = require('pg');

// Load environment variables from .env file
require('dotenv').config();

// Create a new client instance with the connection string
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function testConnection() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Successfully connected to the Supabase PostgreSQL database via pg client.');

    // Example query to test the connection
    const res = await client.query('SELECT NOW()');
    console.log('Database current timestamp (SELECT NOW()):', res.rows[0].now);

  } catch (err) {
    console.error('Error connecting to or querying the database:', err.stack);
  } finally {
    // Close the connection
    await client.end();
    console.log('Database connection closed.');
  }
}

// If this script is run directly, execute the test connection
if (require.main === module) {
  testConnection();
}

module.exports = { client, testConnection }; // Export client if needed elsewhere (with care)
