import "dotenv/config";
import { DomainAnalysis } from "../types.js";

const OTX_API_KEY = process.env.OTX_API_KEY;
const OTX_BASE_URL = "https://otx.alienvault.com/api/v1/indicators/domain";

export const analyzeDomain = async (url: string): Promise<DomainAnalysis> => {
    let domain = "";
    try {
        const parsedUrl = new URL(url);
        domain = parsedUrl.hostname;
    } catch (error) {
        console.error("Invalid URL passed to OTX domain extraction:", url);
        return { status: "ERROR", domain };
    }

    if (!OTX_API_KEY) {
        console.warn("OTX_API_KEY not configured, skipping domain analysis.");
        return { status: "ERROR", domain };
    }

    try {
        // Implement an abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`${OTX_BASE_URL}/${encodeURIComponent(domain)}/general`, {
            method: "GET",
            headers: {
                "X-OTX-API-KEY": OTX_API_KEY
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
            return { status: "UNKNOWN", domain };
        }

        if (response.status === 429) {
            console.warn("OTX API rate limited.");
            return { status: "ERROR", domain };
        }

        if (!response.ok) {
            console.error(`OTX API error: ${response.status} ${response.statusText}`);
            return { status: "ERROR", domain };
        }

        const data = await response.json();
        const pulseInfo = data?.pulse_info;

        if (!pulseInfo) {
            return { status: "UNKNOWN", domain };
        }

        const pulseCount = pulseInfo.count || 0;
        
        if (pulseCount === 0) {
            return { status: "UNKNOWN", domain, pulseCount: 0 };
        }

        // Extract some related malware families if available
        let relatedMalware: string[] = [];
        if (pulseInfo.related && pulseInfo.related.other && pulseInfo.related.other.malware_families) {
            relatedMalware = pulseInfo.related.other.malware_families;
        } else if (pulseInfo.related && pulseInfo.related.alienvault && pulseInfo.related.alienvault.malware_families) {
            relatedMalware = pulseInfo.related.alienvault.malware_families;
        }

        return {
            status: "SUSPICIOUS",
            domain,
            pulseCount,
            relatedMalware: relatedMalware.slice(0, 10) // Keep it bounded
        };

    } catch (error: any) {
        console.error("Error during OTX API call:", error);
        return { status: "ERROR", domain };
    }
};
