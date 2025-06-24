// backend/config/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Ensure these environment variables are loaded correctly
// In a typical Node.js app, they are accessed via process.env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using the descriptive service role key variable

if (!supabaseUrl) {
  console.error('SUPABASE_URL environment variable is not set!');
  // Consider throwing an error or exiting here in a real app
}
if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set!'); // Updated log message
  // Consider throwing an error or exiting here in a real app
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
