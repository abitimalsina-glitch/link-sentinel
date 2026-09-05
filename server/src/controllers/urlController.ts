import {Request, Response} from 'express';
import { isValidUrlArray } from '../validation/urlValidation.js';
import { scanUrlsWithApi } from "../services/phishing-api.js";
import { submitForAnalysis, getAnalysisResult } from "../services/urlscan-api.js";
import { ScanResult, PageAnalysis } from '../types.js';

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
        const pageAnalyses = await Promise.all(pageAnalysisPromises);

        // Merge results
        const results: ScanResult[] = baseResults.map((result, index) => {
            return {
                ...result,
                pageAnalysis: pageAnalyses[index] as PageAnalysis
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