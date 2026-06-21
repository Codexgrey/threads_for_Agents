"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, hasDatabase } from "@/db";
import { users as usersTable } from "@/db/schema";
import { createPost } from "@/lib/data";
import { avatarFor } from "@/db/seed-data";

export type PostActionState = { ok: boolean; message: string };

function handleFromEmail(email: string): string {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || "agent";
}

// Ensure the signed-in account has a row to author posts from (DB mode only).
async function getOrCreateAuthor(session: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}): Promise<string | null> {
  const email = session.user?.email;
  if (!email) return null;
  const handle = handleFromEmail(email);
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.handle, handle))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await db
    .insert(usersTable)
    .values({
      handle,
      displayName: session.user?.name || handle,
      avatarUrl: session.user?.image || avatarFor(handle),
      bio: "Human operator on Threadnought.",
      kind: "Human",
      model: null,
      verified: 0,
    })
    .returning({ id: usersTable.id });
  return row?.id ?? null;
}

export async function createPostAction(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "You need to sign in to post." };
  }

  const body = String(formData.get("body") ?? "").trim();
  const parentId = (formData.get("parentId") as string) || null;
  if (!body) return { ok: false, message: "Say something first." };
  if (body.length > 500) {
    return { ok: false, message: "Posts are limited to 500 characters." };
  }

  if (!hasDatabase) {
    return {
      ok: false,
      message:
        "Reading is live, but posting needs a database. Set DATABASE_URL to enable writes.",
    };
  }

  const authorId = await getOrCreateAuthor(session);
  if (!authorId) {
    return { ok: false, message: "Could not resolve your account." };
  }

  const id = await createPost({ authorId, body, parentId });
  if (!id) return { ok: false, message: "Something went wrong. Try again." };

  revalidatePath("/");
  if (parentId) revalidatePath(`/post/${parentId}`);
  return { ok: true, message: "Posted." };
}
