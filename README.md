# Link-Sentinel

Link-Sentinel is a browser extension built with TypeScript that detects and analyzes URLs visible on the current webpage. Its goal is to identify potentially suspicious or malicious links using multiple security providers and display an easy-to-read security status without pretending there is a single authoritative verdict.

## Features

- **Hover Detection**: Detect links via mouse hover instead of proactively scanning every URL on the page.
- **Toggle Protection**: An ON/OFF toggle in the popup allows you to completely disable scanning and analysis at any time.
- **Multiple Security Providers**: Queries independent sources concurrently:
  - Google Safe Browsing (URL Reputation)
  - AlienVault OTX (Domain Analysis)
  - URLScan.io (Page Analysis)
  - VirusTotal (Malware Analysis)
- **Live Polling**: For asynchronous scans (like URLScan.io), the extension actively polls the backend and updates the UI live.
- **Optimization**: Uses in-flight request deduplication and a 5-minute local cache to avoid redundant API calls and rate-limiting.
- **TypeScript**: End-to-end TypeScript across the frontend (extension) and backend (API).

## Architecture & Data Flow

Link-Sentinel operates directly within the browser using a hover-based mechanism and delegates API queries to a local Node.js backend.

1. **Hover Detection**: When you mouse over a link, the content script detects the hovered URL using event delegation.
2. **Debounce & Caching**: It waits 300ms before triggering a scan. If the toggle is ON, it sends the URL to the extension's background script, which checks an in-memory cache to prevent redundant network requests.
3. **Backend Analysis**: The background script sends a `POST` request to the local Express backend.
4. **Concurrent Lookups**: The backend concurrently queries Google Safe Browsing, AlienVault OTX, URLScan.io, and VirusTotal.
5. **Real-time Feedback**: A non-intrusive tooltip appears near the cursor displaying the safety status. If a provider is still analyzing (e.g., URLScan), the background script polls the backend until complete, updating the tooltip and popup live.
6. **Popup UI**: Clicking the extension icon displays the detailed security results of the most recently hovered link.


## Setup & Installation

### 1. Backend Server Setup

Navigate to the `server/` directory:

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` directory and add your API keys:

```env
PORT=3000

GOOGLE_SAFE_BROWSING_API_KEY=your_api_key_here
URLSCAN_API_KEY=your_api_key_here
OTX_API_KEY=your_api_key_here
VIRUSTOTAL_API_KEY=your_api_key_here
```

Start the development server:

```bash
npm run dev
```

For a production build, use:

```bash
npm run build
npm start
```

### 2. Running the Backend with Docker

Link-Sentinel also includes a `Dockerfile` at the project root for running the backend in an isolated Node.js container.

The Docker image:

* Installs the backend dependencies
* Copies the backend source code into the container
* Compiles the TypeScript code
* Exposes port `3000`
* Starts the compiled Express server using `npm start`

#### Create the `.env` file

The Docker container still needs the API keys used by the security providers.

Create the file:

```text
server/.env
```

with:

```env
PORT=3000

GOOGLE_SAFE_BROWSING_API_KEY=your_api_key_here
URLSCAN_API_KEY=your_api_key_here
OTX_API_KEY=your_api_key_here
VIRUSTOTAL_API_KEY=your_api_key_here
```

Make sure `.env` is included in `.gitignore` so API keys are never committed to the repository.

#### Build the Docker image

From the **Link-Sentinel project root**, where the `Dockerfile` is located:

```bash
docker build -t link-sentinel-server .
```

The `.` tells Docker to use the current directory as the build context.

#### Run the container

Because the `.env` file is located inside `server/`, pass it to the container when starting it:

```bash
docker run --rm --env-file server/.env -p 3000:3000 link-sentinel-server
```

The `-p 3000:3000` option maps port `3000` on the host machine to port `3000` inside the container.

Once the container is running, the backend is available at:

```text
http://localhost:3000
```

The extension communicates with this local backend through the API endpoints described below.

To stop the container, press:

```text
Ctrl + C
```

#### Rebuilding after backend changes

If the backend source code or Dockerfile changes, rebuild the image:

```bash
docker build -t link-sentinel-server .
```

Then run the updated container again:

```bash
docker run --rm --env-file server/.env -p 3000:3000 link-sentinel-server
```

### 3. Extension Setup

Navigate to the `extension/` directory:

```bash
cd extension
npm install
npm run build
```

This compiles the TypeScript files and bundles the content and background scripts using Vite into the `extension/dist/` folder.

To load the extension in Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `extension/manifest.json` file.

### Running Link-Sentinel with Docker

The complete Docker-based development flow is:

```bash
# From the Link-Sentinel project root

