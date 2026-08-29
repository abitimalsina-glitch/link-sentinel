import {Request, Response} from 'express';
import { isValidUrlArray } from '../validation/urlValidation.js';
import { scanUrlsWithApi } from "../services/phishing-api.js";

export const scanUrls = async (req: Request, res: Response) => {
    const { urls } = req.body;

    if(!isValidUrlArray(urls)){
        res.status(400).json({
            error: "Invalid URLs"
        })
        
        return;
    }
    const results = await scanUrlsWithApi(urls);

    res.json({
        results
    });
}