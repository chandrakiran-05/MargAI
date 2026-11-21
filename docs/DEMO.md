# Presentation runbook

Servers: `npm run build:packages`, then `npm run dev`.

1. Open http://localhost:5173 for the redesigned overview.
2. Use **Live camera** for the latest upstream phone capture and **Road showcase** for the camera/3D in-car view. Choose **Drive demo**, then **Start drive**. The four vehicles run at 3× speed. The following driver receives a warning; the opposite carriageway and service road remain quiet. The warning clears after passing.
3. Open **Road reports** to review the report and record a demo notice. This is a local simulation; it does not contact a municipal authority.
4. **Start driving** opens the phone camera app. Camera/GPS need localhost or HTTPS. Allow permissions; pair the car screen using its displayed code.

`npm run verify` checks tests and production builds. `npm run test:integration` checks the running REST and WebSocket API.

The local backend uses memory storage and a template report when Gemini credentials are absent. Do not present these as connected cloud services. The latest upstream code is origin/main at d87c0fb; its independent WebRTC prototype remains in source.
