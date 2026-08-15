"use client";

import React, { useState, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import { MapPin, X, Loader2, ImageUp, Video, Paperclip, FileText } from "lucide-react";
import { HeaderFormat } from "../../types/template.types";

export default function MediaUploader({
  format,
  onUpload,
  currentUrl,
}: {
  format: HeaderFormat;
  onUpload: (url: string) => void;
  currentUrl?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptMap: Record<string, string> = {
    [HeaderFormat.IMAGE]: "image/*",
    [HeaderFormat.VIDEO]: "video/*",
    [HeaderFormat.DOCUMENT]: ".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx",
    [HeaderFormat.LOCATION]: "",
  };
  const resourceTypeMap: Record<string, string> = {
    [HeaderFormat.IMAGE]: "image",
    [HeaderFormat.VIDEO]: "video",
    [HeaderFormat.DOCUMENT]: "raw",
    [HeaderFormat.LOCATION]: "",
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (format === HeaderFormat.IMAGE || format === HeaderFormat.VIDEO) {
      setPreview(URL.createObjectURL(file));
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resource_type", resourceTypeMap[format] || "auto");
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (result.url) {
        onUpload(result.url);
        setPreview(result.url);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch {
      alert("Upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  if (format === HeaderFormat.LOCATION) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
        <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Location header uses live coordinates</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptMap[format]}
        className="hidden"
        onChange={handleFileChange}
      />
      {preview && format === HeaderFormat.IMAGE && (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img
            src={DOMPurify.sanitize(preview)}
            alt="Header Preview"
            className="w-full h-[140px] object-cover"
          />
          <button
            onClick={() => { setPreview(null); onUpload(""); }}
            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {preview && format === HeaderFormat.VIDEO && (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black">
          <video src={DOMPurify.sanitize(preview)} className="w-full h-[140px] object-cover" controls />
          <button
            onClick={() => { setPreview(null); onUpload(""); }}
            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {preview && format === HeaderFormat.DOCUMENT && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#25D366]" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">
              {preview.split("/").pop()?.split("?")[0] || "Document"}
            </p>
            <p className="text-[10px] text-gray-400">Uploaded to Cloudinary</p>
          </div>
          <button onClick={() => { setPreview(null); onUpload(""); }} className="text-gray-400 hover:text-red-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:border-[#25D366] hover:text-[#25D366] hover:bg-[#ECFDF5] transition-all disabled:opacity-50"
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading to Cloudinary...</>
        ) : (
          <>
            {format === HeaderFormat.IMAGE && <ImageUp className="w-4 h-4" />}
            {format === HeaderFormat.VIDEO && <Video className="w-4 h-4" />}
            {format === HeaderFormat.DOCUMENT && <Paperclip className="w-4 h-4" />}
            Upload {format.toLowerCase()} to Cloudinary
          </>
        )}
      </button>
    </div>
  );
}
