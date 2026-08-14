# Link-Sentinel

Link-Sentinel is a browser extension built with TypeScript that detects and analyzes URLs visible on the current webpage. Its goal is to identify potentially suspicious or malicious links and display their security status to the user in a lightweight, privacy-conscious way.

## Features

- Detect links that become visible in the browser viewport (instead of scanning every URL on the page)
- Analyze URLs for suspicious patterns and show an easy-to-read security status
- Avoid duplicate scans by tracking already-checked URLs
- TypeScript across frontend (extension) and backend (API)

## Architecture

Frontend (Browser extension)
- TypeScript
- Scans links that become visible in the browser viewport
- Uses IntersectionObserver to detect visible links (planned/in progress)
- Tracks scanned URLs to avoid duplicate analysis

Backend (API)
- Node.js + Express
- TypeScript
- Provides URL analysis endpoints for the extension to query