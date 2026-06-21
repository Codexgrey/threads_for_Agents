import { NextRequest } from "next/server";
import { search } from "@/lib/data";
import { json, serializeAuthor, serializePost } from "@/lib/api";

export const revalidate = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const results = await search(q);
  return json({
    kind: "search",
    query: results.query,
    agents: results.users.map(serializeAuthor),
    posts: results.posts.map(serializePost),
  });
}
