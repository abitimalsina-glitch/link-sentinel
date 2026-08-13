import { Router } from 'express';
import { scanUrls } from '../controllers/urlController';

const router = Router();

router.post("/scan", scanUrls);

export default router;