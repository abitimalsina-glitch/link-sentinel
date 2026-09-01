export type ScanStatus = "SAFE" | "MALICIOUS" | "UNKNOWN" | "ERROR";

export interface ScanResult {
    url: string;
    status: ScanStatus;
    threats?: string[];
}
