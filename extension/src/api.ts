const API_URL: string = "http://localhost:3000/api";

export const scanUrl = async (url: string) => {
    const response = await fetch(`${API_URL}/scan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ urls: [url] })
    });

    if (!response.ok) {
        throw new Error(`Scan request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
};