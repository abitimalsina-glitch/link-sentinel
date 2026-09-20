import {Request, Response} from 'express';
import { isValidUrlArray } from '../validation/urlValidation.js';
import { scanUrlsWithApi } from "../services/google-safe-browsing-api.js";
import { submitForAnalysis, getAnalysisResult } from "../services/urlscan-api.js";
import { ScanResult, PageAnalysis, DomainAnalysis, VirusTotalAnalysis } from '../types.js';
import { analyzeDomain } from '../services/otx-api.js';
import { getVirusTotalReport } from '../services/virustotal-api.js';

export const scanUrls = async (req: Request, res: Response) => {
    const { urls } = req.body;

    if (!isValidUrlArray(urls)) {
        res.status(400).json({
            error: "Invalid URLs"
        });
        return;
    }

    try {
        const baseResults: ScanResult[] = await scanUrlsWithApi(urls);
        
        // Execute URLScan submission for all URLs concurrently
        const pageAnalysisPromises = urls.map(url => submitForAnalysis(url));
        // Execute OTX domain analysis for all URLs concurrently
        const domainAnalysisPromises = urls.map(url => analyzeDomain(url));
        // Execute VirusTotal domain analysis for all URLs concurrently
        const virusTotalPromises = urls.map(url => getVirusTotalReport(url));

        const [pageAnalyses, domainAnalyses, virusTotalAnalyses] = await Promise.all([
            Promise.all(pageAnalysisPromises),
            Promise.all(domainAnalysisPromises),
            Promise.all(virusTotalPromises)
        ]);

        // Merge results
        const results: ScanResult[] = baseResults.map((result, index) => {
            return {
                ...result,
                pageAnalysis: pageAnalyses[index] as PageAnalysis,
                domainAnalysis: domainAnalyses[index] as DomainAnalysis,
                virusTotalAnalysis: virusTotalAnalyses[index] as VirusTotalAnalysis
            };
        });

        res.json({ results });
    } catch (error) {
        console.error("Controller error in scanUrls:", error);
        res.status(500).json({
            error: "Failed to scan URLs"
        });
    }
}

export const getPageAnalysis = async (req: Request, res: Response) => {
    const { uuid } = req.params;

    if (!uuid) {
        res.status(400).json({ error: "Missing UUID" });
        return;
    }

    const uuidStr = uuid as string;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuidStr)) {
        res.status(400).json({ error: "Invalid UUID format" });
        return;
    }

    try {
        const result = await getAnalysisResult(uuidStr);
        res.json(result);
    } catch (error) {
        console.error("Controller error in getPageAnalysis:", error);
        res.status(500).json({ error: "Failed to retrieve page analysis" });
    }
}