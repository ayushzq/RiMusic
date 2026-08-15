"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Loader2, Send, AlertCircle, Search, RefreshCw } from "lucide-react";
import { auth, database } from "../lib/firebase"; // Dhyan rakhna path sahi ho
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";

interface TemplatePickerProps {
  onClose: () => void;
  onSelect: (template: any) => void;
}

export default function TemplatePicker({ onClose, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    // Firebase se direct credentials nikalna (Error #100 Fix)
    setLoading(true);
    setError("");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const configRef = ref(database, `users/${user.uid}/config`);
          const snapshot = await get(configRef);

          if (snapshot.exists() && snapshot.val().wabaId) {
            const { wabaId, accessToken } = snapshot.val();
            fetchTemplatesFromMeta(wabaId, accessToken);
          } else {
            setError("Meta API Credentials not found in Settings.");
            setLoading(false);
          }
        } catch (err) {
          setError("Failed to fetch config from Firebase.");
          setLoading(false);
        }
      } else {
        setError("User not logged in.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [retryTick]);

  const fetchTemplatesFromMeta = async (wabaId: string, accessToken: string) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();

      if (data.data) {
        setTemplates(data.data.filter((t: any) => t.status === "APPROVED"));
      } else {
        setError(data.error?.message || "Failed to load templates");
      }
    } catch (err) {
      setError("Network error. Could not fetch templates.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!query.trim()) return templates;
    const q = query.trim().toLowerCase();
    return templates.filter((t) => t.name?.toLowerCase().includes(q));
  }, [templates, query]);

  return (
    <>
      {/* Backdrop — tapping outside closes the picker, like a WhatsApp bottom sheet */}
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />

      <div
        className="absolute bottom-full left-2 sm:left-4 mb-3 w-[300px] sm:w-[340px] max-h-[420px] bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col z-50 animate-in slide-in-from-bottom-4 fade-in duration-200 overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="bg-[#00A884] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm">Send Template</h3>
          <button onClick={onClose} className="hover:bg-black/20 p-1.5 rounded-full transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        {!loading && !error && templates.length > 0 && (
          <div className="px-3 pt-2.5 pb-1.5 bg-gray-50 shrink-0">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full text-[12px] outline-none placeholder-gray-400 text-gray-700"
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2 bg-gray-50 min-h-[200px] max-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#00A884]" />
              <p className="text-xs font-medium">Loading templates from Meta...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center text-red-500">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-medium mb-3">{error}</p>
              <button
                onClick={() => setRetryTick((t) => t + 1)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#00A884] px-3 py-1.5 rounded-lg hover:bg-[#008f6f] transition"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-xs font-medium">No approved templates found.</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-xs font-medium">No templates match "{query}".</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => onSelect(tpl)}
                  className="bg-white border border-gray-200 p-3 rounded-xl hover:border-[#00A884] hover:shadow-md cursor-pointer transition group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[13px] font-bold text-gray-800 truncate pr-2">{tpl.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase font-bold">{tpl.language}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                    {tpl.components?.find((c: any) => c.type === "BODY")?.text || "No body text"}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <span className="text-[10px] flex items-center gap-1 font-bold text-[#00A884] opacity-0 group-hover:opacity-100 transition-opacity">
                      Send <Send className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
