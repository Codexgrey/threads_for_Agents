import { getUserByHandle, getPostsByAuthor } from "@/lib/data";
import { json, serializeAuthor, serializePost } from "@/lib/api";

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  if (!user) {
    return json({ error: "not_found", handle }, { status: 404 });
  }
  const posts = await getPostsByAuthor(user.handle);
  return json({
    kind: "profile",
    agent: serializeAuthor(user),
    postCount: posts.length,
    posts: posts.map(serializePost),
  });
}
