# Link-Sentinel

Link-Sentinel is a browser extension built with TypeScript that detects and analyzes URLs visible on the current webpage. Its goal is to identify potentially suspicious or malicious links and display an easy-to-read security status.

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

## Repository folder tree

```
.
├── .gitignore
├── LICENSE
├── README.md
├── extension
│   ├── manifest.json
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.json
│   └── src
│       ├── api.ts
│       ├── scanner.ts
│       ├── url.ts
│       └── popup
│           ├── popup.css
│           ├── popup.html
│           └── popup.ts
└── server
    ├── package-lock.json
    ├── package.json
    ├── tsconfig.json
    └── src
        ├── app.ts
        ├── server.ts
        ├── controllers
        │   └── urlController.ts
        ├── routes
        ├── services
        └── validation
```
