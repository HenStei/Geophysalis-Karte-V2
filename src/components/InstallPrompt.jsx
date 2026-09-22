import React, { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;

    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isStandaloneMode);

    // Desktop Check (don't show on large screens where PWA is less common)
    const isDesktop = window.innerWidth > 768;

    if (isStandaloneMode || isDesktop) return;

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }

    // Android/Chrome Detection
    let promptTriggered = false;
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      promptTriggered = true;
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback if beforeinstallprompt doesn't fire (e.g., manifest issues, desktop Chrome heuristics)
    const fallbackTimer = setTimeout(() => {
      if (!promptTriggered) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction if the event didn't trigger
      alert("Tippe oben im Browser-Menü (drei Punkte) auf 'App installieren' oder 'Zum Startbildschirm hinzufügen'!");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex gap-4 items-center animate-in slide-in-from-bottom-10 pointer-events-auto max-w-md mx-auto">
      <div className="bg-black rounded-2xl p-0 shrink-0 shadow-inner overflow-hidden border border-gray-800">
        <img src="/favicon-pwa.jpg" alt="Geophysalis Logo" className="w-14 h-14 object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="font-black text-gray-900 text-sm mb-1">Geophysalis App</h3>
        {isIOS ? (
          <p className="text-xs text-gray-600 leading-tight">Tippe unten im Safari auf <Share size={14} className="inline mx-0.5 text-blue-500" /> und wähle <strong>Zum Home-Bildschirm</strong>.</p>
        ) : (
          <p className="text-xs text-gray-600 leading-tight">Installiere die App für Vollbild und Schnellzugriff auf deinem Gerät.</p>
        )}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {!isIOS && (
          <button onClick={handleInstallClick} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-blue-700 shadow-md">
            Laden
          </button>
        )}
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 bg-gray-50 text-xs px-4 py-2 rounded-full font-bold">
          Später
        </button>
      </div>
    </div>
  );
}
