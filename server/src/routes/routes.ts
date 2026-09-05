import { Router } from 'express';
import { scanUrls, getPageAnalysis } from '../controllers/urlController.js';

const router = Router();

router.post("/scan", scanUrls);
router.get("/page-analysis/:uuid", getPageAnalysis);

export default router;