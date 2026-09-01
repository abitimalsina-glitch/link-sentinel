import { scanUrl } from "./api.js";
import { ScanResult } from "./types.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
    result: ScanResult;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_URL" && message.url) {
        const url = message.url;

        // Check cache
        const cached = cache.get(url);
        const now = Date.now();
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            console.log(`[Link-Sentinel] Cache hit for ${url}`);
            
            // Still update the "lastScan" so popup sees it if they open it
            updateStorage(cached.result);
            sendResponse({ result: cached.result });
            return true;
        }

        console.log(`[Link-Sentinel] Scanning URL: ${url}`);

        // Perform network request asynchronously
        scanUrl(url).then((result) => {
            // Update cache
            cache.set(url, { result, timestamp: Date.now() });
            
            // Update popup storage
            updateStorage(result);
            
            sendResponse({ result });
        }).catch((err) => {
            console.error("[Link-Sentinel] Scan failed", err);
            const errorResult: ScanResult = { url, status: "ERROR" };
            updateStorage(errorResult);
            sendResponse({ result: errorResult });
        });

        // Required to keep the message channel open for async sendResponse
        return true; 
    }
});

function updateStorage(result: ScanResult) {
    chrome.storage.local.set({
        lastScan: {
            url: result.url,
            status: result.status,
            threats: result.threats,
            timestamp: Date.now()
        }
    });
}
