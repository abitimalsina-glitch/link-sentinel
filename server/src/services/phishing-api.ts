import "dotenv/config";
import protobuf from "protobufjs";
import { ScanResult, ScanStatus } from "../types.js";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("Google Safe Browsing API key not found");
}

const SAFE_BROWSING_URL =
  "https://safebrowsing.googleapis.com/v5/urls:search";

export const scanUrlsWithApi = async (urls: string[]): Promise<ScanResult[]> => {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error("At least one URL is required");
  }

  if (urls.length > 50) {
    throw new Error("Maximum 50 URLs can be scanned at once");
  }

  const params = new URLSearchParams();
  params.set("key", API_KEY);
  for (const url of urls) {
    params.append("urls", url);
  }

  let response: Response;
  try {
    response = await fetch(
      `${SAFE_BROWSING_URL}?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/x-protobuf",
        },
      }
    );
  } catch (error) {
    console.error("Network error calling Safe Browsing API:", error);
    return urls.map(url => ({ url, status: "ERROR" }));
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Google Safe Browsing request failed: ${response.status} ${errorBody}`);
    return urls.map(url => ({ url, status: "ERROR" }));
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("Failed to read response buffer:", error);
    return urls.map(url => ({ url, status: "ERROR" }));
  }

  let decoded: any;
  try {
    const Threat = new protobuf.Type("Threat")
      .add(new protobuf.Field("threat_type", 1, "string"))
      .add(new protobuf.Field("threat", 2, "string"));

    const SearchResponse = new protobuf.Type("SearchResponse")
      .add(new protobuf.Field("threats", 1, "Threat", "repeated"))
      .add(new protobuf.Field("cache_duration", 2, "google.protobuf.Duration"));

    const Duration = new protobuf.Type("Duration")
      .add(new protobuf.Field("seconds", 1, "int64"))
      .add(new protobuf.Field("nanos", 2, "int32"));

    const root = new protobuf.Root();
    root.define("google.protobuf").add(Duration);
    root.add(Threat);
    root.add(SearchResponse);

    const message = SearchResponse.decode(buffer);
    decoded = SearchResponse.toObject(message, {
      longs: String,
      defaults: true,
    });
  } catch (error) {
    console.error("Failed to decode protobuf response:", error);
    return urls.map(url => ({ url, status: "ERROR" }));
  }

  return urls.map(url => {
    // In v5 urls:search, threats is a list. If it's empty, URL is safe.
    // If there's a match, it usually matches one of the requested URLs.
    // Since we pass multiple, we should match `threat.threat` to the URL.
    // However, if the API doesn't return the exact URL, a conservative approach for single-url requests
    // is to mark malicious if ANY threats are returned.
    const threatsForUrl = decoded.threats?.filter((t: any) => t.threat === url) || [];
    
    // Fallback: if we just requested 1 URL and there are threats, assume they apply to this URL
    // even if `t.threat` isn't an exact string match (e.g., canonicalized).
    const appliedThreats = (urls.length === 1 && decoded.threats?.length > 0) 
      ? decoded.threats 
      : threatsForUrl;

    if (appliedThreats.length > 0) {
      return {
        url,
        status: "MALICIOUS",
        threats: appliedThreats.map((t: any) => t.threat_type || "UNKNOWN_THREAT")
      };
    }
    
    return {
      url,
      status: "SAFE"
    };
  });
};