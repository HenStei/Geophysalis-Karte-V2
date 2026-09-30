import React, { useState, useEffect, useRef } from 'react';

export default function LaunchCountdown({ onComplete }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isZooming, setIsZooming] = useState(false);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    if (isZooming) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsZooming(true);
          // 4.5 seconds of epic cinematic zoom
          setTimeout(() => {
            onComplete();
          }, 4500);
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

    const count = 20;
    const items = Array.from({ length: count }).map(() => ({
      x: Math.random() * (window.innerWidth - 64),
      y: Math.random() * (window.innerHeight - 64),
      vx: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
      vy: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
      el: null,
      size: 48 + Math.random() * 32,
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

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden z-[99999] font-mono">
      
      {/* Injecting CSS Keyframes directly for the cinematic sequence */}
      <style>{`
        @keyframes anim-warp {
          0% { transform: scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: scale(4); opacity: 1; }
        }
        @keyframes anim-earth {
          0% { transform: scale(0.5); opacity: 1; }
          40% { transform: scale(3); opacity: 1; }
          80% { transform: scale(25); opacity: 0.8; }
          100% { transform: scale(60); opacity: 0; }
        }
        @keyframes anim-clouds {
          0% { transform: scale(1) translateY(-20%); opacity: 0; }
          60% { transform: scale(1.5) translateY(0%); opacity: 0; }
          75% { transform: scale(3) translateY(10%); opacity: 0.9; }
          100% { transform: scale(6) translateY(30%); opacity: 0; }
        }
        @keyframes anim-flash {
          0%, 85% { opacity: 0; }
          95%, 100% { opacity: 1; }
        }
      `}</style>

      {isZooming && (
        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
          
          {/* Layer 1: Warp Speed Starfield */}
          <div 
            className="absolute inset-0 bg-cover bg-center origin-center"
            style={{ 
              backgroundImage: 'url(/anim_warp.jpg)',
              animation: 'anim-warp 4.5s ease-in forwards'
            }}
          />

          {/* Layer 2: The Earth (Zooming into Europe/Germany) 
              Transform origin is slightly offset to zoom into Central Europe rather than the exact equator */}
          <div 
            className="absolute w-[600px] h-[600px] rounded-full bg-contain bg-no-repeat bg-center mix-blend-screen"
            style={{ 
              backgroundImage: 'url(/anim_earth.png)',
              transformOrigin: '53% 32%', 
              animation: 'anim-earth 4.5s cubic-bezier(0.5, 0, 0.9, 0.5) forwards'
            }}
          />

          {/* Layer 3: Passing through the clouds */}
          <div 
            className="absolute inset-0 bg-cover bg-center origin-bottom"
            style={{ 
              backgroundImage: 'url(/anim_clouds.png)',
              animation: 'anim-clouds 4.5s ease-in forwards'
            }}
          />

          {/* Layer 4: Final White Flash Transition */}
          <div 
            className="absolute inset-0 bg-white"
            style={{ 
              animation: 'anim-flash 4.5s ease-in forwards'
            }}
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
