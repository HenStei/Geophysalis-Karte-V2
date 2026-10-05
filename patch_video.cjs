const fs = require('fs');

const mapFile = 'src/MapView.jsx';
let mapContent = fs.readFileSync(mapFile, 'utf8');

// Patch Auth Modal Video Background
mapContent = mapContent.replace(
    '<div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">',
    `<div className="absolute inset-0 z-[3000] flex items-center justify-center p-4">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="/landingpage.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>`
);

// We need to add z-10 to the inner container of Auth Modal so it sits on top of the video
mapContent = mapContent.replace(
    '<div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">',
    '<div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-white/20">'
);

// Patch Invite Modal Video Background
mapContent = mapContent.replace(
    '<div id="invite-modal" className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">',
    `<div id="invite-modal" className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="/landingpage.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>`
);

// Add z-10 to the inner container of Invite Modal
mapContent = mapContent.replace(
    '<div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">',
    '<div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden z-10">'
);

fs.writeFileSync(mapFile, mapContent);
console.log("VIDEO PATCH SUCCESSFUL");
