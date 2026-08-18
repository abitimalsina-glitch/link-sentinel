import "dotenv/config";

const API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

if (!API_KEY) {
    throw new Error("API Key not found");
}

export const scanUrlsWithApi = async (urls: string[]) => {
    const params = new URLSearchParams();

    for (const url of urls) {
        params.append("urls", url);
    }

    const response = await fetch(
        `https://safebrowsing.googleapis.com/v5/urls:search?key=${API_KEY}&${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `API key found ${response.status}`
        );
    }

    const data = await response.json();

    return data;
};