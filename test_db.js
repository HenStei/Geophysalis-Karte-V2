import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env
const env = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);
async function run() {
  const {data, error} = await supabase.from('profiles').select('*');
  console.log('Error:', error);
  console.log('Sample Data:', data ? data[0] : null);
}
run();
