import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function testRLS() {
  // Sign in anonymously or with dummy to get an authenticated session
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: 'test_rls_123@example.com',
    password: 'password123'
  });
  
  if (authErr && authErr.message !== 'User already registered') {
    console.error("Auth Error:", authErr);
  }

  const { data: loginData } = await supabase.auth.signInWithPassword({
    email: 'test_rls_123@example.com',
    password: 'password123'
  });

  const token = loginData?.session?.access_token;
  if (!token) return console.log("Could not log in");

  // Create client with this user's token
  const authSupabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { error } = await authSupabase
    .from('invite_codes')
    .update({ is_used: true })
    .eq('code', 'TEST_NOT_EXIST');

  console.log("Update Error with Auth:", error);
}

testRLS();
