import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import imageCompression from 'browser-image-compression';
import { X, Upload, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { supabase } from './supabase';
import 'leaflet/dist/leaflet.css';

// Fix für Leaflet-Marker-Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Kleine Komponente, um Klicks auf die Karte abzufangen
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function MapView() {
  const [pins, setPins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [newPinLocation, setNewPinLocation] = useState(null);
  const [userLocation, setUserLocation] = useState([50.1109, 8.6821]); 

  useEffect(() => {
    fetchPins();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  const fetchPins = async () => {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .eq('approved', true);
    if (data) setPins(data);
  };

  const handleMapClick = (latlng) => {
    setNewPinLocation([latlng.lat, latlng.lng]);
    setIsModalOpen(true);
  };

  const handleStartNewPin = () => {
    setNewPinLocation(userLocation);
    setIsModalOpen(true);
  };

  const handleImageSelection = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(URL.createObjectURL(file));
    setIsCompressing(true);

    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true };
    try {
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpload = async () => {
    if (!compressedFile || !newPinLocation) return;
    setIsUploading(true);
    
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stickers')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('pins').insert({
        lat: newPinLocation[0],
        lng: newPinLocation[1],
        image_url: publicUrl
      });

      if (dbError) throw dbError;

      alert("Danke! Dein Sticker wurde hochgeladen und wird bald vom Admin freigegeben.");
      
      setIsModalOpen(false);
      setSelectedImage(null);
      setCompressedFile(null);
      setNewPinLocation(null);
    } catch (error) {
      console.error(error);
      alert("Es gab einen Fehler beim Upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Moderner Header mit Blur-Effekt, etwas eingerückt (top-4) */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none flex justify-between items-start">
        <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-2xl shadow-lg border border-gray-200 pointer-events-auto">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Geophysalis</h1>
        </div>
        <Link to="/admin" className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 pointer-events-auto transition">
          Admin
        </Link>
      </div>
      
      {/* Karte mit deaktiviertem Standard-Zoom (zoomControl=false), stattdessen Zoom unten links */}
      <MapContainer center={userLocation} zoom={5} zoomControl={false} className="w-full h-full z-0">
        <ZoomControl position="bottomleft" />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onMapClick={handleMapClick} />
        
        {pins.map(pin => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]}>
            <Popup>
              <div className="w-48 p-1">
                <img src={pin.image_url} alt="Sticker" className="w-full h-32 object-cover rounded-lg mb-2 shadow-sm" />
                <p className="text-xs text-gray-500 font-medium">Gefunden am: {new Date(pin.created_at).toLocaleDateString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Runderer und schickerer Button */}
      <button 
        onClick={handleStartNewPin}
        className="absolute bottom-8 right-8 z-[1000] bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 transition-all font-bold text-lg pointer-events-auto flex items-center gap-2"
      >
        <MapPin size={24} /> Sticker setzen
      </button>

      {/* Upload Modal bleibt fast gleich, nur optische Anpassungen */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button 
              onClick={() => { setIsModalOpen(false); setSelectedImage(null); setCompressedFile(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-extrabold mb-2 text-gray-900">Sticker eintragen</h2>
            <p className="text-gray-500 mb-6 text-sm font-medium">
              Tippe alternativ auf die Karte, um den Standort genau zu setzen!
            </p>

            <div className="space-y-6">
              {!selectedImage ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl cursor-pointer hover:bg-blue-50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                      <Upload className="text-blue-600" size={24} />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Foto aufnehmen oder auswählen</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelection} />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
                  <img src={selectedImage} alt="Vorschau" className="w-full h-48 object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {isCompressing && <p className="text-sm text-blue-600 text-center font-medium animate-pulse">Bild wird komprimiert...</p>}
                <button 
                  disabled={!compressedFile || isCompressing || isUploading}
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-md"
                >
                  {isUploading ? 'Wird hochgeladen...' : 'Sticker hochladen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
