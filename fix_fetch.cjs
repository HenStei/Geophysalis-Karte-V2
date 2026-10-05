const fs = require('fs');
let code = fs.readFileSync('src/AdminView.jsx', 'utf8');
code = code.replace("const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });", "const { data } = await supabase.from('profiles').select('*');");
fs.writeFileSync('src/AdminView.jsx', code);
