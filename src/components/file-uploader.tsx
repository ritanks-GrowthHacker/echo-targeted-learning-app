"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";

export function FileUploader({ name = "file" }: { name?: string }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E30] bg-[#0D0D14] p-6 text-center text-sm text-[#6B7280] transition hover:border-[#7C6FFF]">
        <UploadCloud className="mb-3 text-[#7C6FFF]" />
        <span className="font-medium text-[#F1F1F5]">{file ? file.name : "Drop a PDF, image, or Word file"}</span>
        <span>{file ? `${Math.ceil(file.size / 1024)} KB selected` : "or click to choose one"}</span>
        <input
          className="sr-only"
          type="file"
          name={name}
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {file && previewUrl && (
        <div className="mt-4 overflow-hidden rounded-lg border border-[#1E1E30] bg-[#0D0D14]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {file.type.startsWith("image/") && <img src={previewUrl} alt={file.name} className="max-h-72 w-full object-contain" />}
          {file.type === "application/pdf" && <iframe src={previewUrl} title={file.name} className="h-72 w-full" />}
          {!file.type.startsWith("image/") && file.type !== "application/pdf" && (
            <div className="p-4 text-sm text-[#B8BBC7]">Preview unavailable for Word files. The file will be parsed after upload.</div>
          )}
        </div>
      )}
    </div>
  );
}
