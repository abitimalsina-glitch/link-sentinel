export type ScanStatus = "SAFE" | "MALICIOUS" | "UNKNOWN" | "ERROR";

export type Verdict = "SAFE" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN" | "ERROR" | "SCANNING";

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

export interface DomainAnalysis {
    status: "SAFE" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN" | "ERROR";
    domain: string;
    pulseCount?: number;
    relatedMalware?: string[];
}

export interface VirusTotalAnalysis {
    status: "found" | "not_found" | "scanning" | "rate_limited" | "unauthorized" | "forbidden" | "error";
    malicious?: number;
    suspicious?: number;
    harmless?: number;
    undetected?: number;
    timeout?: number;
    lastAnalysisDate?: number;
    analysisId?: string;
}

export interface ScanResult {
    url: string;
    status: ScanStatus;
    verdict?: Verdict;
    threats?: string[];
    pageAnalysis?: PageAnalysis;
    domainAnalysis?: DomainAnalysis;
    virusTotalAnalysis?: VirusTotalAnalysis;
}
