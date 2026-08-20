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
Link-Sentinel
├── .gitignore                 # Files Git should ignore
├── LICENSE                    # Project license
├── README.md                  # Project documentation
├── extension                  # Browser extension
│   ├── manifest.json          # Extension configuration
│   ├── package-lock.json      # Locked dependency versions
│   ├── package.json           # Extension dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   └── src
│       ├── api.ts             # Communicates with the backend API
│       ├── queue.ts           # Queues and batches URLs for scanning
│       ├── scanner.ts         # Detects visible links on the webpage
│       ├── url.ts             # URL validation and handling
│       └── popup              # Extension popup UI
│           ├── popup.css      # Popup styling
│           ├── popup.html     # Popup structure
│           └── popup.ts       # Popup logic
└── server                    # Backend API
    ├── package-lock.json      # Locked dependency versions
    ├── package.json           # Server dependencies and scripts
    ├── tsconfig.json          # TypeScript configuration
    └── src
        ├── app.ts             # Express application setup
        ├── server.ts          # Starts the server
        ├── controllers
        │   └── urlController.ts # Handles URL scan requests
        ├── routes
        │   └── routes.ts      # Defines API routes
        ├── services
        │   └── phishing-api.ts # Communicates with the phishing detection API
        └── validation
            └── urlValidation.ts # Validates incoming URL data
```