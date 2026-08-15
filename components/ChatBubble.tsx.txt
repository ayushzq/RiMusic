"use client";

import React, { useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Reply,
  Trash2,
  FileText,
  Download,
  MapPin,
  Play,
  Pause,
  LayoutTemplate,
} from "lucide-react";

export interface Message {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  status?: "sent" | "delivered" | "read";
  replyTo?: string | null;
  type?: "text" | "image" | "video" | "document" | "audio" | "location" | "template";
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  location?: { lat: number; lng: number };
  templateName?: string;
}

interface ChatBubbleProps {
  msg: Message;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onReply: (msg: Message) => void;
  onDelete?: (id: string) => void;
  contactName?: string;
}

// ─── Small inline audio player used inside bubbles ──────────────────────────
function AudioBubblePlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play();
    }
    setPlaying(!playing);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgress((a.currentTime / a.duration) * 100);
  };

  return (
    <div className="flex items-center gap-2 min-w-[190px] py-1">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="w-8 h-8 shrink-0 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-sm"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#00A884] transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function ChatBubble({
  msg,
  selectionMode,
  isSelected,
  onToggleSelect,
  onReply,
  onDelete,
  contactName = "Contact",
}: ChatBubbleProps) {
  const [translateX, setTranslateX] = useState(0);
  const touchStartX = useRef(0);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isMe = msg.sender === "me";
  const type = msg.type || "text";

  const startInteraction = (clientX: number) => {
    if (selectionMode) return;
    touchStartX.current = clientX;
    pressTimer.current = setTimeout(() => {
      onToggleSelect(msg.id);
      if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const moveInteraction = (clientX: number) => {
    if (selectionMode) return;
    const diff = clientX - touchStartX.current;
    if (Math.abs(diff) > 10 && pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
    if (diff > 0 && diff < 80) {
      setTranslateX(diff);
    }
  };

  const endInteraction = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (translateX > 50) {
      onReply(msg);
    }
    setTranslateX(0);
  };

  const handleClick = () => {
    if (selectionMode) onToggleSelect(msg.id);
    else if (type === "text" || type === "template") setShowActions(!showActions);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    return timeStr;
  };

  const handleDownload = () => {
    if (!msg.mediaUrl) return;
    const a = document.createElement("a");
    a.href = msg.mediaUrl;
    a.download = msg.mediaName || "file";
    a.click();
  };

  // ─── Checkbox used in selection mode — sits on the outer edge, matching WhatsApp ───
  const SelectionCheckbox = (
    <div className="w-8 flex justify-center shrink-0 mt-2 self-start">
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
          isSelected ? "bg-[#00A884] border-[#00A884] scale-100" : "border-gray-400 bg-white scale-95"
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </div>
  );

  return (
    <div
      className={`flex items-start w-full my-0.5 px-2 md:px-4 relative transition-colors duration-150 ${
        isSelected ? "bg-[#25D366]/15" : ""
      }`}
      onClick={handleClick}
    >
      {/* Selection checkbox — left side, only for incoming messages */}
      {selectionMode && !isMe && SelectionCheckbox}

      {/* Reply Icon (Swipe Reveal) */}
      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200"
        style={{ opacity: Math.min(translateX / 60, 1) }}
      >
        <div className="w-8 h-8 rounded-full bg-[#00A884]/20 flex items-center justify-center">
          <Reply className="w-4 h-4 text-[#00A884]" />
        </div>
      </div>

      {/* Message Container */}
      <div
        className={`flex flex-col w-full ${isMe ? "items-end" : "items-start"}`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 ? "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
        onTouchStart={(e) => startInteraction(e.touches[0].clientX)}
        onTouchMove={(e) => moveInteraction(e.touches[0].clientX)}
        onTouchEnd={endInteraction}
        onMouseDown={(e) => startInteraction(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && moveInteraction(e.clientX)}
        onMouseUp={endInteraction}
        onMouseLeave={endInteraction}
      >
        {/* Bubble */}
        <div
          className={`relative rounded-2xl shadow-sm cursor-pointer select-none
            ${type === "image" || type === "video" ? "max-w-[75%] md:max-w-[45%] p-1" : "max-w-[85%] md:max-w-[60%] px-3 py-1.5"}
            ${isMe
              ? "bg-[#D9FDD3] rounded-tr-sm text-[#111B21]"
              : "bg-white rounded-tl-sm text-[#111B21] border border-gray-100/50"
            }
            ${showActions && !selectionMode ? "ring-2 ring-[#00A884]/30" : ""}
          `}
        >
          {/* Reply Context */}
          {msg.replyTo && (
            <div className={`bg-black/[0.06] rounded-lg p-2 mb-1.5 border-l-[3px] border-[#00A884] text-xs ${type === "image" || type === "video" ? "mx-1 mt-1" : ""}`}>
              <span className="text-[#00A884] font-bold block text-[10px] mb-0.5">
                {msg.sender === "me" ? "You" : contactName}
              </span>
              <span className="text-gray-600 line-clamp-2 text-[12px]">{msg.replyTo}</span>
            </div>
          )}

          {/* ─── Image ─── */}
          {type === "image" && msg.mediaUrl && (
            <>
              {lightboxOpen && (
                <div
                  className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(false);
                  }}
                >
                  <img src={msg.mediaUrl} alt="" className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
              )}
              <img
                src={msg.mediaUrl}
                alt=""
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className="w-full max-h-72 object-cover rounded-xl"
              />
              {msg.text && <p className="text-[14px] leading-snug px-2 pt-1.5 pb-4 whitespace-pre-wrap break-words">{msg.text}</p>}
            </>
          )}

          {/* ─── Video ─── */}
          {type === "video" && msg.mediaUrl && (
            <>
              <video src={msg.mediaUrl} controls className="w-full max-h-72 rounded-xl bg-black" />
              {msg.text && <p className="text-[14px] leading-snug px-2 pt-1.5 pb-4 whitespace-pre-wrap break-words">{msg.text}</p>}
            </>
          )}

          {/* ─── Document ─── */}
          {type === "document" && (
            <div className="flex items-center gap-3 py-1 pr-14 min-w-[190px]">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{msg.mediaName}</p>
                <p className="text-[11px] text-gray-500">{msg.mediaSize}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center shrink-0"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* ─── Audio ─── */}
          {type === "audio" && msg.mediaUrl && (
            <div className="pr-6">
              <AudioBubblePlayer url={msg.mediaUrl} />
            </div>
          )}

          {/* ─── Location ─── */}
          {type === "location" && msg.location && (
            <a
              href={`https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block -m-1 rounded-xl overflow-hidden"
            >
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${msg.location.lat},${msg.location.lng}&zoom=15&size=260x140&markers=${msg.location.lat},${msg.location.lng},red-pushpin`}
                alt="Location"
                className="w-full h-[140px] object-cover bg-gray-100"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-white">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#00A884]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800">Current Location</p>
                  <p className="text-[11px] text-gray-500">Tap to view on map</p>
                </div>
              </div>
            </a>
          )}

          {/* ─── Template ─── */}
          {type === "template" && (
            <div className="flex items-center gap-3 py-1 pr-14 min-w-[190px]">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Template</p>
                <p className="text-[13px] font-semibold text-gray-800 truncate">{msg.templateName}</p>
              </div>
            </div>
          )}

          {/* ─── Plain text ─── */}
          {type === "text" && (
            <p className="text-[14.2px] leading-snug text-[#111B21] whitespace-pre-wrap break-words pr-14">
              {msg.text}
            </p>
          )}

          {/* Time & Status */}
          <div
            className={`absolute bottom-1 right-2 flex items-center gap-1 ${
              type === "image" || type === "video" ? "bg-black/40 px-1.5 py-0.5 rounded-md" : ""
            }`}
          >
            <span
              className={`text-[10.5px] font-medium ${
                type === "image" || type === "video" ? "text-white" : "text-[#667781]"
              }`}
            >
              {formatTime(msg.time)}
            </span>
            {isMe && (
              <span className="flex items-center">
                {msg.status === "sent" && (
                  <Check className={`w-3.5 h-3.5 ${type === "image" || type === "video" ? "text-white" : "text-[#8696A0]"}`} strokeWidth={2.5} />
                )}
                {msg.status === "delivered" && (
                  <CheckCheck className={`w-3.5 h-3.5 ${type === "image" || type === "video" ? "text-white" : "text-[#8696A0]"}`} strokeWidth={2.5} />
                )}
                {msg.status === "read" && (
                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" strokeWidth={2.5} />
                )}
              </span>
            )}
          </div>

          {/* Invisible spacer for time, text bubbles only */}
          {type === "text" && <div className="h-4"></div>}
        </div>

        {/* Action Menu (on click) */}
        {showActions && !selectionMode && (
          <div
            className="mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1.5 px-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 flex flex-col min-w-[130px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onReply(msg);
                setShowActions(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md w-full text-left transition"
            >
              <Reply className="w-4 h-4" /> Reply
            </button>
            <button
              onClick={() => {
                onToggleSelect(msg.id);
                setShowActions(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md w-full text-left transition"
            >
              <Check className="w-4 h-4" /> Select
            </button>

            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm("Delete this message for everyone?")) {
                    onDelete(msg.id);
                  }
                  setShowActions(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md w-full text-left transition mt-0.5 border-t border-gray-100"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selection checkbox — right side, only for outgoing messages (matches WhatsApp) */}
      {selectionMode && isMe && SelectionCheckbox}
    </div>
  );
}
