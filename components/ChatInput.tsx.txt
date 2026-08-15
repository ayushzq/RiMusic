"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Send, Loader2, Plus, Image as ImageIcon, Video, FileText,
  MapPin, X, Camera, Mic, IndianRupee, MessageSquare,
  Link2, LayoutTemplate, Download, Eye, Pause, Play, Smile, Check
} from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import TemplatePicker from "./TemplatePicker";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MediaPreview {
  file: File;
  type: "image" | "video" | "document";
  url: string;
  name: string;
  size: string;
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  disabled?: boolean;
  replyingTo?: { text: string; sender: string } | null;
  onCancelReply?: () => void;
  activeContactName?: string;

  phoneId?: string | null;
  accessToken?: string | null;
  recipientPhone?: string;

  onSendMedia?: (file: File, type: "image" | "video" | "document" | "audio") => Promise<void>;
  onSendLocation?: (lat: number, lng: number) => void;
  onSendInteractive?: (type: "quick_reply" | "url") => void;
  onSendTemplate?: (template: any) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Works out the real media kind of a picked file instead of trusting a fixed label
function detectKind(file: File): "image" | "video" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

async function convertAudioToOgg(blob: Blob): Promise<File> {
  if (
    blob.type === "audio/ogg" ||
    blob.type === "audio/opus" ||
    blob.type === "audio/aac" ||
    blob.type === "audio/mp4" ||
    blob.type === "audio/mpeg"
  ) {
    return new File([blob], `voice_${Date.now()}.ogg`, { type: blob.type });
  }

  const buffer = await blob.arrayBuffer();
  const oggBlob = new Blob([buffer], { type: "audio/ogg" });
  return new File([oggBlob], `voice_${Date.now()}.ogg`, { type: "audio/ogg" });
}

// ─── Instagram-style Stacked Multi-Media Preview ────────────────────────────

interface MultiMediaPreview {
  files: { file: File; url: string; name: string; size: string; type: "image" | "video" | "document" }[];
}

interface MultiMediaBubbleProps {
  previews: MultiMediaPreview;
  isSending: boolean;
  onCancel: () => void;
  onSend: () => void;
  onAddMore: () => void;
}

function MultiMediaBubble({ previews, isSending, onCancel, onSend, onAddMore }: MultiMediaBubbleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sendAnim, setSendAnim] = useState(false);
  const [sent, setSent] = useState(false);

  const items = previews.files;
  const active = items[activeIndex];

  const handleSendClick = () => {
    setSendAnim(true);
    setTimeout(() => {
      setSent(true);
      onSend();
    }, 350);
  };

  return (
    <>
      {lightboxOpen && active?.type === "image" && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10" onClick={() => setLightboxOpen(false)}>
            <X className="w-5 h-5" />
          </button>
          <img src={active.url} alt={active.name} className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="flex justify-end px-4 py-2">
        <div className="relative w-[260px]">
          {items.length >= 3 && <div className="absolute inset-0 rounded-2xl bg-gray-200 transform rotate-[-4deg] scale-[0.97] z-0" />}
          {items.length >= 2 && <div className="absolute inset-0 rounded-2xl bg-gray-300 transform rotate-[-2deg] scale-[0.985] z-[1]" />}

          <div className="relative z-[2]">
            {active?.type === "image" ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl cursor-pointer group" onClick={() => setLightboxOpen(true)}>
                <img src={active.url} alt={active.name} className="w-full object-cover max-h-48 rounded-2xl" />
                {isSending && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : active?.type === "video" ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-black">
                <video src={active.url} className="w-full max-h-48 rounded-2xl" controls />
                {isSending && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl pointer-events-none">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-3 shadow-md flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-purple-600" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-800 truncate">{active.name}</p></div>
                {isSending && <Loader2 className="w-4 h-4 text-purple-500 animate-spin shrink-0" />}
              </div>
            )}
          </div>

          {items.length > 1 && (
            <div className="flex gap-1.5 mt-2 justify-end flex-wrap">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-2 h-2 rounded-full transition ${i === activeIndex ? "bg-[#00A884]" : "bg-gray-300"}`}
                />
              ))}
            </div>
          )}

          {!isSending && (
            <div className="flex gap-2 mt-2 justify-end items-center">
              <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white/80 border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">Cancel</button>
              <button onClick={handleSendClick} disabled={sendAnim} className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl transition shadow-sm flex items-center gap-1.5 ${sent ? "bg-[#00A884]" : "bg-[#00A884] hover:bg-[#008f6f]"}`}>
                {sent ? <Check className="w-3.5 h-3.5" /> : sendAnim ? <span className="animate-[fly_0.35s_ease-in_forwards] inline-flex"><Send className="w-3.5 h-3.5" /></span> : <><Send className="w-3.5 h-3.5" /> Send</>}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes fly { 0% { transform: translateX(0) rotate(0deg); opacity: 1; } 100% { transform: translateX(60px) rotate(-30deg); opacity: 0; } }`}</style>
    </>
  );
}

// ─── Audio Recording UI ──────────────────────────────────────────────────────

interface AudioRecorderProps {
  onStop: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
}

function AudioRecorder({ onStop, onCancel }: AudioRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    }).catch(() => { alert("Microphone access denied."); onCancel(); });
    return () => { if (timerRef.current) clearInterval(timerRef.current); mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop()); };
  }, []);

  const handleStop = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (timerRef.current) clearInterval(timerRef.current);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      onStop(blob, elapsed);
    };
    mr.stop();
    mr.stream.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-red-200 rounded-[20px] px-3 py-1.5 shadow-sm animate-in slide-in-from-bottom-2 duration-200 w-full">
      <span className="relative flex h-2.5 w-2.5 shrink-0 ml-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
      </span>
      <span className="text-sm font-bold text-red-500 tabular-nums w-9 ml-1">{formatDuration(elapsed)}</span>
      <div className="flex-1"></div>
      <button onClick={onCancel} className="p-1.5 hover:bg-red-50 rounded-full transition"><X className="w-4 h-4 text-red-400" /></button>
      <button onClick={handleStop} className="w-8 h-8 bg-[#00A884] rounded-full flex items-center justify-center shadow-md hover:bg-[#008f6f] transition"><Send className="w-3.5 h-3.5 text-white ml-0.5" /></button>
    </div>
  );
}

// ─── Main ChatInput ───────────────────────────────────────────────────────────

export default function ChatInput({
  inputText, setInputText, onSend, isSending, disabled = false, replyingTo, onCancelReply, activeContactName = "Contact", onSendMedia, onSendLocation, onSendInteractive, onSendTemplate
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showInteractiveMenu, setShowInteractiveMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [pendingMedias, setPendingMedias] = useState<MultiMediaPreview | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) { setShowEmojiPicker(false); } };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const toggleMediaMenu = () => { setShowMediaMenu((p) => !p); setShowInteractiveMenu(false); setShowEmojiPicker(false); setShowTemplatePicker(false); };
  const toggleInteractiveMenu = () => { setShowInteractiveMenu((p) => !p); setShowMediaMenu(false); setShowEmojiPicker(false); setShowTemplatePicker(false); };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`; }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) onSend(); }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputText(inputText + emojiData.emoji);
    textareaRef.current?.focus();
  };

  // Shared handler for gallery, camera and document inputs — detects the real
  // file kind instead of trusting a fixed label, so a video picked from the
  // gallery is never mislabeled as an image.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, forcedType?: "document") => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems = files.map((file) => ({
      file,
      type: forcedType || detectKind(file),
      url: URL.createObjectURL(file),
      name: file.name,
      size: formatBytes(file.size),
    }));
    setPendingMedias((prev) => (prev ? { files: [...prev.files, ...newItems] } : { files: newItems }));
    setShowMediaMenu(false);
    e.target.value = "";
  };

  const handleSendPendingMedias = async () => {
    if (!pendingMedias || !onSendMedia) return;
    setIsSendingMedia(true);
    try {
      for (const item of pendingMedias.files) {
        await onSendMedia(item.file, item.type);
      }
    } finally {
      pendingMedias.files.forEach((i) => URL.revokeObjectURL(i.url));
      setPendingMedias(null);
      setIsSendingMedia(false);
    }
  };

  const handleCancelPendingMedias = () => { if (pendingMedias) pendingMedias.files.forEach((i) => URL.revokeObjectURL(i.url)); setPendingMedias(null); };

  // Location sharing via the browser's Geolocation API
  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      alert("Aapka browser location support nahi karta.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSendLocation?.(pos.coords.latitude, pos.coords.longitude);
        setIsLocating(false);
        setShowMediaMenu(false);
      },
      (err) => {
        console.error("Location Error:", err);
        if (err.code === 1) alert("Permission Denied: Kripya apne browser ki location permission allow karein.");
        else if (err.code === 2) alert("Position Unavailable: Kripya apne phone ka GPS (Location) ON karein.");
        else alert("Timeout: Location nahi mil payi. Thodi der baad try karein.");

        setIsLocating(false);
        setShowMediaMenu(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleAudioStop = useCallback(async (blob: Blob, _duration: number) => {
    setIsRecording(false);
    if (!onSendMedia) return;
    const file = await convertAudioToOgg(blob);
    await onSendMedia(file, "audio");
  }, [onSendMedia]);

  const mediaOptions = [
    { icon: ImageIcon, label: "Gallery", color: "text-blue-500", bg: "bg-blue-50", action: () => galleryInputRef.current?.click() },
    { icon: Camera, label: "Camera", color: "text-pink-500", bg: "bg-pink-50", action: () => cameraInputRef.current?.click() },
    { icon: FileText, label: "Document", color: "text-purple-500", bg: "bg-purple-50", action: () => docInputRef.current?.click() },
    { icon: isLocating ? Loader2 : MapPin, label: "Location", color: "text-green-500", bg: "bg-green-50", action: handleLocationClick, spin: isLocating },
  ];

  const interactiveOptions = [
    { icon: MessageSquare, label: "Quick Reply", color: "text-blue-600", bg: "bg-blue-50", action: () => { onSendInteractive?.("quick_reply"); setShowInteractiveMenu(false); } },
    { icon: Link2, label: "URL Button", color: "text-teal-600", bg: "bg-teal-50", action: () => { onSendInteractive?.("url"); setShowInteractiveMenu(false); } },
    { icon: LayoutTemplate, label: "Template", color: "text-indigo-600", bg: "bg-indigo-50", action: () => { setShowTemplatePicker(true); setShowInteractiveMenu(false); } },
  ];

  const activeOptions = showMediaMenu ? mediaOptions : interactiveOptions;

  if (isRecording) {
    return (
      <div className="absolute bottom-0 w-full z-40 px-1 sm:px-2 pb-1 pointer-events-none flex justify-center">
        <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-[0_4px_25px_rgb(0,0,0,0.1)] rounded-[24px] pointer-events-auto p-1.5">
          <AudioRecorder onStop={handleAudioStop} onCancel={() => setIsRecording(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 w-full z-40 px-1 sm:px-2 pb-1 pointer-events-none flex justify-center">

      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-[0_4px_25px_rgb(0,0,0,0.1)] rounded-[24px] pointer-events-auto p-1 flex flex-col transition-all duration-300">

        {/* Gallery: pick existing photos/videos, multiple allowed */}
        <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFileChange(e)} />
        {/* Camera: opens the device camera directly and captures a photo */}
        <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e)} />
        {/* Document */}
        <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.txt,.xls,.xlsx" className="hidden" onChange={(e) => handleFileChange(e, "document")} />

        {pendingMedias && (
          <MultiMediaBubble previews={pendingMedias} isSending={isSendingMedia} onCancel={handleCancelPendingMedias} onSend={handleSendPendingMedias} onAddMore={() => galleryInputRef.current?.click()} />
        )}

        {replyingTo && !pendingMedias && (
          <div className="mx-2 mt-1 mb-1.5 bg-gray-50/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm flex items-stretch border border-gray-100 animate-in slide-in-from-bottom-2">
            <div className="w-1 bg-[#00A884]" />
            <div className="p-1.5 px-3 flex-1 flex justify-between items-start">
              <div className="flex flex-col min-w-0">
                <span className="text-[#00A884] font-bold text-[11px] mb-0.5">{replyingTo.sender === "me" ? "You" : activeContactName}</span>
                <span className="text-[12px] text-gray-600 line-clamp-1">{replyingTo.text}</span>
              </div>
              <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 rounded-full transition shrink-0 ml-2"><X className="w-3.5 h-3.5 text-gray-400" /></button>
            </div>
          </div>
        )}

        {/* TEMPLATE PICKER (Firebase based) */}
        {showTemplatePicker && (
          <TemplatePicker
            onClose={() => setShowTemplatePicker(false)}
            onSelect={(template) => {
              onSendTemplate?.(template);
              setShowTemplatePicker(false);
            }}
          />
        )}

        {(showMediaMenu || showInteractiveMenu) && (
          <div className="absolute bottom-full left-2 mb-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl p-2 flex gap-1 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {activeOptions.map((opt, i) => (
              <button key={i} onClick={opt.action} className="flex flex-col items-center gap-1 p-1.5 w-[60px] rounded-xl hover:bg-gray-50 active:scale-95 transition">
                <div className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center shadow-sm`}>
                  <opt.icon className={`w-5 h-5 ${opt.color} ${(opt as any).spin ? "animate-spin" : ""}`} />
                </div>
                <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full left-2 mb-2 z-50 shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
            <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.LIGHT} lazyLoadEmojis height={350} width={300} />
          </div>
        )}

        <div className="flex items-end gap-1 px-1 py-0.5">
          <button onClick={toggleMediaMenu} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition mb-0.5">
            <Plus className={`w-5 h-5 transition-transform duration-300 ${showMediaMenu ? "rotate-45 text-[#00A884]" : ""}`} />
          </button>

          <div className="flex-1 bg-gray-100/70 border border-transparent focus-within:border-gray-200 focus-within:bg-white rounded-[20px] flex items-end px-2 py-1 transition-all mb-0.5">
            <button onMouseDown={(e) => { e.preventDefault(); setShowEmojiPicker((p) => !p); setShowMediaMenu(false); setShowInteractiveMenu(false); setShowTemplatePicker(false); }} className={`w-7 h-7 mb-0.5 shrink-0 transition rounded-full flex items-center justify-center ${showEmojiPicker ? "text-[#00A884]" : "text-gray-400 hover:text-[#00A884]"}`}>
              <Smile className="w-[18px] h-[18px]" />
            </button>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="w-full max-h-[80px] bg-transparent resize-none overflow-y-auto text-[14px] text-gray-800 outline-none placeholder-gray-400 py-1 px-1.5 font-medium leading-snug"
              rows={1}
              disabled={disabled || isSending || !!pendingMedias}
            />
          </div>

          <div className="flex items-center gap-0.5 shrink-0 mb-0.5">
            {inputText.trim() ? (
              <button onClick={onSend} disabled={isSending || disabled} className="w-9 h-9 bg-[#00A884] text-white rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 shadow-md">
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            ) : (
              <>
                <button onClick={toggleInteractiveMenu} className={`w-9 h-9 rounded-full flex items-center justify-center transition ${showInteractiveMenu ? "bg-[#00A884]/10 text-[#00A884]" : "text-gray-500 hover:bg-gray-100"}`}>
                  <IndianRupee className="w-[18px] h-[18px]" />
                </button>
                <button onClick={() => setIsRecording(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
                  <Mic className="w-[18px] h-[18px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
