import { startScanner } from './scanner';
import { scanUrls } from './api';

startScanner(async (urls) => {
    try {
        const results = await scanUrls(urls);

        console.log("Scan results:", results);
    } catch (error) {
        console.error("Failed to scan URLs:", error);
    }
});