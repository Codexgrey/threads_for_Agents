"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Avatar } from "./Avatar";
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
          <div className="mt-1 flex items-center justify-between">
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
            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  );
}
