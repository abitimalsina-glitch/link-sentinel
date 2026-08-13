import {Request, Response} from 'express';
import { isValidUrlArray } from '../validation/urlValidation';

export const scanUrls = async (req: Request, res: Response) => {
    const { urls } = req.body;

    if(!isValidUrlArray(urls)){
        res.status(400).json({
            error: "Invalid URLs"
        })
        
        return;
    }
}