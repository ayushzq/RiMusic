"use client";

import React from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  MapPin,
  CornerUpLeft,
  ExternalLink,
  Phone,
} from "lucide-react";
import { MetaTemplateRecord } from "../../types/template.types";

export default function TemplateViewModal({
  template,
  onClose,
}: {
  template: MetaTemplateRecord | null;
  onClose: () => void;
}) {
  if (!template) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]";
      case "REJECTED": return "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]";
      default: return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{template.name}</h2>
            <p className="text-xs text-gray-500">Template Details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getStatusColor(template.status || "PENDING")}`}>
              {template.status || "PENDING"}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-gray-100 text-gray-600 border border-gray-200">
              {template.category}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-gray-100 text-gray-600 border border-gray-200">
              {template.language}
            </span>
          </div>

          {template.components?.map((comp: any, idx: number) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">{comp.type}</p>

              {comp.type === "HEADER" && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Format: <span className="font-semibold text-gray-700">{comp.format}</span>
                  </p>
                  {comp.format === "TEXT" && comp.text && (
                    <p className="text-sm font-bold text-gray-800">{comp.text}</p>
                  )}
                  {comp.format === "IMAGE" && comp.example?.header_handle?.[0] && (
                    <img src={comp.example.header_handle[0]} alt="Header" className="w-full h-32 object-cover rounded-lg mt-2" />
                  )}
                  {comp.format === "VIDEO" && comp.example?.header_handle?.[0] && (
                    <video src={comp.example.header_handle[0]} className="w-full h-32 object-cover rounded-lg mt-2" controls />
                  )}
                  {comp.format !== "TEXT" && !comp.example?.header_handle?.[0] && (
                    <div className="flex items-center gap-2 text-gray-400">
                      {comp.format === "IMAGE" && <ImageIcon className="w-5 h-5" />}
                      {comp.format === "VIDEO" && <Video className="w-5 h-5" />}
                      {comp.format === "DOCUMENT" && <FileText className="w-5 h-5" />}
                      {comp.format === "LOCATION" && <MapPin className="w-5 h-5" />}
                      <span className="text-xs">{comp.format} Media</span>
                    </div>
                  )}
                </div>
              )}

              {comp.type === "BODY" && (
                <div>
                  {comp.text && <p className="text-sm text-gray-800 whitespace-pre-wrap">{comp.text}</p>}
                  {/* 🔥 NAYA: saved variable examples dikhana */}
                  {comp.example?.body_text?.[0]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                        Variable Examples
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {comp.example.body_text[0].map((val: string, i: number) => (
                          <span
                            key={i}
                            className="text-[11px] bg-[#E8F8F5] text-[#075E54] px-2 py-1 rounded-md border border-[#A7E9D1] font-mono"
                          >
                            {`{{${i + 1}}}`} → {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {comp.type === "FOOTER" && comp.text && <p className="text-xs text-gray-500">{comp.text}</p>}

              {comp.type === "BUTTONS" && comp.buttons && (
                <div className="space-y-2">
                  {comp.buttons.map((btn: any, bIdx: number) => (
                    <div key={bIdx} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      {btn.type === "QUICK_REPLY" && <CornerUpLeft className="w-4 h-4 text-[#25D366]" />}
                      {btn.type === "URL" && <ExternalLink className="w-4 h-4 text-[#25D366]" />}
                      {btn.type === "PHONE_NUMBER" && <Phone className="w-4 h-4 text-[#25D366]" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{btn.text}</p>
                        {btn.url && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{btn.url}</p>}
                        {btn.phone_number && <p className="text-[10px] text-gray-400">{btn.phone_number}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <details>
            <summary className="text-xs font-bold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> View Raw JSON
            </summary>
            <pre className="mt-2 bg-gray-900 text-green-400 text-[10px] p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(template, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
