import "dotenv/config";
import protobuf from "protobufjs";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("Google Safe Browsing API key not found");
}

const SAFE_BROWSING_URL =
  "https://safebrowsing.googleapis.com/v5/urls:search";

export const scanUrlsWithApi = async (urls: string[]) => {
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

  const response = await fetch(
    `${SAFE_BROWSING_URL}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/x-protobuf",
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Google Safe Browsing request failed: ${response.status} ${errorBody}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  /*
   * v5 returns a protobuf response.
   *
   * We define the fields we need from the SearchResponse:
   * threats = repeated Threat
   * cache_duration = Duration
   */

  const Threat = new protobuf.Type("Threat")
    .add(new protobuf.Field("threat_type", 1, "string"))
    .add(new protobuf.Field("threat", 2, "string"));

  const SearchResponse = new protobuf.Type("SearchResponse")
    .add(
      new protobuf.Field(
        "threats",
        1,
        "Threat",
        "repeated"
      )
    )
    .add(
      new protobuf.Field(
        "cache_duration",
        2,
        "google.protobuf.Duration"
      )
    );

  const Duration = new protobuf.Type("Duration")
    .add(new protobuf.Field("seconds", 1, "int64"))
    .add(new protobuf.Field("nanos", 2, "int32"));

  const root = new protobuf.Root();

  root.define("google.protobuf").add(Duration);

  root.add(Threat);
  root.add(SearchResponse);

  const decoded = SearchResponse.decode(buffer);

  const result = SearchResponse.toObject(decoded, {
    longs: String,
    defaults: true,
  });

  return result;
};