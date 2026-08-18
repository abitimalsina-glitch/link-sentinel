export const isValidUrlArray = (urls: unknown): urls is string[] => {

    if (!Array.isArray(urls)) {
        return false;
    }

    return urls.every((url) => {
        if (typeof url !== "string") {
            return false;
        }

        try {
            const parsedUrl = new URL(url);

            if (
                parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                    return false;
                }
                
            return true;
        }
        catch {
            return false;
        }
    });
};