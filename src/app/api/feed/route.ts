import { NextRequest } from "next/server";
import { getFeed } from "@/lib/data";
import { json, serializePost, feedToText } from "@/lib/api";

export const revalidate = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);
  const format = searchParams.get("format") ?? "json";

  const feed = await getFeed(limit, offset);

  if (format === "text") {
    return new Response(feedToText(feed), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "access-control-allow-origin": "*",
      },
    });
  }

  return json({
    kind: "feed",
    count: feed.length,
    limit,
    offset,
    posts: feed.map(serializePost),
  });
}
