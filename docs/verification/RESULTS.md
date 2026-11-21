# Demo verification

- Upstream fetched: origin/main d87c0fb. Prior local premium-ui work retained while merging updated camera, detector and in-car code.
- Full production monorepo build passed; final camera/showcase frontend build passed.
- TypeScript checks passed. All 16 Vitest tests passed.
- Live API integration passed: health, hazards, cases, invalid observation rejection, watcher snapshot, phone/car pairing and delivery acknowledgement.
- Four-vehicle replay observed alerts on following car and none on opposite/service road.
- Rendered desktop overview inspected at 1440px; road showcase loaded without console errors. Drive journey exercised in browser: following car warned, opposite/service road not warned.
- Screenshot file export was denied by the Chrome tool's configured workspace roots. Inline screenshot inspection was available.
- Mobile rendered review, complete loading/error/partial-state coverage, physical camera capture accuracy and cross-device WebRTC are unverified. No complete ECC design-evidence pass is claimed.
- Backend is local memory/template mode without configured cloud credentials. Civic notice submission is a simulation.

## Phone pairing repair

- Root failure reported by user: Android cannot reach the laptop LAN URL. Laptop firewall disabled; LAN HTTP/HTTPS listeners active. Device isolation or a network mismatch remains a physical-network limitation.
- Added a Wi-Fi-only HTTPS gateway (`npm run dev:phone`) with a seven-day local CA and Android setup page; no public tunnel was started. Verified certificate chain, REST health and WebSocket upgrades through the LAN HTTPS endpoint.
- Pairing QR now uses configured LAN origin and is generated locally. Added explicit Local Wi-Fi / Hosted phone page choices; local remains the default.
- Added local relay camera-frame fallback, and verified frame payload delivery plus isolation between pairing rooms.
- Independently verified existing GitHub Pages phone camera → local in-car WebRTC: synthetic 320×180 test video received as an active MediaStream, readyState 4; receiver logged incoming media and data connections. No hardware camera was accessed for this check. Physical Android capture still needs the user to scan and grant camera permission.
