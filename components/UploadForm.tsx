"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { uploadPlate, type FormState } from "@/app/actions";

const MAX_SIDE = 1600;

/** Shrinks a phone photo in the browser so uploads stay small and fast. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85),
  );
}

export function UploadForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(uploadPlate, undefined);
  const [localError, setLocalError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(undefined);
    const file = input.current?.files?.[0];
    if (!file) return setLocalError("Please choose a photo.");
    let photo: Blob = file;
    try {
      photo = await shrink(file);
    } catch {
      if (file.size > 4 * 1024 * 1024) {
        return setLocalError("This browser can't open that photo format. Try a JPEG or PNG.");
      }
    }
    const data = new FormData();
    data.append("photo", photo, "plate.jpg");
    startTransition(() => formAction(data));
    if (input.current) input.current.value = "";
  }

  const error = localError ?? state?.error;
  return (
    <form onSubmit={onSubmit} className="stack">
      <label>
        Photo of a vanity plate
        <input ref={input} type="file" name="photo" accept="image/*" required />
      </label>
      <button className="primary" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </button>
      {error && <p className="error">{error}</p>}
      {!error && state?.message && <p className="ok">{state.message}</p>}
    </form>
  );
}
