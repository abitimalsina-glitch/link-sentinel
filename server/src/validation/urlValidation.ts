export const isPrivateOrLocalHost = (hostname: string): boolean => {
    // Localhost
    if (hostname === "localhost") return true;

    // IPv4 private blocks
    const parts = hostname.split(".");
    if (parts.length === 4) {
        const num = parseInt(parts[0], 10);
        const num2 = parseInt(parts[1], 10);
        
        if (num === 10) return true;
        if (num === 127) return true; // Loopback
        if (num === 172 && num2 >= 16 && num2 <= 31) return true;
        if (num === 192 && num2 === 168) return true;
        if (num === 169 && num2 === 254) return true; // Link-local
    }

    // Basic IPv6 loopback and private
    if (hostname === "::1" || hostname.startsWith("fc00:") || hostname.startsWith("fd") || hostname.startsWith("fe80:")) {
        return true;
    }

    return false;
};

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

            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                return false;
            }
                
            if (isPrivateOrLocalHost(parsedUrl.hostname)) {
                return false;
            }

            return true;
        }
        catch {
            return false;
        }
    });
};