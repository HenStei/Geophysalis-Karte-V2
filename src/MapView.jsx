import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { X, Upload, MapPin, Check, Info, LocateFixed } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { supabase } from './supabase';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function MapView() {
  const [map, setMap] = useState(null);
  const [pins, setPins] = useState([]);
  
  const [draftPin, setDraftPin] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Eigene States für die Eingabefelder, damit das Tippen und Löschen flüssig funktioniert
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [message, setMessage] = useState("");
  const [locationName, setLocationName] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [exifNotice, setExifNotice] = useState("");
  
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
    const { data, error } = await supabase.from('pins').select('*').eq('approved', true);
    if (data) setPins(data);
  };

  const fetchLocationName = async (lat, lng) => {
    setIsFetchingLocation(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || "Unbekannter Ort";
        const country = data.address.country || "";
        setLocationName(`${city}, ${country}`);
      } else {
        setLocationName("Unbekannter Ort");
      }
    } catch (e) {
      setLocationName("");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleStartNewPin = () => {
    if (map) {
      const center = map.getCenter();
      setDraftPin([center.lat, center.lng]);
      setManualLat(center.lat.toFixed(6));
      setManualLng(center.lng.toFixed(6));
      fetchLocationName(center.lat, center.lng);
    }
  };

  const markerRef = useRef(null);
  const dragHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        setDraftPin([latlng.lat, latlng.lng]);
        setManualLat(latlng.lat.toFixed(6));
        setManualLng(latlng.lng.toFixed(6));
        fetchLocationName(latlng.lat, latlng.lng);
      }
    }
  }), []);

  const handleConfirmPosition = () => {
    setIsModalOpen(true);
    setExifNotice("");
  };

  const handleLiveGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraftPin([lat, lng]);
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        fetchLocationName(lat, lng);
        setExifNotice("Standort erfolgreich vom Handy-GPS abgerufen!");
        if (map) map.flyTo([lat, lng], 15);
      }, () => {
        alert("GPS konnte nicht abgerufen werden. Bitte erlaube den Standort in deinem Browser.");
      });
    }
  };

  const handleImageSelection = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(URL.createObjectURL(file));
    setIsCompressing(true);
    setExifNotice("");

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
    if (!compressedFile || !draftPin) return;
    setIsUploading(true);
    
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage.from('stickers').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('stickers').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('pins').insert({
        lat: draftPin[0],
        lng: draftPin[1],
        image_url: publicUrl,
        message: message || null,
        location_name: locationName || null
      });
      if (dbError) throw dbError;

      alert("Danke! Dein Sticker wurde hochgeladen und wird bald vom Admin freigegeben.");
      
      setIsModalOpen(false);
      setSelectedImage(null);
      setCompressedFile(null);
      setDraftPin(null);
      setMessage("");
      setLocationName("");
      setExifNotice("");
    } catch (error) {
      console.error(error);
      alert("Es gab einen Fehler beim Upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none flex justify-between items-start">
        <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-2xl shadow-lg border border-gray-200 pointer-events-auto">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Geophysalis</h1>
        </div>
        {!draftPin && (
          <Link to="/admin" className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 pointer-events-auto transition">
            Admin
          </Link>
        )}
      </div>
      
      <MapContainer center={userLocation} zoom={5} zoomControl={false} ref={setMap} className="w-full h-full z-0">
        <ZoomControl position="bottomleft" />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <MarkerClusterGroup chunkedLoading>
          {pins.map(pin => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]}>
              <Popup>
                <div className="w-56 p-1">
                  <img src={pin.image_url} alt="Sticker" className="w-full h-40 object-cover rounded-lg mb-2 shadow-sm" />
                  {pin.location_name && <p className="font-bold text-gray-800 text-sm mb-1">{pin.location_name}</p>}
                  {pin.message && <p className="text-gray-700 text-sm italic mb-1">"{pin.message}"</p>}
                  <p className="text-xs text-gray-500 font-medium">Gefunden am: {new Date(pin.created_at).toLocaleDateString()}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {draftPin && !isModalOpen && (
          <Marker position={draftPin} draggable={true} ref={markerRef} eventHandlers={dragHandlers}>
            <Popup>Zieh mich an die genaue Stelle!</Popup>
          </Marker>
        )}
      </MapContainer>

      {!draftPin ? (
        <button onClick={handleStartNewPin} className="absolute bottom-8 right-8 z-[1000] bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 transition-all font-bold text-lg pointer-events-auto flex items-center gap-2">
          <MapPin size={24} /> Sticker setzen
        </button>
      ) : !isModalOpen && (
        <div className="absolute bottom-6 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-blue-600"/> Pin platzieren</h3>
            <p className="text-sm text-gray-600">Verschiebe den Pin auf der Karte an die exakte Stelle.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setDraftPin(null)} className="flex-1 sm:flex-none px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Abbrechen</button>
            <button onClick={handleConfirmPosition} className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md">
              <Check size={20}/> Bestätigen
            </button>
          </div>
        </div>
      )}

      {isModalOpen && draftPin && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl my-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition">
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-extrabold mb-1 text-gray-900">Sticker eintragen</h2>
            
            <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                {isFetchingLocation ? (
                  <p className="text-xs text-blue-600">Standort wird ermittelt...</p>
                ) : (
                  <p className="text-sm text-gray-700 font-bold flex items-center gap-1">
                    <MapPin size={14} className="text-blue-600"/> {locationName || "Manuelle Position"}
                  </p>
                )}
                <button onClick={handleLiveGPS} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-blue-600 font-bold flex items-center gap-1 hover:bg-gray-100 transition">
                  <LocateFixed size={12}/> Live GPS
                </button>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={manualLat} 
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    const val = parseFloat(e.target.value.replace(',', '.'));
                    if(!isNaN(val)) setDraftPin([val, draftPin[1]]);
                  }} 
                  className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Breite" 
                />
                <input 
                  type="text" 
                  value={manualLng} 
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    const val = parseFloat(e.target.value.replace(',', '.'));
                    if(!isNaN(val)) setDraftPin([draftPin[0], val]);
                  }} 
                  className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Länge" 
                />
              </div>
            </div>

            {exifNotice && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-xs p-3 rounded-xl flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>{exifNotice}</p>
              </div>
            )}

            <div className="space-y-4">
              {!selectedImage ? (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl cursor-pointer hover:bg-blue-50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                      <Upload className="text-blue-600" size={24} />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Foto auswählen</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
                  <img src={selectedImage} alt="Vorschau" className="w-full h-36 object-cover" />
                </div>
              )}

              <input 
                type="text" 
                placeholder="Kurze Nachricht oder Name (optional)" 
                maxLength={60}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              <div className="flex flex-col gap-2 pt-2">
                {isCompressing && <p className="text-sm text-blue-600 text-center font-medium animate-pulse">Bild wird vorbereitet...</p>}
                <button 
                  disabled={!compressedFile || isCompressing || isUploading}
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-md"
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
