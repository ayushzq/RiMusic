"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, MoreVertical, Trash2, X } from "lucide-react";
// 🔥 NAYA: Firebase hata kar NextAuth import kiya
import { useSession } from "next-auth/react"; 

import Sidebar from "../../components/chat/Sidebar";
import ChatBubble from "../../components/chat/ChatBubble";
import ChatInput from "../../components/chat/ChatInput";
import ThemeSelector, { ChatTheme } from "../../components/chat/ThemeSelector";

// Types
import { Contact, ChatMessage, MetaTemplate } from "../../lib/chatLogic";

const DEFAULT_WALLPAPER: ChatTheme = {
  id: "default",
  name: "Default",
  bgUrl: "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png",
  thumbUrl: "https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png",
  accent: "#00A884",
};

export default function ChatPage() {
  // ─── URL Bar Hiding Logic ──────────────────────────────
  useEffect(() => {
    const hideUrlBar = () => {
      setTimeout(() => window.scrollTo(0, 1), 100);
    };
    window.addEventListener("load", hideUrlBar);
    hideUrlBar();
    return () => window.removeEventListener("load", hideUrlBar);
  }, []);

  // ─── Auth (NextAuth + LocalStorage for Agent) ───────────────────────────
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // 1. Check for Support Agent (LocalStorage)
      if (typeof window !== "undefined") {
        const agentToken = localStorage.getItem("agent_token");
        if (agentToken) {
          setUser({ uid: agentToken, role: "AGENT" });
          setAuthLoading(false);
          return;
        }
      }

      // 2. Check for Admin (NextAuth)
      if (status !== "loading") {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [session, status]);

  // ─── State Variables ────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ text: string; sender: string; id: string } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelectionMode = selectedIds.length > 0;
  const [showMenu, setShowMenu] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ─── Fetch Contacts (API Polling for Live Sidebar) ──────────────────────
  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/chat/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      console.error("Failed to fetch contacts", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchContacts(); // Initial fetch
    const interval = setInterval(fetchContacts, 3000); // Har 3 second me refresh
    return () => clearInterval(interval);
  }, [user]);

  // Update active contact dynamically
  useEffect(() => {
    if (!activeContact) return;
    const fresh = contacts.find((c) => c.id === activeContact.id);
    if (fresh) setActiveContact(fresh);
  }, [contacts]);

  // ─── Fetch Messages (API Polling for Live Chat) ─────────────────────────
  const fetchMessages = async () => {
    if (!activeContact) return;
    try {
      const res = await fetch(`/api/chat/messages?contactId=${activeContact.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to fetch messages", e);
    }
  };

  useEffect(() => {
    if (!activeContact) {
      setMessages([]);
      return;
    }
    fetchMessages(); // Initial fetch
    const interval = setInterval(fetchMessages, 2000); // Har 2 second me messages refresh (Live feel)
    return () => clearInterval(interval);
  }, [activeContact?.id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  // ─── Send Actions (Sending via Next.js API) ──────────────────────────────
  const handleSendText = async () => {
    if (!inputText.trim() || !activeContact) return;
    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText("");
    const reply = replyingTo;
    setReplyingTo(null);

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeContact.id,
          phoneNumber: activeContact.phoneNumber, // WhatsApp number
          type: "TEXT",
          body: textToSend,
          replyTo: reply ? reply.text : null,
        }),
      });
      fetchMessages(); // Bhejte hi turant messages refresh karo
    } catch (err: any) {
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMedia = async (file: File, type: "image" | "video" | "document" | "audio") => {
    if (!activeContact) return;
    alert("Media API abhi set karni baaki hai backend me!");
  };

  const handleSendLocation = async (lat: number, lng: number) => {
    if (!activeContact) return;
    alert("Location API abhi set karni baaki hai backend me!");
  };

  const handleSendTemplate = async (template: MetaTemplate) => {
    if (!activeContact) return;
    alert("Template API abhi set karni baaki hai backend me!");
  };

  // ─── Message Management ─────────────────────────────────────────────────
  const handleDeleteSingle = async (id: string) => {
    if (!activeContact || !window.confirm("Are you sure?")) return;
    await fetch(`/api/chat/messages?id=${id}`, { method: "DELETE" });
    fetchMessages();
  };

  const handleClearAll = async () => {
    if (!activeContact || !window.confirm("Clear this entire chat?")) return;
    await fetch(`/api/chat/messages?contactId=${activeContact.id}&action=clear`, { method: "DELETE" });
    setShowMenu(false);
    fetchMessages();
  };

  const handleBulkDelete = async () => {
    if (!activeContact || !window.confirm(`Delete ${selectedIds.length} messages?`)) return;
    await fetch(`/api/chat/messages`, { 
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    setSelectedIds([]);
    fetchMessages();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectContact = useCallback((contact: Contact) => {
    setActiveContact(contact);
    setSelectedIds([]);
    setReplyingTo(null);
    setShowMenu(false);
  }, []);

  // Wallpaper mapping
  const activeWallpaper: ChatTheme = DEFAULT_WALLPAPER;

  // ─── Render ──────────────────────────────────────────────────────────────
  if (authLoading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  if (!user) return <div className="flex items-center justify-center h-screen text-gray-500">Please log in to view your chats.</div>;

  return (
    <div className="flex h-[100dvh] w-full bg-gray-100 overflow-hidden">
      <Sidebar
        contacts={contacts}
        activeContactId={activeContact?.id ?? null}
        onSelectContact={handleSelectContact}
        className={`w-full sm:w-[360px] shrink-0 ${activeContact ? "hidden sm:flex" : "flex"}`}
      />

      <div className={`flex-col flex-1 min-w-0 ${activeContact ? "flex" : "hidden sm:flex"}`}>
        {!activeContact ? (
          <div className="flex-1 flex items-center justify-center bg-[#F0F2F5] text-gray-400">
            <p className="text-sm font-medium">Select a conversation to start chatting</p>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full relative overflow-hidden">
            {/* Header */}
            <header className="bg-[#008069] text-white px-4 py-2.5 flex items-center justify-between z-20 shadow-md shrink-0">
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
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setActiveContact(null)} className="sm:hidden p-1 -ml-1 hover:bg-white/20 rounded-full transition shrink-0">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden shrink-0">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeContact.id}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[16px] leading-tight truncate">
                        {activeContact.name || activeContact.phoneNumber}
                      </span>
                      <span className="text-[12px] text-white/80">
                        {activeContact.phoneNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <ThemeSelector currentTheme={activeWallpaper} onChange={() => {}} />

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

            {/* Chat Area */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-2 sm:px-4 pt-4 pb-[90px]"
              style={{
                backgroundImage: `url('${activeWallpaper.bgUrl}')`,
                backgroundSize: activeWallpaper.id === "default" ? "400px" : "cover",
                backgroundRepeat: activeWallpaper.id === "default" ? "repeat" : "no-repeat",
                backgroundPosition: "center",
                backgroundColor: "#efeae2",
              }}
            >
              <div className="flex justify-center mb-6">
                <span className="bg-white/90 text-gray-500 text-[12px] px-3 py-1 rounded-lg shadow-sm font-medium">TODAY</span>
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
                    onReply={(m) => setReplyingTo({ text: m.body || `${m.type} message`, sender: m.direction, id: m.id })}
                    contactName={activeContact.name || activeContact.phoneNumber}
                  />
                ))
              )}
            </div>

            {/* Floating Chat Input */}
            <ChatInput
              uid={user?.id || user?.uid || ""}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSendText}
              isSending={isSending}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              activeContactName={activeContact.name || activeContact.phoneNumber}
              onSendMedia={handleSendMedia}
              onSendLocation={handleSendLocation}
              onSendInteractive={(type) => console.log("Interactive sent:", type)}
              onSendTemplate={handleSendTemplate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
