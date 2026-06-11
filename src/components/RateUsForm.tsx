"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

const REVIEW_URL = process.env.NEXT_PUBLIC_REVIEW_URL || "";
const HAPPY_THRESHOLD = 4; // 4–5 stars → public-review nudge

export default function RateUsForm() {
  const params = useSearchParams();
  const email = params.get("e") || "";
  const target = params.get("t") || "";
  const type = params.get("ty") || "";

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [permission, setPermission] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const happy = rating >= HAPPY_THRESHOLD;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          name: name.trim(),
          company: company.trim(),
          role: role.trim(),
          quote: happy && permission ? comment.trim() : "",
          permissionToPublish: happy && permission,
          email,
          target,
          type,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setStatus("idle");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#34D399]/40 focus:border-[#34D399]/40 transition";

  const Wordmark = (
    <div className="flex items-center justify-center gap-2 mb-8">
      <span className="text-lg font-semibold tracking-tight text-white">
        Affordable Pentesting
      </span>
    </div>
  );

  // ── Thank-you state ──
  if (status === "done") {
    return (
      <div className="w-full max-w-md text-center">
        {Wordmark}
        <div className="rounded-2xl border border-[#34D399]/30 bg-[#0f1f2e] p-8">
          <div className="text-5xl mb-4">{happy ? "🎉" : "🙏"}</div>
          <h1 className="text-2xl font-light mb-3">
            {happy ? "Thank you!" : "Thank you for the honest feedback"}
          </h1>
          {happy ? (
            <>
              <p className="text-gray-400 text-sm mb-6">
                We&apos;re thrilled you had a great experience. If you have a
                moment, a public review means the world to a small team.
              </p>
              {REVIEW_URL && (
                <a
                  href={REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full rounded-lg bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-medium px-6 py-3 transition-colors"
                >
                  Leave a public review
                </a>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm">
              We take this seriously and will use it to improve. Someone from our
              team may reach out to make things right.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="w-full max-w-md">
      {Wordmark}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-[#0f1f2e] p-8 space-y-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-light mb-1">How did we do?</h1>
          <p className="text-gray-400 text-sm">
            {target
              ? `Your assessment of ${target} is complete.`
              : "Your penetration test is complete."}{" "}
            Your feedback helps us improve.
          </p>
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-1 transition-transform hover:scale-110"
            >
              <FontAwesomeIcon
                icon={faStar}
                className={`text-3xl transition-colors ${
                  (hover || rating) >= n ? "text-[#34D399]" : "text-white/15"
                }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <div className="space-y-5">
            <label className="block space-y-1.5">
              <span className="text-sm text-gray-300">
                {happy
                  ? "What stood out? (optional)"
                  : "What could we have done better?"}
              </span>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  happy
                    ? "We'd love to hear what you enjoyed…"
                    : "Tell us where we fell short — we read every response."
                }
                className={`${inputClass} resize-y`}
              />
            </label>

            {/* Happy path → testimonial + permission */}
            {happy && (
              <div className="space-y-4 rounded-xl border border-[#34D399]/20 bg-[#34D399]/5 p-4">
                <p className="text-sm text-gray-300">
                  Mind if we share your words? Add your details and grant
                  permission below.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company"
                    className={inputClass}
                  />
                </div>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Role / title (optional)"
                  className={inputClass}
                />
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permission}
                    onChange={(e) => setPermission(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#34D399]"
                  />
                  <span className="text-xs text-gray-400">
                    I give Affordable Pentesting permission to publish my
                    feedback as a testimonial (name &amp; company included).
                  </span>
                </label>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-lg bg-[#34D399] hover:bg-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed text-[#041018] font-medium px-6 py-3 transition-colors"
            >
              {status === "submitting" ? "Submitting…" : "Submit feedback"}
            </button>
          </div>
        )}
      </form>
      <p className="text-center text-gray-600 text-xs mt-4">
        Affordable Pentesting · Professional penetration testing
      </p>
    </div>
  );
}
