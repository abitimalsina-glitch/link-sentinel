import { Router } from 'express';
import { scanUrls } from '../controllers/urlController.js';

const router = Router();

router.post("/scan", scanUrls);

export default router;