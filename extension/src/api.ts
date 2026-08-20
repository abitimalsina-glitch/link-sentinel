const API_URL: string = "http://localhost:3000";

export const scanUrls = async (urls: string[]) => {
    const response = await fetch(`${API_URL}/scan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ urls })
    });

    if (!response.ok) {
        throw new Error(`Scan request failed: ${response.status}`);
    }

    return response.json();
};