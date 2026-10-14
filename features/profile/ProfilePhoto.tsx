"use client";

import { Camera, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

import { removeAvatar, restoreGooglePhoto, uploadAvatar, type PhotoResult } from "./api";
import { AVATAR_ACCEPT } from "./avatarImage";
import { announceProfile } from "./useProfile";

interface ProfilePhotoProps {
  userId: string;
  name: string;
  email: string;
  initialUrl: string | null;
  /** The account's Google photo, when it signs in with Google. */
  googlePhoto: string | null;
}

/** Upload, change or remove your profile photo, or go back to your Google photo. */
export function ProfilePhoto({ userId, name, email, initialUrl, googlePhoto }: ProfilePhotoProps) {
  const toast = useToast();
  const inputId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(task: () => Promise<PhotoResult>, success: string) {
    setBusy(true);
    setError("");
    const result = await task();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl(result.url);
    announceProfile({ avatar_url: result.url });
    toast(success);
  }

  const usingGoogle = Boolean(url && googlePhoto && url === googlePhoto);
  const status = usingGoogle
    ? "Using your Google photo."
    : url
      ? "Teammates and people you invite see this photo."
      : "No photo yet, so your initials show.";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar id={userId} name={name} email={email} src={url} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            id={inputId}
            type="file"
            accept={AVATAR_ACCEPT.join(",")}
            className="peer sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void run(() => uploadAvatar(userId, file), "Photo updated");
            }}
          />
          <label
            htmlFor={inputId}
            className={cn(
              buttonClasses("outline", "md"),
              "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
              busy && "pointer-events-none opacity-50",
            )}
          >
            <Camera aria-hidden />
            {url && !usingGoogle ? "Change photo" : "Upload photo"}
          </label>
          {googlePhoto && !usingGoogle && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                run(() => restoreGooglePhoto(userId, googlePhoto), "Using your Google photo")
              }
            >
              Use Google photo
            </Button>
          )}
          {url && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => removeAvatar(userId), "Photo removed")}
            >
              <Trash2 aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p className="text-sm text-fg-muted">
          {busy ? "Saving…" : status} JPG, PNG or WebP, cropped to a square.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
