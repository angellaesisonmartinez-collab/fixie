import fs from 'fs';

const mascotBuf = fs.readFileSync('src/assets/fixie-mascot.png');
const wordmarkBuf = fs.readFileSync('src/assets/fixie-wordmark.png');
const mascotBase64 = 'data:image/png;base64,' + mascotBuf.toString('base64');
const wordmarkBase64 = 'data:image/png;base64,' + wordmarkBuf.toString('base64');

// High-resolution unified SVG Logo
const fullLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 74" width="260" height="74" fill="none">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&amp;display=swap');
      .tagline-text {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-weight: 700;
        font-size: 7.6px;
        fill: #375043;
        letter-spacing: 0.105em;
        text-transform: uppercase;
      }
    </style>
  </defs>

  <!-- Fox Mascot with Hard Hat (High-Resolution 208x285 source, transparent background) -->
  <image href="${mascotBase64}" x="0" y="1" width="53" height="72" preserveAspectRatio="xMidYMid meet" />

  <!-- Fixie Wordmark with Orange Wrench (High-Resolution 939x320 source, transparent background) -->
  <image href="${wordmarkBase64}" x="60" y="5" width="122" height="41.6" preserveAspectRatio="xMidYMid meet" />

  <!-- Tagline: LABORATORY READINESS & MAINTENANCE MONITORING -->
  <text x="61" y="56" class="tagline-text">LABORATORY READINESS &amp;</text>
  <text x="61" y="67" class="tagline-text">MAINTENANCE MONITORING</text>
</svg>`;

// Fox Icon SVG (for Favicon and Collapsed/Icon-only spaces)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 74" width="64" height="74" fill="none">
  <!-- Fixie Fox Mascot Icon -->
  <image href="${mascotBase64}" x="0" y="0" width="64" height="74" preserveAspectRatio="xMidYMid meet" />
</svg>`;

// Write to src/assets
fs.writeFileSync('src/assets/fixie-logo.svg', fullLogoSvg);
fs.writeFileSync('src/assets/fixie-icon.svg', iconSvg);

// Write to public for static/favicon usage
fs.writeFileSync('public/fixie-logo.svg', fullLogoSvg);
fs.writeFileSync('public/fixie-icon.svg', iconSvg);
fs.writeFileSync('public/favicon.svg', iconSvg);

console.log('SVGs created successfully.');
