import "dotenv/config";
import { VirusTotalAnalysis } from "../types.js";

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const VT_BASE_URL = "https://www.virustotal.com/api/v3";

// Rate Limiting
const requestTimestamps: number[] = [];
const QUOTA_LIMIT = process.env.VT_QUOTA_LIMIT ? parseInt(process.env.VT_QUOTA_LIMIT, 10) : 4;
const QUOTA_WINDOW_MS = 60 * 1000;

// Caching
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { result: VirusTotalAnalysis, timestamp: number }>();

// Periodic cache cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp >= CACHE_TTL_MS) {
            cache.delete(key);
        }
    }
}, 60 * 1000).unref();

// Deduplication
const inFlight = new Map<string, Promise<VirusTotalAnalysis>>();

const checkRateLimit = (): boolean => {
    const now = Date.now();
    // Clear timestamps older than 1 minute
    while (requestTimestamps.length > 0 && now - requestTimestamps[0] > QUOTA_WINDOW_MS) {
        requestTimestamps.shift();
    }
    return requestTimestamps.length < QUOTA_LIMIT;
};

const recordRequest = () => {
    requestTimestamps.push(Date.now());
};

const _getVirusTotalReport = async (url: string): Promise<VirusTotalAnalysis> => {
    if (!VIRUSTOTAL_API_KEY) {
        console.warn("VIRUSTOTAL_API_KEY not configured, skipping VT analysis.");
        return { status: "error" };
    }

    const id = Buffer.from(url).toString('base64url');

    // Caching logic
    const cached = cache.get(id);
    if (cached) {
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.result;
        } else {
            cache.delete(id);
        }
    }

    // Rate Limiting Check
    if (!checkRateLimit()) {
        console.warn("VirusTotal API backend rate limited.");
        return { status: "rate_limited" };
    }

    recordRequest();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`${VT_BASE_URL}/urls/${id}`, {
            method: "GET",
            headers: {
                "x-apikey": VIRUSTOTAL_API_KEY
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
            const notFoundRes: VirusTotalAnalysis = { status: "not_found" };
            cache.set(id, { result: notFoundRes, timestamp: Date.now() });
            return notFoundRes;
        }
        
        if (response.status === 401) return { status: "unauthorized" };
        if (response.status === 403) return { status: "forbidden" };
        if (response.status === 429) {
            console.warn("VirusTotal API rate limited.");
            return { status: "rate_limited" };
        }

        if (!response.ok) {
            console.error(`VirusTotal API error: ${response.status} ${response.statusText}`);
            return { status: "error" };
        }

        const data = await response.json();
        const attrs = data?.data?.attributes;

        if (!attrs) {
            return { status: "error" };
        }

        const stats = attrs.last_analysis_stats || {};

        const res: VirusTotalAnalysis = {
            status: "found",
            malicious: stats.malicious || 0,
            suspicious: stats.suspicious || 0,
            harmless: stats.harmless || 0,
            undetected: stats.undetected || 0,
            timeout: stats.timeout || 0,
            lastAnalysisDate: attrs.last_analysis_date
        };

        cache.set(id, { result: res, timestamp: Date.now() });
        return res;

    } catch (error: any) {
        console.error("Error during VirusTotal API call:", error);
        return { status: "error" };
    }
};

export const getVirusTotalReport = async (url: string): Promise<VirusTotalAnalysis> => {
    // In-flight Deduplication
    const id = Buffer.from(url).toString('base64url');
    if (inFlight.has(id)) {
        return inFlight.get(id)!;
    }

    const promise = _getVirusTotalReport(url).finally(() => {
        inFlight.delete(id);
    });

    inFlight.set(id, promise);
    return promise;
};
