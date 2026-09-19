import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Trash2, MapPin, Clock, Check, Globe } from 'lucide-react';

export default function AdminView() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pins, setPins] = useState([]);
  
  // Dashboard 2.0 Tabs: 'pending' or 'approved'
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllPins();
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllPins();
    });

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
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-3 focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Passwort</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-3 focus:outline-blue-500" />
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

  const pendingPins = pins.filter(p => !p.approved);
  const approvedPins = pins.filter(p => p.approved);
  const displayPins = activeTab === 'pending' ? pendingPins : approvedPins;

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Behalte den Überblick über alle Sticker weltweit.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link to="/" className="flex-1 md:flex-none flex items-center justify-center bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition">
              <ArrowLeft className="mr-2" size={18} /> Weltkarte
            </Link>
            <button onClick={() => supabase.auth.signOut()} className="flex-1 md:flex-none bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-800 transition">
              Logout
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div onClick={() => setActiveTab('pending')} className={`cursor-pointer bg-white p-6 rounded-3xl border-2 transition-all shadow-sm ${activeTab === 'pending' ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Neue Anfragen</p>
                <h3 className="text-4xl font-black text-gray-900">{pendingPins.length}</h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-2xl">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
          
          <div onClick={() => setActiveTab('approved')} className={`cursor-pointer bg-white p-6 rounded-3xl border-2 transition-all shadow-sm ${activeTab === 'approved' ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Freigegebene Sticker</p>
                <h3 className="text-4xl font-black text-gray-900">{approvedPins.length}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-2xl">
                <Globe className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {activeTab === 'pending' ? 'Warten auf Freigabe' : 'Bereits veröffentlicht'}
            <span className="bg-gray-200 text-gray-600 py-0.5 px-2.5 rounded-full text-sm">{displayPins.length}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayPins.map(pin => (
            <div key={pin.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col group">
              <div className="relative h-56 overflow-hidden">
                <img src={pin.image_url} alt="Sticker" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {!pin.approved && (
                  <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                    Neu
                  </div>
                )}
              </div>
              
              <div className="p-5 flex flex-col flex-grow">
                <div className="mb-4">
                  {pin.location_name && (
                    <p className="text-sm font-black text-gray-800 flex items-start gap-1.5 mb-2 leading-tight">
                      <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" /> 
                      {pin.location_name}
                    </p>
                  )}
                  {pin.message && (
                    <p className="text-sm text-gray-600 italic bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                      "{pin.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-bold uppercase mt-4">
                    {new Date(pin.created_at).toLocaleDateString()} um {new Date(pin.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                
                <div className="mt-auto flex gap-2 pt-2 border-t border-gray-50">
                  {!pin.approved && (
                    <button onClick={() => approvePin(pin.id)} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 font-bold shadow-sm transition">
                      <CheckCircle size={18} /> Freigeben
                    </button>
                  )}
                  <button onClick={() => deletePin(pin.id, pin.image_url)} className="flex-1 bg-white text-red-500 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 flex items-center justify-center gap-2 font-bold transition border border-gray-200">
                    <Trash2 size={18} /> Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {displayPins.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 border-dashed">
              <div className="bg-gray-50 p-4 rounded-full mb-3">
                {activeTab === 'pending' ? <Clock size={32} className="text-gray-400" /> : <Globe size={32} className="text-gray-400" />}
              </div>
              <p className="text-gray-500 font-medium text-lg">
                {activeTab === 'pending' ? 'Keine neuen Sticker zum Freigeben.' : 'Noch keine Sticker veröffentlicht.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
