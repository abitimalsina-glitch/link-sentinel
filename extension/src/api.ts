import { ScanResult, PageAnalysis } from "./types.js";

// @ts-ignore - Vite provides import.meta.env at build time
const API_URL: string = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
    ? import.meta.env.VITE_API_URL 
    : "http://localhost:3000/api";

export const scanUrl = async (url: string): Promise<ScanResult> => {
    try {
        const response = await fetch(`${API_URL}/scan`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ urls: [url] })
        });

        if (!response.ok) {
            console.error(`Scan request failed: ${response.status}`);
            return { url, status: "ERROR" };
        }

        const data = await response.json();
        // data.results is an array of ScanResult
        const result = data.results && data.results[0];
        
        if (result) {
            return result as ScanResult;
        }

        return { url, status: "ERROR" };
    } catch (error) {
        console.error("Network error during scanUrl:", error);
        return { url, status: "ERROR" };
    }
};

export const pollPageAnalysis = async (uuid: string): Promise<PageAnalysis> => {
    try {
        const response = await fetch(`${API_URL}/page-analysis/${uuid}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error(`Page analysis request failed: ${response.status}`);
            return { status: "failed", uuid };
        }

        const data = await response.json();
        return data as PageAnalysis;
    } catch (error) {
        console.error("Network error during pollPageAnalysis:", error);
        return { status: "failed", uuid };
    }
};