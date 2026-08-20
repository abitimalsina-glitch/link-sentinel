const MAX_BATCH_SIZE = 50;
const BATCH_DELAY = 500;

export const createUrlQueue = (onBatchReady: (urls: string[]) => void) => {
    const pendingUrls: string[] = [];
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
        if (pendingUrls.length === 0) {
            return;
        }

        const batch = pendingUrls.splice(0, MAX_BATCH_SIZE);

        onBatchReady(batch);
    };

    const add = (url: string) => {
        pendingUrls.push(url);

        if (pendingUrls.length >= MAX_BATCH_SIZE) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }

            flush();
            return;
        }

        if (!timeout) {
            timeout = setTimeout(() => {
                timeout = null;
                flush();
            }, BATCH_DELAY);
        }
    };

    return {
        add
    };
};