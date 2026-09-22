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
  const [totalUsers, setTotalUsers] = useState(0);
  const [weekActivity, setWeekActivity] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState({});
  
  // Dashboard 2.0 Tabs: 'pending' or 'approved'
  const [activeTab, setActiveTab] = useState('pending');

  const SPECIAL_BADGES = [
    { id: '', label: 'Kein Special Badge' },
    { id: 'atlantis', label: 'Atlantis (Unterwasser)' },
    { id: 'unter_tage', label: 'Unter Tage (Höhle/Bergwerk)' },
    { id: 'lost_place', label: 'Lost Place' },
    { id: 'aurora', label: 'Aurora Borealis' },
    { id: 'sonnenfinsternis', label: 'Sonnenfinsternis' },
    { id: 'coop', label: 'Coop (Zusammen)' },
    { id: 'og', label: 'OG (Alte Geophysalis)' }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { fetchAllPins(); fetchStats(); }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { fetchAllPins(); fetchStats(); }
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

  const fetchStats = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (count !== null) setTotalUsers(count);

    const { data: activityData } = await supabase
      .from('pins')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const countsByDay = days.map(day => ({
      day: day.slice(5),
      count: (activityData || []).filter(p => p.created_at.startsWith(day)).length
    }));
    setWeekActivity(countsByDay);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const approvePin = async (id) => {
    const specialBadge = selectedBadges[id] || null;
    const { error } = await supabase.from('pins').update({ approved: true, special_badge: specialBadge }).eq('id', id);
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

  const countryCount = {};
  approvedPins.forEach(pin => {
    if (!pin.location_name) return;
    const parts = pin.location_name.split(',');
    const country = parts[parts.length - 1].trim();
    if (country) countryCount[country] = (countryCount[country] || 0) + 1;
  });
  const topCountries = Object.entries(countryCount).sort(([,a],[,b]) => b - a).slice(0, 5);

  return (
    <div className="min-h-[100dvh] bg-[#f3f4f6] p-4 sm:p-8 w-full">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div onClick={() => setActiveTab('pending')} className={`cursor-pointer bg-white p-5 rounded-3xl border-2 transition-all shadow-sm ${activeTab === 'pending' ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ausstehend</p>
                <h3 className="text-3xl font-black text-gray-900">{pendingPins.length}</h3>
              </div>
              <div className="bg-yellow-100 p-2.5 rounded-2xl"><Clock className="text-yellow-600" size={20} /></div>
            </div>
          </div>
          <div onClick={() => setActiveTab('approved')} className={`cursor-pointer bg-white p-5 rounded-3xl border-2 transition-all shadow-sm ${activeTab === 'approved' ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Freigegeben</p>
                <h3 className="text-3xl font-black text-gray-900">{approvedPins.length}</h3>
              </div>
              <div className="bg-green-100 p-2.5 rounded-2xl"><Globe className="text-green-600" size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border-2 border-transparent shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nutzer gesamt</p>
                <h3 className="text-3xl font-black text-gray-900">{totalUsers}</h3>
              </div>
              <div className="bg-purple-100 p-2.5 rounded-2xl"><CheckCircle className="text-purple-600" size={20} /></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border-2 border-transparent shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Top Länder</p>
                <div className="flex flex-col gap-0.5 mt-1">
                  {topCountries.length === 0
                    ? <p className="text-xs text-gray-400">–</p>
                    : topCountries.map(([c, n]) => (
                      <p key={c} className="text-xs font-bold text-gray-700"><span className="text-gray-400 font-normal">{n}×</span> {c}</p>
                    ))
                  }
                </div>
              </div>
              <div className="bg-blue-100 p-2.5 rounded-2xl"><MapPin className="text-blue-600" size={20} /></div>
            </div>
          </div>
        </div>

        {weekActivity.length > 0 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm mb-6">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">📊 Aktivität – letzte 7 Tage</p>
            <div className="flex items-end gap-2 h-20">
              {weekActivity.map(({ day, count }) => {
                const maxCount = Math.max(...weekActivity.map(d => d.count), 1);
                const heightPct = count === 0 ? 4 : Math.round((count / maxCount) * 100);
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-black text-gray-700">{count > 0 ? count : ''}</span>
                    <div className="w-full rounded-t-lg bg-blue-500" style={{ height: `${heightPct}%` }} />
                    <span className="text-[9px] text-gray-400 font-bold">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}


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
                
                <div className="mt-auto pt-2 border-t border-gray-50 flex flex-col gap-2">
                  {!pin.approved && (
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl p-2.5 focus:ring-blue-500 focus:border-blue-500 font-bold outline-none"
                      value={selectedBadges[pin.id] || ''}
                      onChange={(e) => setSelectedBadges({...selectedBadges, [pin.id]: e.target.value})}
                    >
                      {SPECIAL_BADGES.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
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
