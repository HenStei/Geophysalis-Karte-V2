import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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
  
  // Der Ort, an dem der neue Sticker platziert werden soll
  const [newPinLocation, setNewPinLocation] = useState(null);
  const [userLocation, setUserLocation] = useState([50.1109, 8.6821]); // Standard: Frankfurt

  useEffect(() => {
    fetchPins();
    // Versuche den aktuellen Standort des Nutzers zu finden
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
      // 1. Bild hochladen
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        
      if (uploadError) throw uploadError;

      // 2. Öffentliche URL abrufen
      const { data: { publicUrl } } = supabase.storage
        .from('stickers')
        .getPublicUrl(fileName);

      // 3. Pin in die Datenbank eintragen (approved = false)
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
      <div className="absolute top-0 left-0 w-full z-[1000] p-4 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a1a] drop-shadow-[0_0_8px_rgba(255,255,255,1)]">Geophysalis</h1>
          <p className="text-[#1a1a1a] font-medium drop-shadow-[0_0_8px_rgba(255,255,255,1)]">Sticker weltweit entdecken</p>
        </div>
        <Link to="/admin" className="bg-white/90 px-3 py-1 rounded shadow text-sm font-medium hover:bg-gray-100 pointer-events-auto">
          Admin Login
        </Link>
      </div>
      
      <MapContainer center={userLocation} zoom={5} className="w-full h-full z-0">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onMapClick={handleMapClick} />
        
        {pins.map(pin => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]}>
            <Popup>
              <div className="w-48">
                <img src={pin.image_url} alt="Sticker" className="w-full h-32 object-cover rounded-md mb-2" />
                <p className="text-xs text-gray-500">Gefunden am: {new Date(pin.created_at).toLocaleDateString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button 
        onClick={handleStartNewPin}
        className="absolute bottom-8 right-8 z-[1000] bg-blue-600 text-white px-6 py-4 rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 transition-all font-bold text-lg pointer-events-auto flex items-center gap-2"
      >
        <MapPin size={24} /> Neuer Sticker
      </button>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button 
              onClick={() => { setIsModalOpen(false); setSelectedImage(null); setCompressedFile(null); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold mb-2">Sticker eintragen</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Tippe alternativ auf die Karte, um den Standort manuell zu setzen!
            </p>

            <div className="space-y-6">
              {!selectedImage ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500 font-medium">Foto aufnehmen oder auswählen</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelection} />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={selectedImage} alt="Vorschau" className="w-full h-48 object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {isCompressing && <p className="text-sm text-blue-600 text-center animate-pulse">Bild wird komprimiert...</p>}
                <button 
                  disabled={!compressedFile || isCompressing || isUploading}
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
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
