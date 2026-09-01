import {Request, Response} from 'express';
import { isValidUrlArray } from '../validation/urlValidation.js';
import { scanUrlsWithApi } from "../services/phishing-api.js";
import { ScanResult } from '../types.js';

export const scanUrls = async (req: Request, res: Response) => {
    const { urls } = req.body;

    if (!isValidUrlArray(urls)) {
        res.status(400).json({
            error: "Invalid URLs"
        });
        return;
    }

    try {
        const results: ScanResult[] = await scanUrlsWithApi(urls);
        res.json({ results });
    } catch (error) {
        console.error("Controller error in scanUrls:", error);
        res.status(500).json({
            error: "Failed to scan URLs"
        });
    }
}