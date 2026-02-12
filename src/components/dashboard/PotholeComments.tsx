"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import useSWR from "swr";
import type { PotholeComment, SessionUser } from "@/lib/potholeTypes";

interface PotholeCommentsProps {
  potholeId: string;
  currentUser: SessionUser | null;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to load comments");
  }
  const data = await response.json();
  return (data.comments ?? []) as PotholeComment[];
};

export default function PotholeComments({ potholeId, currentUser }: PotholeCommentsProps) {
  const { data, mutate, error, isLoading } = useSWR<PotholeComment[]>(
    `/api/potholes/${potholeId}/comments`,
    fetcher
  );

  const comments = data ?? [];
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSend = useMemo(
    () => Boolean(currentUser && text.trim() && !sending),
    [currentUser, text, sending]
  );

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/potholes/${potholeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Could not post comment");
      }

      setText("");
      await mutate();
      setMessage("Comment posted.");
    } catch (error) {
      setMessage((error as Error).message ?? "Could not post comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Comments</p>

      <div className="mt-2 space-y-2">
        {isLoading && <p className="text-xs text-slate-500">Loading comments...</p>}
        {error && <p className="text-xs text-rose-600">{error.message}</p>}
        {!isLoading && !error && comments.length === 0 && (
          <p className="text-xs text-slate-500">No comments yet.</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                {comment.author || "Anonymous"}
              </p>
              <p className="text-[11px] text-slate-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-700">{comment.body}</p>
          </div>
        ))}
      </div>

      {currentUser ? (
        <form onSubmit={submitComment} className="mt-3 space-y-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none"
            placeholder="Add a comment..."
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Commenting as {currentUser.displayName || currentUser.username}
            </p>
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? "Posting..." : "Post"}
            </button>
          </div>
          {message && <p className="text-xs text-slate-600">{message}</p>}
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Log in to post a comment.</p>
      )}
    </div>
  );
}
