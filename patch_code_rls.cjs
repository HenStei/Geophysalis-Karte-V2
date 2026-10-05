const fs = require('fs');
let code = fs.readFileSync('src/MapView.jsx', 'utf8');

const oldUpdate = `// Mark code as used
      await supabase.from('invite_codes').update({ is_used: true, used_by: session.user.id, used_at: new Date() }).eq('code', codeData.code);
      
      // Approve user
      await supabase.from('profiles').update({ is_approved: true }).eq('id', session.user.id);`;

const newUpdate = `// Mark code as used
      const { error: updateError } = await supabase.from('invite_codes').update({ is_used: true, used_by: session.user.id, used_at: new Date() }).eq('code', codeData.code);
      
      if (updateError) {
        console.error("Code Update Error:", updateError);
        return setInviteError('Datenbank-Fehler: RLS blockiert das Einlösen. Bitte den Admin kontaktieren.');
      }

      // Approve user
      await supabase.from('profiles').update({ is_approved: true }).eq('id', session.user.id);`;

code = code.replace(oldUpdate, newUpdate);
fs.writeFileSync('src/MapView.jsx', code);
