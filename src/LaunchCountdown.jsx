import React, { useState, useEffect, useRef } from 'react';

export default function LaunchCountdown({ timeRemainingSeconds, onComplete }) {
  const [isZooming, setIsZooming] = useState(timeRemainingSeconds <= 0);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const animRef = useRef(null);
  const videoRef = useRef(null);

  // Trigger zooming when timer hits 0
  useEffect(() => {
    if (timeRemainingSeconds <= 0 && !isZooming) {
      setIsZooming(true);
    }
  }, [timeRemainingSeconds, isZooming]);

  useEffect(() => {
    if (isZooming) {
      cancelAnimationFrame(animRef.current);
      
      // FAILSAFE: If video hangs or fails completely, force open map after 7 seconds
      const failsafe = setTimeout(() => {
        onComplete();
      }, 7000);

      // Play video handling Autoplay Policies
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.warn("Audio autoplay blocked by browser. Playing muted...", err);
          // Fallback to muted playback so the visual still works
          if (videoRef.current) {
             videoRef.current.muted = true;
             videoRef.current.play().catch(e => {
                console.error("Video completely blocked:", e);
                onComplete(); // Skip immediately if even muted fails
             });
          }
        });
      }
      return () => clearTimeout(failsafe);
    }

    // Bouncing Physalis Logic - Optimized for Mobile
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 8 : 20; // Reduce DOM elements on phones to prevent lag
    
    const items = Array.from({ length: count }).map(() => ({
      x: Math.random() * (window.innerWidth - 64),
      y: Math.random() * (window.innerHeight - 64),
      vx: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3),
      vy: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3),
      el: null,
      size: 48 + Math.random() * 32,
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 3
    }));
    itemsRef.current = items;

    const update = () => {
      items.forEach(item => {
        item.x += item.vx;
        item.y += item.vy;
        item.rot += item.rotSpeed;

        if (item.x <= 0 || item.x >= window.innerWidth - item.size) item.vx *= -1;
        if (item.y <= 0 || item.y >= window.innerHeight - item.size) item.vy *= -1;

        if (item.el) {
          // Use translate3d to force hardware acceleration (GPU) and prevent lag
          item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rot}deg)`;
        }
      });
      animRef.current = requestAnimationFrame(update);
    };
    update();

    return () => cancelAnimationFrame(animRef.current);
  }, [isZooming, onComplete]);

  // Format time (MM:SS)
  const displayMinutes = Math.floor(timeRemainingSeconds / 60);
  const displaySeconds = timeRemainingSeconds % 60;
  const isCritical = timeRemainingSeconds <= 10 && timeRemainingSeconds > 0;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden z-[99999] font-mono">
      
      <style>{`
        @keyframes timer-alert {
          0%, 100% { color: white; text-shadow: 0 0 30px rgba(255,255,255,0.4); transform: scale(1); }
          50% { color: #ef4444; text-shadow: 0 0 60px rgba(239,68,68,0.9); transform: scale(1.1); }
        }
      `}</style>

      {/* Video Overlay triggered at 0 */}
      {isZooming && (
        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center z-50">
          <video
            ref={videoRef}
            src="/launch_intro.mp4"
            className="w-full h-full object-cover"
            playsInline
            onEnded={() => onComplete()}
          />
        </div>
      )}

      {/* Normal Countdown View */}
      {!isZooming && itemsRef.current.map((item, i) => (
        <img
          key={i}
          ref={el => item.el = el}
          src="/badges/physalis_sprite.jpg"
          className="absolute top-0 left-0 mix-blend-screen opacity-90 object-contain will-change-transform"
          style={{ width: `${item.size}px`, height: `${item.size}px` }}
          alt=""
        />
      ))}

      {!isZooming && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000">
          <h1 className="text-4xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-4 text-center px-4 tracking-widest uppercase">
            System Initialisierung
          </h1>
          <div 
            className="text-[80px] md:text-[150px] font-black leading-none will-change-transform mt-8"
            style={{
              animation: isCritical ? 'timer-alert 1s infinite ease-in-out' : 'none',
              color: 'white',
              textShadow: '0 0 30px rgba(255,255,255,0.4)'
            }}
          >
            {displayMinutes.toString().padStart(2, '0')}:{displaySeconds.toString().padStart(2, '0')}
          </div>
          <div className="mt-12 flex gap-2">
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-sm text-gray-500 mt-8 tracking-[0.2em] uppercase animate-pulse text-center px-4">
            Bereit für Eintritt in die Atmosphäre
          </p>
        </div>
      )}
    </div>
  );
}
