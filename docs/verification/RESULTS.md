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
