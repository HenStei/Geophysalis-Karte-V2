import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents, useMap, Rectangle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import imageCompression from 'browser-image-compression';
import { X, Upload, MapPin, Check, Info, LocateFixed, Layers, Share2, Dices, Compass, Navigation2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { supabase } from './supabase';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix für Leaflet-Marker-Icons als Fallback
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons generieren
const getStickerIcon = (url, isTarget = false) => {
  return L.divIcon({
    className: `custom-sticker-icon ${isTarget ? 'is-target' : ''}`,
    html: `<div style="background-image: url('${url}');"></div>`,
    iconSize: isTarget ? [60, 60] : [46, 46],
    iconAnchor: isTarget ? [30, 30] : [23, 23],
    popupAnchor: [0, -20]
  });
};

const draftIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="relative flex items-center justify-center w-12 h-12">
           <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-60"></div>
           <div class="relative z-10 w-5 h-5 bg-blue-600 border-[3px] border-white rounded-full shadow-lg"></div>
         </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Custom Heatmap Layer Component
function HeatmapLayer({ pins, isVisible }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!isVisible) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    if (!heatLayerRef.current && pins.length > 0) {
      const heatPoints = pins.map(p => [p.lat, p.lng, 3]);
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 40, 
        blur: 25,   
        maxZoom: 10,
        gradient: { 
          0.1: 'blue', 0.3: 'cyan', 0.5: 'lime', 0.7: 'yellow', 1.0: 'red' 
        }
      }).addTo(map);
    } else if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(pins.map(p => [p.lat, p.lng, 3]));
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, pins, isVisible]);

  return null;
}

// Minimap Syncer
function MinimapBounds({ parentMap }) {
  const minimap = useMap();
  const [bounds, setBounds] = useState(parentMap.getBounds());
  
  useEffect(() => {
    if (!parentMap) return;
    
    const update = () => {
      setBounds(parentMap.getBounds());
      // Zentriere Minimap und setze Zoom (ca. 6 Level weiter raus als Hauptkarte, mindestens Level 0)
      minimap.setView(parentMap.getCenter(), Math.max(0, parentMap.getZoom() - 6));
    };
    
    parentMap.on('move', update);
    parentMap.on('zoom', update);
    update();
    
    return () => {
      parentMap.off('move', update);
      parentMap.off('zoom', update);
    };
  }, [minimap, parentMap]);
  
  return <Rectangle bounds={bounds} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.2 }} />;
}

