import { scanUrl, pollPageAnalysis } from "./api.js";
import { ScanResult, PageAnalysis } from "./types.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
    result: ScanResult;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ScanResult>>();
const activePolls = new Set<string>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_URL" && message.url) {
        const url = message.url;

        // Check cache
        const cached = cache.get(url);
        const now = Date.now();
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            console.log(`[Link-Sentinel] Cache hit for ${url}`);
            updateStorage(cached.result);
            sendResponse({ result: cached.result });
            return true;
        }

        // Check in-flight (deduplication)
        const existingPromise = inFlight.get(url);
        if (existingPromise) {
            console.log(`[Link-Sentinel] Deduplicating request for ${url}`);
            existingPromise.then(result => {
                sendResponse({ result });
            }).catch(() => {
                sendResponse({ result: { url, status: "ERROR" } });
            });
            return true;
        }

        console.log(`[Link-Sentinel] Scanning URL: ${url}`);

        // Perform network request asynchronously
        const scanPromise = scanUrl(url).then((result) => {
            cache.set(url, { result, timestamp: Date.now() });
            
            // Check if we need to poll URLScan
            if (result.pageAnalysis && result.pageAnalysis.uuid && 
                (result.pageAnalysis.status === "scanning" || result.pageAnalysis.status === "submitting")) {
                startPolling(result.url, result.pageAnalysis.uuid);
            }

            updateStorage(result);
            return result;
        }).catch((err) => {
            console.error("[Link-Sentinel] Scan failed", err);
            const errorResult: ScanResult = { url, status: "ERROR" };
            updateStorage(errorResult);
            return errorResult;
        }).finally(() => {
            inFlight.delete(url);
        });

        inFlight.set(url, scanPromise);

        scanPromise.then(result => sendResponse({ result }));

        // Required to keep the message channel open for async sendResponse
        return true;
    }
});

function startPolling(url: string, uuid: string) {
    if (activePolls.has(uuid)) return;
    activePolls.add(uuid);

    let errorCount = 0;
    const maxErrors = 3;
    let pollCount = 0;
    const maxPollAttempts = 40; // 100 seconds max

    const poll = async () => {
        pollCount++;
        
        if (pollCount > maxPollAttempts) {
            console.error(`[Link-Sentinel] Polling timeout for ${uuid}`);
            const cached = cache.get(url);
            if (cached) {
                cached.result.pageAnalysis = { status: 'timeout', uuid } as PageAnalysis;
                cache.set(url, { result: cached.result, timestamp: Date.now() });
                updateStorage(cached.result);
            }
            activePolls.delete(uuid);
            return;
        }

        try {
            const updatedPa = await pollPageAnalysis(uuid);
            
            errorCount = 0; // reset on success
            
            const cached = cache.get(url);
            if (cached) {
                cached.result.pageAnalysis = updatedPa;
                cache.set(url, { result: cached.result, timestamp: Date.now() });
                updateStorage(cached.result);
            }

            if (updatedPa.status === 'submitting' || updatedPa.status === 'scanning') {
                setTimeout(poll, 2500);
            } else {
                activePolls.delete(uuid);
            }
        } catch (err) {
            console.error("[Link-Sentinel] Polling error", err);
            errorCount++;
            if (errorCount >= maxErrors) {
                const cached = cache.get(url);
                if (cached) {
                    cached.result.pageAnalysis = { status: 'failed', uuid } as PageAnalysis;
                    cache.set(url, { result: cached.result, timestamp: Date.now() });
                    updateStorage(cached.result);
                }
                activePolls.delete(uuid);
            } else {
                setTimeout(poll, 2500);
            }
        }
    };

    setTimeout(poll, 2500);
}

function updateStorage(result: ScanResult) {
    chrome.storage.local.set({
        lastScan: {
            url: result.url,
            status: result.status,
            threats: result.threats,
            domainAnalysis: result.domainAnalysis,
            pageAnalysis: result.pageAnalysis,
            virusTotalAnalysis: result.virusTotalAnalysis,
            timestamp: Date.now()
        }
    });
}
