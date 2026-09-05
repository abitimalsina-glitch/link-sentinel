import "dotenv/config";
import { PageAnalysis } from "../types.js";

const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;

const URLSCAN_SUBMIT_URL = "https://urlscan.io/api/v1/scan/";
const URLSCAN_RESULT_URL = "https://urlscan.io/api/v1/result/";

export const submitForAnalysis = async (url: string): Promise<{ status: PageAnalysis["status"], uuid?: string }> => {
    if (!URLSCAN_API_KEY) {
        console.warn("URLSCAN_API_KEY not configured, skipping page analysis.");
        return { status: "failed" };
    }

    try {
        const submitResponse = await fetch(URLSCAN_SUBMIT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "API-Key": URLSCAN_API_KEY
            },
            body: JSON.stringify({
                url: url,
                visibility: "unlisted"
            })
        });

        if (submitResponse.status === 429) {
            console.warn("URLScan API rate limited during submission.");
            return { status: "rate_limited" };
        }

        if (!submitResponse.ok) {
            const errBody = await submitResponse.text();
            console.error(`URLScan submission failed: ${submitResponse.status} ${errBody}`);
            return { status: "failed" };
        }

        const submitData = await submitResponse.json();
        const uuid = submitData.uuid;

        if (!uuid) {
            console.error("URLScan submission successful but no UUID returned.");
            return { status: "failed" };
        }

        return { status: "scanning", uuid };
    } catch (error) {
        console.error("Error during URLScan submission:", error);
        return { status: "failed" };
    }
};

export const getAnalysisResult = async (uuid: string): Promise<PageAnalysis> => {
    if (!URLSCAN_API_KEY) {
        return { status: "failed" };
    }

    // Basic UUID format validation (8-4-4-4-12)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
        return { status: "failed" };
    }

    try {
        const resultResponse = await fetch(`${URLSCAN_RESULT_URL}${uuid}/`, {
            method: "GET",
            headers: {
                "API-Key": URLSCAN_API_KEY
            }
        });

        if (resultResponse.status === 404) {
            // Not ready yet
            return { status: "scanning", uuid };
        }

        if (resultResponse.status === 429) {
            return { status: "rate_limited", uuid };
        }

        if (!resultResponse.ok) {
            console.error(`URLScan result failed: ${resultResponse.status}`);
            return { status: "failed", uuid };
        }

        const resultData = await resultResponse.json();
        return extractPageAnalysis(resultData, uuid);
    } catch (error) {
        console.error("Error retrieving URLScan result:", error);
        return { status: "failed", uuid };
    }
};

function extractPageAnalysis(data: any, uuid: string): PageAnalysis {
    const pageInfo = {
        pageUrl: data.page?.url || "",
        finalUrl: data.page?.url || "",
        pageTitle: data.page?.title || "",
        httpStatus: data.page?.status || 0,
        mimeType: data.page?.mimeType || "",
        hasScreenshot: !!data.task?.screenshotURL
    };

    const redirectChain = data.lists?.redirects || [];
    const redirects = {
        originalUrl: data.task?.url || "",
        finalUrl: data.page?.url || "",
        redirectChain: redirectChain,
        redirectCount: redirectChain.length
    };

    const network = {
        contactedDomains: data.lists?.domains || [],
        contactedIps: data.lists?.ips || [],
        suspiciousDomains: [] 
    };

    const serverInfo = data.page?.server || "";
    const asn = data.page?.asn || "";
    const country = data.page?.country || "";
    const tlsIssuer = data.page?.tlsIssuer || "";
    const technologies: string[] = []; 

    const infrastructure = {
        technologies,
        asn,
        country,
        server: serverInfo,
        tlsIssuer
    };

    return {
        status: "complete",
        uuid,
        pageInfo,
        redirects,
        network,
        infrastructure
    };
}
