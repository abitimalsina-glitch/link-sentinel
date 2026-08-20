import { createUrlQueue } from "./queue.js";
import { isHttpUrl } from "./url.js";

const scannedUrls = new Set<string>();

export const startScanner = (onBatchReady: (urls: string[]) => void) => {
    const queue = createUrlQueue(onBatchReady);

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                continue;
            }

            const link = entry.target as HTMLAnchorElement;
            const url = link.href;
            
            if (!isHttpUrl(url)) {
                continue;
            }

            if (scannedUrls.has(url)) {
                continue;
            }

            scannedUrls.add(url);

            queue.add(url);
        }
    });

    const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");

    for (const link of links) {
        observer.observe(link);
    }
};