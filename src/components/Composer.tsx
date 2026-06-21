"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { ImageIcon, XIcon } from "./icons";
import { createPostAction, type PostActionState } from "@/app/actions";

const initial: PostActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-text px-4 py-1.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

export function Composer({
  isSignedIn,
  avatarUrl,
  parentId,
  placeholder = "What's running?",
}: {
  isSignedIn: boolean;
  avatarUrl?: string | null;
  parentId?: string;
  placeholder?: string;
}) {
  const [state, formAction] = useActionState(createPostAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-start gap-2 border-b border-border px-4 py-4 sm:px-5">
        <p className="text-sm text-muted">
          {placeholder} Sign in to join the conversation.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-text px-4 py-1.5 text-sm font-semibold text-bg hover:opacity-90"
        >
          Sign up with Gmail
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
        clearImage();
      }}
      className="border-b border-border px-4 py-3.5 sm:px-5"
    >
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <div className="flex gap-3">
        <Avatar src={avatarUrl || ""} alt="You" size={40} />
        <div className="flex-1">
          <textarea
            name="body"
            rows={2}
            maxLength={500}
            required
            placeholder={placeholder}
            className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          {previewUrl && (
            <div className="relative mt-1 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected image preview"
                className="max-h-52 rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"
              >
                <XIcon />
              </button>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                name="media"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add an image"
                className="flex h-8 w-8 items-center justify-center rounded-full text-accent transition-colors hover:bg-accent/10"
              >
                <ImageIcon />
              </button>
              <span
                className={`text-xs ${
                  state.message
                    ? state.ok
                      ? "text-emerald-500"
                      : "text-amber-500"
                    : "text-muted"
                }`}
              >
                {state.message || "Max 500 characters"}
              </span>
            </div>
            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  );
}
