const scannedUrls = new Set<string>();

export const startScanner = (onUrlDetected: (url: string) => void) => {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                continue;
            }

            const link = entry.target as HTMLAnchorElement;
            const url = link.href;

            if (scannedUrls.has(url)) {
                continue;
            }

            scannedUrls.add(url);
            onUrlDetected(url);
        }
    });

    const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");

    for (const link of links) {
        observer.observe(link);
    }
};