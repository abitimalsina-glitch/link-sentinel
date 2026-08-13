export const isValidUrlArray = (urls: unknown): urls is string[] => {

    if (!Array.isArray(urls)) {
        return false;
    }

    return urls.every((url) => {
        if (typeof url !== "string") {
            return false;
        }

        try {
            new URL(url);

            return true;
        }
        catch (error) {
            return false;
        }
    });
}