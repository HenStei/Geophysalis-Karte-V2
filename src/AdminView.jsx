import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Trash2, MapPin } from 'lucide-react';

export default function AdminView() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllPins();
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllPins();
    });

    // Supabase Realtime-Verbindung für das Admin Dashboard
    const realtimeSubscription = supabase
      .channel('admin:pins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, () => {
        fetchAllPins();
      })
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(realtimeSubscription);
    };
  }, []);

  const fetchAllPins = async () => {
    const { data, error } = await supabase.from('pins').select('*').order('created_at', { ascending: false });
    if (data) setPins(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const approvePin = async (id) => {
    const { error } = await supabase.from('pins').update({ approved: true }).eq('id', id);
    if (!error) fetchAllPins();
  };

  const deletePin = async (id, imageUrl) => {
    if (!window.confirm("Diesen Pin wirklich löschen?")) return;
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('stickers').remove([fileName]);
    }
    const { error } = await supabase.from('pins').delete().eq('id', id);
    if (!error) fetchAllPins();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Admin Login</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Passwort</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-3" />
              </div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition">
                {loading ? 'Laden...' : 'Einloggen'}
              </button>
            </form>
            <Link to="/" className="block text-center mt-6 text-blue-600 font-medium hover:underline">Zurück zur Karte</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Verwalte hochgeladene Sticker.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 font-medium">
              <ArrowLeft className="mr-2" size={20} /> Zur Karte
            </Link>
            <button onClick={() => supabase.auth.signOut()} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-gray-200 transition">
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pins.map(pin => (
            <div key={pin.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <img src={pin.image_url} alt="Sticker" className="w-full h-48 object-cover" />
              <div className="p-4 flex flex-col flex-grow">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${pin.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {pin.approved ? 'Freigegeben' : 'Wartet...'}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{new Date(pin.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {pin.location_name && (
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1 mt-3">
                      <MapPin size={14} className="text-gray-500" /> {pin.location_name}
                    </p>
                  )}
                  {pin.message && (
                    <p className="text-sm text-gray-600 italic mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      "{pin.message}"
                    </p>
                  )}
                </div>
                
                <div className="mt-auto flex gap-2">
                  {!pin.approved && (
                    <button onClick={() => approvePin(pin.id)} className="flex-1 bg-green-500 text-white py-2 rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 font-bold transition">
                      <CheckCircle size={18} /> OK
                    </button>
                  )}
                  <button onClick={() => deletePin(pin.id, pin.image_url)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl hover:bg-red-100 flex items-center justify-center gap-2 font-bold transition border border-red-200">
                    <Trash2 size={18} /> Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pins.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-gray-100 border-dashed">
              <p className="text-gray-400 font-medium">Noch keine Pins hochgeladen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
