import { ScanResult, Verdict } from "./types.js";

export function calculateVerdict(result: ScanResult): Verdict {
    // 1. Any malicious indicator overrides everything
    if (result.status === "MALICIOUS") return "MALICIOUS";
    if (result.domainAnalysis && result.domainAnalysis.status === "MALICIOUS") return "MALICIOUS";

    // 2. Suspicious indicators
    if (result.domainAnalysis && result.domainAnalysis.status === "SUSPICIOUS") return "SUSPICIOUS";

    // 3. Check for Scanning/Incomplete states
    if (result.pageAnalysis) {
        if (["submitting", "scanning"].includes(result.pageAnalysis.status)) {
            return "SCANNING";
        }
    }

    // 4. Check for Errors
    if (result.status === "ERROR") return "ERROR";
    if (result.domainAnalysis && result.domainAnalysis.status === "ERROR") return "ERROR";
    if (result.pageAnalysis && ["failed", "timeout", "rate_limited"].includes(result.pageAnalysis.status)) return "ERROR";

    // 5. If everything is nominally "safe" but lacks data, it's UNKNOWN/UNVERIFIED.
    // The system cannot confidently establish safety just because no malware was reported.
    return "UNKNOWN";
}

