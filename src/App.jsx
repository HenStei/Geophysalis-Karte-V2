import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import imageCompression from 'browser-image-compression';
import { X, Upload, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Fix für Leaflet-Marker-Icons in React+Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Standard-Zentrum
  const position = [50.1109, 8.6821];

  const handleImageSelection = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vorschau anzeigen
    setSelectedImage(URL.createObjectURL(file));
    setIsCompressing(true);

    // Komprimierungs-Optionen
    const options = {
      maxSizeMB: 0.3, // Maximal 300KB
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
      console.log(`Originalgröße: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Komprimiert: ${(compressed.size / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error("Fehler bei der Komprimierung:", error);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpload = () => {
    if (!compressedFile) return;
    alert("Das Bild wurde lokal komprimiert! Hier binden wir im nächsten Schritt Supabase ein.");
    // Reset nach "Upload"
    setIsModalOpen(false);
    setSelectedImage(null);
    setCompressedFile(null);
  };

  return (
    <div className="relative w-full h-full">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full z-[1000] p-4 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a1a] drop-shadow-[0_0_8px_rgba(255,255,255,1)]">GEO-PHYSALIS</h1>
          <p className="text-[#1a1a1a] font-medium drop-shadow-[0_0_8px_rgba(255,255,255,1)]">Sticker weltweit entdecken</p>
        </div>
        {/* Platzhalter für Admin Login */}
        <button className="bg-white/90 px-3 py-1 rounded shadow text-sm font-medium hover:bg-gray-100 pointer-events-auto">
          Admin Login
        </button>
      </div>
      
      {/* Karte */}
      <MapContainer center={position} zoom={5} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="text-center">
              <strong className="block mb-1">Beispiel-Sticker</strong>
              Wartet auf Uploads...
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Upload Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="absolute bottom-8 right-8 z-[1000] bg-blue-600 text-white px-6 py-4 rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 transition-all font-bold text-lg pointer-events-auto flex items-center gap-2"
      >
        <MapPin size={24} /> Neuer Sticker
      </button>

      {/* Upload Modal (Overlay) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setSelectedImage(null);
                setCompressedFile(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold mb-4">Sticker eintragen</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Mache ein Foto von dem platzierten Sticker. Wir verkleinern es automatisch, um Daten zu sparen.
            </p>

            <div className="space-y-6">
              {/* Foto Input */}
              {!selectedImage ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500 font-medium">Foto aufnehmen oder auswählen</p>
                  </div>
                  {/* Das 'capture="environment"' sorgt am Handy dafür, dass sich direkt die Kamera öffnet */}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelection} />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={selectedImage} alt="Vorschau" className="w-full h-48 object-cover" />
                  <button 
                    onClick={() => {
                      setSelectedImage(null);
                      setCompressedFile(null);
                    }}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Status & Submit */}
              <div className="flex flex-col gap-2">
                {isCompressing && (
                  <p className="text-sm text-blue-600 text-center animate-pulse">Bild wird extrem komprimiert (spart 90% Platz)...</p>
                )}
                <button 
                  disabled={!compressedFile || isCompressing}
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                >
                  {isCompressing ? 'Bitte warten...' : 'Sticker hochladen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
