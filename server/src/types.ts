export type ScanStatus = "SAFE" | "MALICIOUS" | "UNKNOWN" | "ERROR";

export interface PageAnalysis {
    status: "not_analyzed" | "submitting" | "scanning" | "complete" | "failed" | "timeout" | "rate_limited";
    uuid?: string;
    pageInfo?: {
        pageUrl: string;
        finalUrl: string;
        pageTitle: string;
        httpStatus: number;
        mimeType: string;
        hasScreenshot: boolean;
    };
    redirects?: {
        originalUrl: string;
        finalUrl: string;
        redirectChain: string[];
        redirectCount: number;
    };
    network?: {
        contactedDomains: string[];
        contactedIps: string[];
        suspiciousDomains: string[];
    };
    infrastructure?: {
        technologies: string[];
        asn: string;
        country: string;
        server: string;
        tlsIssuer: string;
    };
}

export interface ScanResult {
    url: string;
    status: ScanStatus;
    threats?: string[];
    pageAnalysis?: PageAnalysis;
}
