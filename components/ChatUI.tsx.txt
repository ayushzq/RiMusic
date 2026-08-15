"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, MoreVertical, Trash2, X, Phone, Video as VideoIcon } from "lucide-react";
import ChatBubble, { Message } from "./ChatBubble";
import ChatInput from "./ChatInput";
import { auth, database } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";

// ─── Dummy Data (Initial Messages) ─────────────────────────────────────────
const INITIAL_MESSAGES: Message[] = [
  { id: "1", text: "Hi, BaseKey services ke baare mein janna tha.", sender: "them", time: "10:00 AM", type: "text" },
  { id: "2", text: "Hello! Bilkul, bataiye main aapki kya madad kar sakta hoon?", sender: "me", time: "10:02 AM", status: "read", type: "text" },
];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ text: string; sender: string; id: string } | null>(null);

  // Selection Mode State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelectionMode = selectedIds.length > 0;

  // Header Menu State
  const [showMenu, setShowMenu] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ─── API Credentials & State ───
  const [phoneId, setPhoneId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Demo recipient phone (jispe WhatsApp message jayega)
  const recipientPhone = "919229966001";

  // Fetch Firebase Credentials
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const configRef = ref(database, `users/${user.uid}/config`);
          const snapshot = await get(configRef);
          if (snapshot.exists() && snapshot.val().phoneId) {
            setPhoneId(snapshot.val().phoneId);
            setAccessToken(snapshot.val().accessToken);
          }
        } catch (err) {
          console.error("Error fetching Meta API config:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── META API SEND FUNCTION (unchanged backend contract) ───
  const sendToMeta = async (payload: any) => {
    if (!phoneId || !accessToken) {
      alert("Error: Settings me Meta API connect karein. Credentials missing hain.");
      return;
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch (err: any) {
      console.error("Meta API Error:", err);
      alert("Failed to send message: " + err.message);
    }
  };

  // Uploads a local file to Meta's media endpoint first, returning the media id
  // that a message payload needs (Meta requires media to be uploaded before
  // it can be referenced in a message).
  const uploadMediaToMeta = async (file: File): Promise<string | null> => {
    if (!phoneId || !accessToken) {
      alert("Error: Settings me Meta API connect karein. Credentials missing hain.");
      return null;
    }
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("messaging_product", "whatsapp");

      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: form,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.id as string;
    } catch (err: any) {
      console.error("Meta Media Upload Error:", err);
      alert("Failed to upload media: " + err.message);
      return null;
    }
  };

  // ─── Actions (Text, Media, Location, Template) ─────────────────────────────

  // 1. Send Normal Text Message
  const handleSendText = async () => {
    if (!inputText.trim()) return;
    setIsSending(true);
    const textToSend = inputText.trim();

    const newMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: "me",
      time: nowTime(),
      status: "sent",
      type: "text",
      replyTo: replyingTo ? replyingTo.text : null,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setReplyingTo(null);

    const payload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "text",
      text: { body: textToSend }
    };

    await sendToMeta(payload);
    setIsSending(false);
  };

  // 2. Send Media (image / video / document / audio)
  const handleSendMedia = async (file: File, type: "image" | "video" | "document" | "audio") => {
    const localUrl = URL.createObjectURL(file);

    const newMsg: Message = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      text: "",
      sender: "me",
      time: nowTime(),
      status: "sent",
      type,
      mediaUrl: localUrl,
      mediaName: file.name,
      mediaSize: formatBytes(file.size),
    };

    setMessages((prev) => [...prev, newMsg]);

    const mediaId = await uploadMediaToMeta(file);
    if (!mediaId) return;

    const mediaObject: any = { id: mediaId };
    if (type === "document") mediaObject.filename = file.name;

    const payload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type,
      [type]: mediaObject,
    };

    await sendToMeta(payload);
  };

  // 3. Send Location
  const handleSendLocation = async (lat: number, lng: number) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      text: "",
      sender: "me",
      time: nowTime(),
      status: "sent",
      type: "location",
      location: { lat, lng },
    };
    setMessages((prev) => [...prev, newMsg]);

    const payload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "location",
      location: {
        latitude: lat,
        longitude: lng,
        name: "Current Location",
        address: "Shared via BaseKey"
      }
    };
    await sendToMeta(payload);
  };

  // 4. Send Template
  const handleSendTemplate = async (template: any) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      text: "",
      sender: "me",
      time: nowTime(),
      status: "sent",
      type: "template",
      templateName: template.name,
    };
    setMessages((prev) => [...prev, newMsg]);

    const payload = {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language }
      }
    };
    await sendToMeta(payload);
  };

  // ─── UI Actions ────────────────────────────────────────────────────────────

  const handleDeleteSingle = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear this entire chat?")) {
      setMessages([]);
      setShowMenu(false);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.length} selected messages?`)) {
      setMessages((prev) => prev.filter((msg) => !selectedIds.includes(msg.id)));
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ─── UI Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto bg-gray-100 relative overflow-hidden shadow-2xl sm:border sm:border-gray-300">

      {/* ─── Header ─── */}
      <header className="bg-[#008069] text-white px-4 py-2.5 flex items-center justify-between z-20 shadow-md">
        {isSelectionMode ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedIds([])} className="p-1 hover:bg-white/20 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
              <span className="font-semibold text-lg">{selectedIds.length} Selected</span>
            </div>
            <button onClick={handleBulkDelete} className="p-2 hover:bg-white/20 rounded-full transition">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button className="sm:hidden p-1 -ml-1 hover:bg-white/20 rounded-full transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=BaseKey" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[16px] leading-tight">BaseKey Support</span>
                <span className="text-[12px] text-white/80">online</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-white/20 rounded-full transition hidden sm:block"><VideoIcon className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-white/20 rounded-full transition hidden sm:block"><Phone className="w-5 h-5" /></button>

              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-white/20 rounded-full transition">
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl py-2 text-gray-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={handleClearAll}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 text-red-600 font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> Clear Chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* ─── Chat Area (WhatsApp Doodle Background) ─── */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 pt-4 pb-[90px]"
        style={{
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundSize: "400px",
          backgroundRepeat: "repeat",
          backgroundColor: "#efeae2"
        }}
      >
        <div className="flex justify-center mb-6">
          <span className="bg-white/90 text-gray-500 text-[12px] px-3 py-1 rounded-lg shadow-sm font-medium">
            TODAY
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="bg-[#FFF3C7] text-gray-600 text-[12px] px-4 py-2 rounded-xl shadow-sm text-center max-w-sm">
              No messages here yet. Send a message to start the conversation!
            </span>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              msg={msg}
              selectionMode={isSelectionMode}
              isSelected={selectedIds.includes(msg.id)}
              onToggleSelect={toggleSelect}
              onDelete={handleDeleteSingle}
              onReply={(m) => setReplyingTo({ text: m.text || `${m.type} message`, sender: m.sender, id: m.id })}
              contactName="BaseKey Support"
            />
          ))
        )}
      </div>

      {/* ─── Floating Chat Input ─── */}
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSendText}
        isSending={isSending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        activeContactName="BaseKey Support"

        onSendMedia={handleSendMedia}
        onSendLocation={handleSendLocation}
        onSendInteractive={(type) => console.log("Interactive sent:", type)}
        onSendTemplate={handleSendTemplate}
      />
    </div>
  );
}
