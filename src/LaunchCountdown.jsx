import React, { useState, useEffect, useRef } from 'react';

export default function LaunchCountdown({ onComplete }) {
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds test
  const [isZooming, setIsZooming] = useState(false);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    if (isZooming) return; // Stop timer if zooming

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsZooming(true);
          // Start the zoom animation, wait 3 seconds, then complete
          setTimeout(() => {
            onComplete();
          }, 3500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete, isZooming]);

  useEffect(() => {
    if (isZooming) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    // Generate 20 bouncing Physalis
    const count = 20;
    const items = Array.from({ length: count }).map(() => ({
      x: Math.random() * (window.innerWidth - 64),
      y: Math.random() * (window.innerHeight - 64),
      vx: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
      vy: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
      el: null,
      size: 48 + Math.random() * 32, // random sizes between 48 and 80
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 4
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
          item.el.style.transform = `translate(${item.x}px, ${item.y}px) rotate(${item.rot}deg)`;
        }
      });
      animRef.current = requestAnimationFrame(update);
    };
    update();

    return () => cancelAnimationFrame(animRef.current);
  }, [isZooming]);

  // --- Zoom Animation Logic ---
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOpacity, setZoomOpacity] = useState(1);
  
  useEffect(() => {
    if (isZooming) {
      // Small delay to allow the DOM to render the earth at scale(1) before transitioning
      const t = setTimeout(() => {
        setZoomScale(150);
        setZoomOpacity(0);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isZooming]);
  
  // ...

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden z-[99999] font-mono">
      
      {/* Zoom Animation Overlay */}
      {isZooming && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div 
            className="w-64 h-64 rounded-full flex items-center justify-center transition-all duration-[3000ms] ease-in-out origin-center"
            style={{
              transform: `scale(${zoomScale})`,
              opacity: zoomOpacity,
              backgroundImage: 'url(/pixel_earth.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              imageRendering: 'pixelated'
            }}
          ></div>
          {/* A white flash effect at the end of the zoom */}
          <div className="absolute inset-0 bg-white animate-[ping_3s_ease-in-out_forwards] mix-blend-overlay"></div>
        </div>
      )}

      {/* Normal Countdown View */}
      {!isZooming && itemsRef.current.map((item, i) => (
        <img
          key={i}
          ref={el => item.el = el}
          src="/badges/physalis_sprite.jpg"
          className="absolute top-0 left-0 mix-blend-screen opacity-90 object-contain will-change-transform transition-opacity duration-1000"
          style={{ width: `${item.size}px`, height: `${item.size}px` }}
          alt=""
        />
      ))}

      {!isZooming && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000">
          <h1 className="text-4xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-4 text-center px-4 tracking-widest uppercase">
            Geophysalis Launch
          </h1>
          <div className="text-[100px] md:text-[150px] font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] leading-none">
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
          <div className="mt-8 flex gap-2">
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-xl text-gray-500 mt-4 tracking-[0.3em] uppercase animate-pulse">
            System Initialisierung
          </p>
        </div>
      )}
    </div>
  );
}
