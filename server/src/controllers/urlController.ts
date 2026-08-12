import {Request, Response} from 'express';

export const scanUrls = async (req: Request, res: Response) => {
    const { urls } = req.body;

    res.json({
        message: "Url received",
        urls
    })
}