"use client";

import React, { useState, useMemo } from "react";
import { RefreshCw, Eye, Pencil, FileText, AlertCircle, Loader2 } from "lucide-react";
import { TemplateCategory, MetaTemplateRecord } from "../../types/template.types";
import TemplateViewModal from "./TemplateViewModal";

export default function TemplateList({
  templates,
  loading,
  errorMsg,
  onSync,
  onCreateNew,
  onEdit,
}: {
  templates: MetaTemplateRecord[];
  loading: boolean;
  errorMsg: string;
  onSync: () => void;
  onCreateNew: () => void;
  onEdit: (tpl: MetaTemplateRecord) => void;
}) {
  const [viewTemplate, setViewTemplate] = useState<MetaTemplateRecord | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const filteredTemplates = useMemo(() => {
    if (filterCategory === "ALL") return templates;
    return templates.filter((t) => t.category === filterCategory);
  }, [templates, filterCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: templates.length };
    templates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-gray-900 font-sans pb-20">
      {viewTemplate && (
        <TemplateViewModal template={viewTemplate} onClose={() => setViewTemplate(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-[17px] font-bold text-gray-800">Message Templates</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage and create official Meta templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 transition"
            title="Sync from Meta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm"
          >
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="px-5 lg:px-6 pt-4 max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...Object.values(TemplateCategory)] as string[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                filterCategory === cat
                  ? "bg-[#25D366] text-white border-[#25D366]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#25D366] hover:text-[#25D366]"
              }`}
            >
              {cat !== "ALL" && filterCategory !== cat && (
                <span className={`w-1.5 h-1.5 rounded-full ${
                  cat === "MARKETING" ? "bg-orange-400" :
                  cat === "UTILITY" ? "bg-blue-400" :
                  "bg-purple-400"
                }`} />
              )}
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
              {categoryCounts[cat] > 0 && (
                <span className={`ml-0.5 ${filterCategory === cat ? "opacity-80" : "opacity-60"}`}>
                  ({categoryCounts[cat]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-5 lg:p-6 max-w-5xl mx-auto">
        {errorMsg ? (
          <div className="text-center py-10 bg-red-50 border border-red-100 rounded-xl text-red-600 font-medium">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {errorMsg}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#25D366]" />
            <p className="text-sm font-medium">Fetching templates from Meta...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl bg-white shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-1">
              {filterCategory !== "ALL"
                ? `No ${filterCategory.toLowerCase()} templates found.`
                : "No templates found"}
            </p>
            <p className="text-gray-400 text-xs mb-5">
              {filterCategory !== "ALL"
                ? "Try a different category filter."
                : "Create your first template or import from Meta"}
            </p>
            <button
              onClick={onCreateNew}
              className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3
                      className="font-bold text-[14px] text-gray-800 truncate pr-2 leading-tight"
                      title={tpl.name}
                    >
                      {tpl.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-bold tracking-wide uppercase flex-shrink-0 ${
                        tpl.status === "APPROVED"
                          ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                          : tpl.status === "REJECTED"
                          ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                          : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                      }`}
                    >
                      {tpl.status || "PENDING"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      Category: <span className="font-semibold text-gray-700">{tpl.category}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Language: <span className="font-semibold text-gray-700">{tpl.language}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Components: <span className="font-semibold text-gray-700">{tpl.components?.length || 0}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setViewTemplate(tpl)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => onEdit(tpl)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ECFDF5] hover:bg-[#D1F2EB] border border-[#A7F3D0] rounded-lg text-xs font-bold text-[#065F46] transition"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
