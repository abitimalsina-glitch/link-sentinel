# Link-Sentinel

Link-Sentinel is a browser extension built with TypeScript that detects and analyzes URLs visible on the current webpage. Its goal is to identify potentially suspicious or malicious links and display an easy-to-read security status.

## Features

- Detect links via mouse hover (instead of scanning every URL on the page)
- Analyze URLs for suspicious patterns and show an easy-to-read security status
- Avoid duplicate scans by tracking already-checked URLs
- TypeScript across frontend (extension) and backend (API)

## How it Works

Link-Sentinel operates directly within the browser using a hover-based mechanism:

1. **Hover Detection:** When you mouse over a link, the extension detects the hovered URL using event delegation.
2. **Debounce & Caching:** To prevent spamming requests, it waits 300ms before triggering a scan and checks an in-memory cache to avoid redundant checks.
3. **Analysis:** The hovered URL is sent to the local Node.js backend.
4. **Safe Browsing Lookup:** The backend queries the Google Safe Browsing API.
5. **Real-time Feedback:** A non-intrusive tooltip appears near the cursor displaying the safety status (`SAFE`, `MALICIOUS`, etc.).

## Building the Project

1. **Extension:** Navigate to `extension/` and run `npm install` then `npm run build`. This bundles the content script using Vite and transpiles the popup using `tsc`.
2. **Server:** Navigate to `server/` and run `npm install` then `npm run build`. This transpiles the Express backend to `dist/`.

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
│       ├── scanner.ts         # Tracks mouseover/mouseout events and implements debounce
│       ├── url.ts             # URL validation and handling
│       └── popup              # Extension popup UI
│           ├── popup.css      # Popup styling
│           ├── popup.html     # Popup structure
│           └── popup.ts       # Popup logic
└── server                     # Backend API
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

## Status
Work In Progress