docker build -t link-sentinel-server .

docker run --rm --env-file server/.env -p 3000:3000 link-sentinel-server
```

Then build and load the Firefox extension separately:

```bash
cd extension
npm install
npm run build
```

The resulting architecture is:

```text
Firefox Extension
       |
       | HTTP requests
       v
localhost:3000
       |
       v
Docker Container
       |
       v
Express Backend
       |
       +---- Google Safe Browsing
       +---- AlienVault OTX
       +---- URLScan.io
       +---- VirusTotal
```

The backend API keys remain on the local server and are not included in the browser extension.

## API Endpoints

The local backend exposes the following endpoints:

- **`POST /api/scan`**
  - **Body**: `{ "urls": ["https://example.com"] }`
  - **Description**: Concurrently queries all configured security providers for the given URLs.
  - **Response**: Returns an array of results detailing the status of Safe Browsing, Domain Analysis (OTX), Page Analysis (URLScan), and Malware Analysis (VirusTotal).

- **`GET /api/page-analysis/:uuid`**
  - **Description**: Retrieves the live progress or final result of an asynchronous URLScan operation using its UUID.

## Limitations & Future Improvements

- **Firefox Only**: Currently, the manifest and extension APIs are tailored for Firefox. Chrome/Edge support may require adjustments to `manifest.json`.
- **Local Server**: The extension requires the local Node.js server to be running on `http://localhost:3000` to function, as the backend securely holds the API keys.

## Project Structure

```text
Link-Sentinel/
├── .gitignore                 # Files Git should ignore
├── LICENSE                    # Project license
├── README.md                  # Project documentation
├── extension/                 # Browser extension (Frontend)
│   ├── manifest.json          # Extension configuration (Manifest V3)
│   ├── package-lock.json      # Locked dependency versions
│   ├── package.json           # Extension dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   ├── vite.config.ts         # Vite bundler configuration
│   └── src/
│       ├── api.ts             # Handles HTTP requests to the backend
│       ├── background.ts      # Background script (Caching, deduplication, polling)
│       ├── content.ts         # Content script (Tooltip rendering, state management)
│       ├── scanner.ts         # Tracks mouseover/mouseout events and implements debounce
│       ├── url.ts             # URL validation utilities
│       ├── types.ts           # Shared TypeScript interfaces
│       └── popup/             # Extension popup UI
│           ├── popup.css      # Popup styling
│           ├── popup.html     # Popup structure and toggle
│           └── popup.ts       # Popup logic
└── server/                    # Backend API (Node.js/Express)
    ├── package-lock.json      # Locked dependency versions
    ├── package.json           # Server dependencies and scripts
    ├── tsconfig.json          # TypeScript configuration
    └── src/
        ├── app.ts             # Express application setup
        ├── server.ts          # Server entry point
        ├── types.ts           # Shared TypeScript interfaces
        ├── controllers/
        │   └── urlController.ts # Handles /scan and /page-analysis routes
        ├── routes/
        │   └── routes.ts      # Defines API routes
        ├── services/          # Security provider integrations
        │   ├── google-safe-browsing-api.ts
        │   ├── otx-api.ts
        │   ├── urlscan-api.ts
        │   └── virustotal-api.ts
        └── validation/
            └── urlValidation.ts # Validates incoming URL data
```

## License

This project is licensed under the MIT License.