const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css += `
/* Discord-Style Avatar Frames */
.avatar-wrapper {
  position: relative;
  z-index: 10;
}

/* 🔥 Fire Frame */
.avatar-wrapper.frame-fire::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  background: linear-gradient(45deg, #ff0000, #ff7300, #ffeb3b, #ff7300);
  z-index: -1;
  animation: fire-flicker 1s infinite alternate;
  box-shadow: 0 0 15px #ff4500, inset 0 0 5px #ff0000;
}

@keyframes fire-flicker {
  0% { opacity: 0.8; transform: scale(1) translateY(0); filter: hue-rotate(0deg); }
  100% { opacity: 1; transform: scale(1.05) translateY(-2px); filter: hue-rotate(15deg); }
}

/* 🌪️ Wind / Storm Frame (Pixel Art Vibe) */
.avatar-wrapper.frame-wind::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 16px;
  border: 4px dashed #00ffff;
  animation: storm-spin 1.5s linear infinite;
  opacity: 0.9;
  box-shadow: 0 0 12px #00ffff;
  z-index: -1;
}
.avatar-wrapper.frame-wind::after {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 20px;
  border: 3px dotted #ffffff;
  animation: storm-spin-reverse 2.5s linear infinite;
  opacity: 0.6;
  z-index: -2;
}

@keyframes storm-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes storm-spin-reverse {
  0% { transform: rotate(360deg); }
  100% { transform: rotate(-360deg); }
}
`;

fs.writeFileSync('src/index.css', css);
