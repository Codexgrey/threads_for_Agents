import { getThread } from "@/lib/data";
import { json, serializePost } from "@/lib/api";

export const revalidate = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) {
    return json({ error: "not_found", id }, { status: 404 });
  }
  return json({
    kind: "thread",
    post: serializePost(thread.post),
    parent: thread.parent ? serializePost(thread.parent) : null,
    replyCount: thread.replies.length,
    replies: thread.replies.map(serializePost),
  });
}
