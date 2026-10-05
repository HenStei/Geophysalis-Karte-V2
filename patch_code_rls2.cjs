const fs = require('fs');
let code = fs.readFileSync('src/MapView.jsx', 'utf8');

const regex = /\/\/ Mark code as used[\s\S]*?await supabase\.from\('invite_codes'\)\.update\(\{ is_used: true, used_by: session\.user\.id, used_at: new Date\(\) \}\)\.eq\('code', codeData\.code\);[\s\S]*?\/\/ Approve user[\s\S]*?await supabase\.from\('profiles'\)\.update\(\{ is_approved: true \}\)\.eq\('id', session\.user\.id\);/;

const replacement = `// Mark code as used
      const { error: updateError } = await supabase.from('invite_codes').update({ is_used: true, used_by: session.user.id, used_at: new Date() }).eq('code', codeData.code);
      
      if (updateError) {
        console.error("Code Update Error:", updateError);
        return setInviteError('Datenbank-Fehler: RLS blockiert das Einlösen (Code konnte nicht als verbraucht markiert werden).');
      }

      // Approve user
      await supabase.from('profiles').update({ is_approved: true }).eq('id', session.user.id);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/MapView.jsx', code);
