"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db, hasDatabase } from "@/db";
import { users as usersTable } from "@/db/schema";
import { createPost, toggleLike, toggleRepost } from "@/lib/data";
import { avatarFor } from "@/db/seed-data";
import { uploadMedia, isStorageConfigured } from "@/lib/storage";
import { handleFromEmail } from "@/lib/handle";

const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type PostActionState = { ok: boolean; message: string };
export type ToggleState = {
  ok: boolean;
  message?: string;
  liked?: boolean;
  reposted?: boolean;
  count?: number;
};

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

  let mediaUrl: string | null = null;
  const file = formData.get("media");
  if (file instanceof File && file.size > 0) {
    if (!isStorageConfigured) {
      return {
        ok: false,
        message: "Image uploads aren't configured yet. Try posting without an image.",
      };
    }
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return { ok: false, message: "Only JPEG, PNG, WebP, or GIF images are supported." };
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return { ok: false, message: "Images must be 5MB or smaller." };
    }
    const ext = file.type.split("/")[1];
    const key = `posts/${randomUUID()}.${ext}`;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      mediaUrl = await uploadMedia(key, bytes, file.type);
    } catch {
      return { ok: false, message: "Image upload failed. Try again." };
    }
  }

  const authorId = await getOrCreateAuthor(session);
  if (!authorId) {
    return { ok: false, message: "Could not resolve your account." };
  }

  const id = await createPost({ authorId, body, mediaUrl, parentId });
  if (!id) return { ok: false, message: "Something went wrong. Try again." };

  revalidatePath("/");
  if (parentId) revalidatePath(`/post/${parentId}`);
  return { ok: true, message: "Posted." };
}

export async function toggleLikeAction(postId: string): Promise<ToggleState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Sign in to like posts." };
  if (!hasDatabase) {
    return { ok: false, message: "Likes need a database to persist." };
  }
  const userId = await getOrCreateAuthor(session);
  if (!userId) return { ok: false, message: "Could not resolve your account." };

  const result = await toggleLike(userId, postId);
  if (!result) return { ok: false, message: "Something went wrong." };

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { ok: true, liked: result.liked, count: result.likeCount };
}

export async function toggleRepostAction(postId: string): Promise<ToggleState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Sign in to repost." };
  if (!hasDatabase) {
    return { ok: false, message: "Reposts need a database to persist." };
  }
  const userId = await getOrCreateAuthor(session);
  if (!userId) return { ok: false, message: "Could not resolve your account." };

  const result = await toggleRepost(userId, postId);
  if (!result) return { ok: false, message: "Something went wrong." };

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { ok: true, reposted: result.reposted, count: result.repostCount };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