export default function MapView() {
  const [map, setMap] = useState(null);
  const [pins, setPins] = useState([]);
  
  const [draftPin, setDraftPin] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [targetPinId, setTargetPinId] = useState(null);

  // Radar & Roulette States
  const [radarActive, setRadarActive] = useState(false);
  const [radarState, setRadarState] = useState(''); 
  const [nearestData, setNearestData] = useState(null);

  const handleRoulette = () => {
    if (pins.length === 0 || !map) return;
    const randomPin = pins[Math.floor(Math.random() * pins.length)];
    // "Teleport" statt Kameraflug, damit der Browser nicht hunderte Kacheln über dem Ozean laden muss
    map.setView([randomPin.lat, randomPin.lng], 16, { animate: false });
  };

  const handleRadar = () => {
    if (!map || pins.length === 0) return;
    setRadarActive(true);
    setRadarState('searching');
    
    if (!("geolocation" in navigator)) {
      setRadarState('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        
        let closest = null;
        let minDistance = Infinity;
        
        pins.forEach(pin => {
          const dist = map.distance([userLat, userLng], [pin.lat, pin.lng]);
          if (dist < minDistance) {
            minDistance = dist;
            closest = pin;
          }
        });
        
        setNearestData({ pin: closest, distance: minDistance });
        setRadarState('found');
      },
      (err) => {
        // Code 1: Nutzer hat abgelehnt oder Browser blockiert generell
        if (err.code === 1) {
          setRadarState('denied');
        } else {
          setRadarState('error');
        }
      },
      // Timeout auf 15 Sekunden erhöht, da GPS auf Handys etwas dauern kann
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const markerRef = useRef(null);

  // Parse URL Parameters for Deep Linking on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setTargetPinId(pinParam.toString()); // Sicherstellen, dass es ein String ist (für UUIDs oder BigInt)
    }
  }, []);

  // Fly to target pin once map and pins are loaded
  useEffect(() => {
    if (targetPinId && map && pins.length > 0) {
      const targetPin = pins.find(p => p.id.toString() === targetPinId);
      if (targetPin) {
        // Leichte Verzögerung für weicheren Start der Kamera-Fahrt
        setTimeout(() => {
          map.flyTo([targetPin.lat, targetPin.lng], 16, { animate: true, duration: 2 });
        }, 600);
      }
    }
  }, [targetPinId, map, pins]);

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

  // Layer State
  const [mapStyle, setMapStyle] = useState('street'); 
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  useEffect(() => {
    fetchPins();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }

    const realtimeSubscription = supabase
      .channel('public:pins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, (payload) => {
        fetchPins(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeSubscription);
    };
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

  // Wir blockieren nur den Nord-/Südpol (vertikal), erlauben aber endloses seitliches Scrollen,
  // damit man über den Pazifik fliegen kann und keine grauen Fehler-Kacheln entstehen.
  const worldBounds = [
    [-90, -2000],
    [90, 2000]
  ];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden overscroll-none">
      
      {/* Top Left Header & Counter (Optimized for Mobile) */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none flex flex-col gap-2 sm:gap-3">
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 flex items-center gap-2 sm:gap-3 pointer-events-auto transition-all">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight hidden sm:block">Geophysalis</h1>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <p className="text-[10px] sm:text-xs font-bold text-gray-700 tracking-wide uppercase mt-0.5">
              {pins.length} <span className="hidden sm:inline">Sticker weltweit</span><span className="sm:hidden">Sticker</span>
            </p>
          </div>
        </div>
      </div>

      {/* Layer Menu & About Button (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Link 
            to="/about"
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 text-gray-700 hover:bg-gray-50 transition flex items-center justify-center font-bold text-sm"
          >
            <Info size={20} className="sm:mr-1" />
            <span className="hidden sm:inline">Story</span>
          </Link>
          
          <button 
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 text-gray-700 hover:bg-gray-50 transition"
          >
            <Layers size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {showLayerMenu && (
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col gap-4 w-44 sm:w-48 animate-in slide-in-from-top-4 origin-top-right">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Karten-Stil</p>
              <div className="flex flex-col gap-1">
                <button onClick={() => setMapStyle('street')} className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition ${mapStyle === 'street' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Standard</button>
                <button onClick={() => setMapStyle('satellite')} className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition ${mapStyle === 'satellite' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Satellit</button>
                <button onClick={() => setMapStyle('dark')} className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition ${mapStyle === 'dark' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Dark Mode</button>
              </div>
            </div>
            <div className="h-px bg-gray-200 w-full"></div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ansicht</p>
              <div className="flex flex-col gap-1">
                <button onClick={() => setShowHeatmap(false)} className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition ${!showHeatmap ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Foto-Pins</button>
                <button onClick={() => setShowHeatmap(true)} className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition ${showHeatmap ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}>Heatmap</button>
              </div>
            </div>
          </div>
        )}
        
        {!draftPin && (
          <Link to="/admin" className="mt-1 sm:mt-2 bg-white/95 backdrop-blur-md px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 text-xs sm:text-sm font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 pointer-events-auto transition self-end">
            Admin
          </Link>
        )}
      </div>
      
      <MapContainer 
        center={userLocation} 
        zoom={5} 
        minZoom={2}
        maxBounds={worldBounds}
        maxBoundsViscosity={1.0}
        zoomControl={false} 
        worldCopyJump={true}
        ref={setMap} 
        className={`w-full h-full z-0 ${mapStyle === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#e5e5e5]'}`}
      >
        <ZoomControl position="bottomleft" />
        
        {/* Map Styles */}
        {mapStyle === 'street' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri'
          />
        )}
        {mapStyle === 'satellite' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri'
          />
        )}
        {mapStyle === 'dark' && (
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" 
            attribution='Tiles &copy; Esri'
          />
        )}
        
        {/* Marker Layer (Hidden when Heatmap is active) */}
        {!showHeatmap && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false} spiderfyOnMaxZoom={true} disableClusteringAtZoom={15}>
            {pins.map(pin => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={getStickerIcon(pin.image_url, targetPinId && pin.id.toString() === targetPinId)}>
                <Popup>
                  <div className="flex flex-col bg-white">
                    <img src={pin.image_url} alt="Sticker" className="w-full h-48 object-cover rounded-t-xl" />
                    <div className="p-4">
                      {pin.location_name && <p className="font-bold text-gray-900 text-sm mb-1">{pin.location_name}</p>}
                      {pin.message && <p className="text-gray-600 text-sm italic mb-2">"{pin.message}"</p>}
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">
                        Gefunden am {new Date(pin.created_at).toLocaleDateString()}
                      </p>
                      
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/?pin=${pin.id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedId(pin.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="mt-3 w-full bg-blue-50 text-blue-600 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition active:scale-95"
                      >
                        {copiedId === pin.id ? <Check size={16} /> : <Share2 size={16} />}
                        {copiedId === pin.id ? 'Link kopiert!' : 'Sticker teilen'}
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Heatmap Layer */}
        <HeatmapLayer pins={pins} isVisible={showHeatmap} />

        {draftPin && !isModalOpen && (
          <Marker position={draftPin} draggable={true} ref={markerRef} eventHandlers={dragHandlers} icon={draftIcon}>
            <Popup>
              <div className="text-center font-bold text-gray-800 p-1">Zieh mich an die genaue Stelle!</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Radar & Roulette Buttons */}
      {!draftPin && !isModalOpen && pins.length > 0 && (
        <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-8 z-[1000] flex flex-col gap-3 pointer-events-none">
          <button 
            onClick={handleRoulette} 
            title="Zufälliger Sticker"
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Dices size={24} />
          </button>
          <button 
            onClick={handleRadar} 
            title="Radar (Nächster Sticker)"
            className="bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Compass size={24} />
          </button>
        </div>
      )}

      {!draftPin ? (
        <button onClick={handleStartNewPin} className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-[1000] bg-blue-600 text-white px-5 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl hover:bg-blue-700 hover:scale-105 hover:-translate-y-1 transition-all font-bold text-base sm:text-lg pointer-events-auto flex items-center gap-2">
          <MapPin size={22} className="sm:w-6 sm:h-6" /> Sticker setzen
        </button>
      ) : !isModalOpen && (
        <div className="absolute bottom-6 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto animate-in slide-in-from-bottom-10">
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

      {/* Floating Minimap (Desktop Only) */}
      {!draftPin && !isModalOpen && map && (
        <div className="absolute bottom-8 left-20 z-[1000] hidden lg:block w-44 h-44 rounded-full border-4 border-white shadow-2xl overflow-hidden pointer-events-none transition-all">
          <MapContainer 
            center={userLocation} 
            zoom={0} 
            zoomControl={false} 
            dragging={false} 
            scrollWheelZoom={false}
            doubleClickZoom={false}
            attributionControl={false}
            worldCopyJump={true}
            className="w-full h-full bg-[#e5e5e5]"
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
            <MinimapBounds parentMap={map} />
          </MapContainer>
        </div>
      )}

      {/* Radar Overlay */}
      {radarActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[2000] w-[92%] sm:w-[400px] bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-blue-100 animate-in slide-in-from-bottom-10 pointer-events-auto">
          <button onClick={() => setRadarActive(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition bg-gray-100 rounded-full p-1"><X size={18}/></button>
          
          {radarState === 'searching' && (
            <div className="flex flex-col items-center gap-4 py-4">
               <Compass size={40} className="text-blue-500 animate-spin" />
               <div className="text-center">
                 <p className="font-bold text-gray-900 text-lg">Radar aktiv...</p>
                 <p className="text-sm text-gray-500">Peile deinen Standort an.</p>
               </div>
            </div>
          )}
          
          {radarState === 'error' && (
            <div className="text-center py-4">
               <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                 <MapPin size={24} className="text-red-500" />
               </div>
               <p className="font-bold text-gray-900 text-lg mb-1">Standort nicht gefunden</p>
               <p className="text-sm text-gray-500">Das GPS Signal ist zu schwach oder hat einen Timeout.</p>
            </div>
          )}

          {radarState === 'denied' && (
            <div className="text-center py-4">
               <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                 <MapPin size={24} className="text-red-500" />
               </div>
               <p className="font-bold text-gray-900 text-lg mb-1">Standort blockiert</p>
               <p className="text-sm text-gray-500">Du musst oben im Browser (Schloss-Symbol) den Zugriff auf den Standort erlauben, damit das Radar funktioniert.</p>
            </div>
          )}
          
          {radarState === 'found' && nearestData && (
            <div className="flex flex-col items-center text-center">
               <div className="bg-blue-100 p-3 rounded-2xl mb-3">
                 <Navigation2 size={32} className="text-blue-600" />
               </div>
               <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Nächster Sticker in</p>
               <p className="text-4xl font-black text-gray-900 mb-1 tracking-tight">
                 {nearestData.distance > 1000 ? `${(nearestData.distance / 1000).toFixed(1)} km` : `${Math.round(nearestData.distance)} m`}
               </p>
               <p className="text-sm text-gray-600 font-medium mb-6">📍 {nearestData.pin.location_name}</p>
               
               <button 
                 onClick={() => {
                   setRadarActive(false);
                   setTargetPinId(nearestData.pin.id.toString());
                   map.flyTo([nearestData.pin.lat, nearestData.pin.lng], 16, { animate: true, duration: 2.5 });
                 }}
                 className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
               >
                 Hinfliegen <Navigation2 size={18} />
               </button>
            </div>
          )}
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
                    setLocationName(""); 
                  }} 
                  onBlur={() => {
                    const val = parseFloat(manualLat.replace(',', '.'));
                    if(!isNaN(val)) {
                      setDraftPin([val, draftPin[1]]);
                      setManualLat(val.toFixed(6));
                      fetchLocationName(val, draftPin[1]);
                      if (map) map.flyTo([val, draftPin[1]], 15);
                    }
                  }}
                  className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Breitengrad" 
                />
                <input 
                  type="text" 
                  value={manualLng} 
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    setLocationName(""); 
                  }} 
                  onBlur={() => {
                    const val = parseFloat(manualLng.replace(',', '.'));
                    if(!isNaN(val)) {
                      setDraftPin([draftPin[0], val]);
                      setManualLng(val.toFixed(6));
                      fetchLocationName(draftPin[0], val);
                      if (map) map.flyTo([draftPin[0], val], 15);
                    }
                  }}
                  className="w-1/2 text-xs border border-gray-300 p-2 rounded-lg bg-white focus:outline-blue-500" placeholder="Längengrad" 
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
