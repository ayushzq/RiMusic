"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  ExternalLink,
  Phone,
  CornerUpLeft,
  Trash2,
  Bot,
  Type,
  PanelBottom,
  Send,
  Loader2,
  ArrowLeft,
  X,
  Smartphone,
  HelpCircle,
  ListChecks,
} from "lucide-react";

import {
  TemplateCategory,
  TemplateLanguage,
  HeaderFormat,
  ButtonType,
  CreateTemplatePayload,
} from "../../types/template.types";
import { validateTemplate, ValidationResult, extractVariableNumbers } from "../../lib/validators/template.validator";
import { FormState, ButtonDraft, uid, buildPayload } from "./formState";
import MediaUploader from "./MediaUploader";
import TemplatePreview from "./TemplatePreview";

const InputCls =
  "w-full bg-[#F9FAFB] border border-[#E5E7EB] text-gray-800 text-[13px] rounded-lg px-3 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] transition-all font-sans shadow-sm";

export default function CreateTemplateForm({
  onSave,
  onBack,
  initialData,
}: {
  onSave: (data: CreateTemplatePayload) => Promise<void>;
  onBack: () => void;
  initialData?: any;
}) {
  const [form, setForm] = useState<FormState>({
    name: initialData?.name || "",
    category: initialData?.category || TemplateCategory.MARKETING,
    language: initialData?.language || TemplateLanguage.ENGLISH_US,
    headerFormat: "NONE",
    headerText: "",
    headerMediaUrl: "",
    bodyText: "",
    footerText: "",
    buttons: [],
    bodyExamples: {},
  });

  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Load initial data (edit mode) ──
  useEffect(() => {
    if (initialData?.components) {
      const newForm = { ...form };
      initialData.components.forEach((comp: any) => {
        if (comp.type === "HEADER") {
          newForm.headerFormat = comp.format || "NONE";
          if (comp.format === "TEXT") newForm.headerText = comp.text || "";
          if (comp.example?.header_handle?.[0]) newForm.headerMediaUrl = comp.example.header_handle[0];
        }
        if (comp.type === "BODY") {
          newForm.bodyText = comp.text || "";
          // 🔥 NAYA: existing template se saved examples wapas load karo
          const savedExamples = comp.example?.body_text?.[0];
          if (savedExamples?.length) {
            const varNums = extractVariableNumbers(comp.text || "");
            const exampleMap: Record<number, string> = {};
            varNums.forEach((n, i) => { exampleMap[n] = savedExamples[i] || ""; });
            newForm.bodyExamples = exampleMap;
          }
        }
        if (comp.type === "FOOTER") newForm.footerText = comp.text || "";
        if (comp.type === "BUTTONS" && comp.buttons) {
          newForm.buttons = comp.buttons.map((btn: any) => ({
            id: uid(),
            type: btn.type,
            text: btn.text,
            url: btn.url,
            phone_number: btn.phone_number,
          }));
        }
      });
      setForm(newForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const variableNumbers = useMemo(() => extractVariableNumbers(form.bodyText), [form.bodyText]);
  const payload = useMemo(() => buildPayload(form, variableNumbers), [form, variableNumbers]);
  const validation = useMemo<ValidationResult>(() => validateTemplate(payload), [payload]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setExample = useCallback((varNum: number, value: string) => {
    setForm((prev) => ({ ...prev, bodyExamples: { ...prev.bodyExamples, [varNum]: value } }));
  }, []);

  const addButton = (type: ButtonDraft["type"]) => {
    const qr = form.buttons.filter((b) => b.type === ButtonType.QUICK_REPLY).length;
    const url = form.buttons.filter((b) => b.type === ButtonType.URL).length;
    const phone = form.buttons.filter((b) => b.type === ButtonType.PHONE_NUMBER).length;
    if (form.buttons.length >= 10) return;
    if (type === ButtonType.QUICK_REPLY && qr >= 3) return;
    if (type === ButtonType.URL && url >= 1) return;
    if (type === ButtonType.PHONE_NUMBER && phone >= 1) return;
    setForm((prev) => ({
      ...prev,
      buttons: [
        ...prev.buttons,
        {
          id: uid(),
          type,
          text: "",
          url: type === ButtonType.URL ? "https://" : undefined,
          phone_number: type === ButtonType.PHONE_NUMBER ? "+" : undefined,
        },
      ],
    }));
  };

  const removeButton = (id: string) =>
    setForm((p) => ({ ...p, buttons: p.buttons.filter((b) => b.id !== id) }));
  const updateButton = (id: string, changes: Partial<ButtonDraft>) =>
    setForm((p) => ({ ...p, buttons: p.buttons.map((b) => (b.id === id ? { ...b, ...changes } : b)) }));

  const insertVariable = () => {
    const next = variableNumbers.length > 0 ? Math.max(...variableNumbers) + 1 : 1;
    setField("bodyText", form.bodyText + `{{${next}}}`);
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;
    setIsSubmitting(true);
    try {
      await onSave(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bodyCharLimit = form.category === TemplateCategory.AUTHENTICATION ? 150 : 1024;
  const fieldError = (field: string) => validation.errors.find((e) => e.field === field)?.message;

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-gray-900 font-sans flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-800 leading-tight">
              {initialData ? "Edit Template" : "Template Builder"}
            </h1>
            <p className="text-[11px] font-medium text-gray-500">WhatsApp Cloud API · Meta Business</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            validation.isValid
              ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${validation.isValid ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
            {validation.isValid ? "Valid" : `${validation.errors.length} Errors`}
          </div>

          <button
            onClick={() => setShowMobilePreview(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 transition"
          >
            <Smartphone className="w-4 h-4" />
            Preview
          </button>

          <button
            onClick={handleSubmit}
            disabled={!validation.isValid || isSubmitting}
            className={`flex items-center gap-2 px-4 lg:px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
              validation.isValid && !isSubmitting
                ? "bg-[#25D366] hover:bg-[#1DA851] text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isSubmitting ? "Saving..." : initialData ? "Update" : "Save & Submit"}
            </span>
            <span className="sm:hidden">{isSubmitting ? "..." : "Save"}</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-5 pb-20">

          {/* Identity */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#25D366]" /> Identity
            </h2>
            <div className="mb-4">
              <label className="flex justify-between text-[12px] font-bold text-gray-700 mb-1.5">
                Template Name{" "}
                <span className="text-gray-400 font-normal">{form.name.length}/512</span>
              </label>
              <input
                className={InputCls}
                placeholder="e.g. order_confirmation"
                value={form.name}
                onChange={(e) => setField("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              />
              {fieldError("name") ? (
                <p className="text-red-500 text-xs mt-1 font-medium">{fieldError("name")}</p>
              ) : (
                <p className="text-gray-400 text-[11px] mt-1">Lowercase, numbers, underscores only.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-bold text-gray-700 mb-1.5 block">Category</label>
                <select
                  className={InputCls}
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value as TemplateCategory)}
                >
                  {Object.values(TemplateCategory).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold text-gray-700 mb-1.5 block">Language (Strict Meta Code)</label>
                <select
                  className={InputCls}
                  value={form.language}
                  onChange={(e) => setField("language", e.target.value)}
                >
                  {Object.entries(TemplateLanguage).map(([k, v]) => (
                    <option key={v} value={v}>{k.replace(/_/g, " ")} ({v})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#25D366]" /> Header{" "}
              <span className="normal-case font-medium text-gray-400 tracking-normal">(Optional)</span>
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {(["NONE", ...Object.values(HeaderFormat)] as string[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setField("headerFormat", fmt as FormState["headerFormat"])}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    form.headerFormat === fmt
                      ? "bg-[#ECFDF5] border-[#25D366] text-[#065F46]"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-[#25D366]"
                  }`}
                >
                  {fmt === "NONE" ? "None" :
                   fmt === HeaderFormat.TEXT ? <><Type className="w-3.5 h-3.5" /> Text</> :
                   fmt === HeaderFormat.IMAGE ? <><ImageIcon className="w-3.5 h-3.5" /> Image</> :
                   fmt === HeaderFormat.VIDEO ? <><Video className="w-3.5 h-3.5" /> Video</> :
                   fmt === HeaderFormat.DOCUMENT ? <><FileText className="w-3.5 h-3.5" /> Document</> :
                   <><MapPin className="w-3.5 h-3.5" /> Location</>}
                </button>
              ))}
            </div>
            {form.headerFormat === HeaderFormat.TEXT && (
              <div>
                <label className="flex justify-between text-[12px] font-bold text-gray-700 mb-1.5">
                  Header Text <span className="text-gray-400 font-normal">{form.headerText.length}/60</span>
                </label>
                <input
                  className={InputCls}
                  placeholder="Enter header text…"
                  value={form.headerText}
                  onChange={(e) => setField("headerText", e.target.value)}
                  maxLength={60}
                />
              </div>
            )}
            {form.headerFormat !== "NONE" && form.headerFormat !== HeaderFormat.TEXT && (
              <MediaUploader
                format={form.headerFormat as HeaderFormat}
                onUpload={(url) => setField("headerMediaUrl", url)}
                currentUrl={form.headerMediaUrl}
              />
            )}
          </div>

          {/* Body */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <Type className="w-4 h-4 text-[#25D366]" /> Message Body
            </h2>

            <div className="mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#166534] leading-relaxed">
                <span className="font-bold">Meta Variable Rule:</span> Always use sequential variables like{" "}
                <code className="bg-white px-1 py-0.5 rounded border border-[#86EFAC] font-mono">{"{{1}}"}</code>,{" "}
                <code className="bg-white px-1 py-0.5 rounded border border-[#86EFAC] font-mono">{"{{2}}"}</code>. Do not
                skip numbers to prevent template rejection from Meta.
              </div>
            </div>

            <label className="flex justify-between text-[12px] font-bold text-gray-700 mb-1.5">
              Body Text{" "}
              <span className={`${form.bodyText.length > bodyCharLimit ? "text-red-500 font-bold" : "text-gray-400"} font-normal`}>
                {form.bodyText.length}/{bodyCharLimit}
              </span>
            </label>
            <div className="relative">
              <textarea
                className={`${InputCls} resize-none min-h-[120px]`}
                placeholder="Hi {{1}}, your order is confirmed! 🎉"
                value={form.bodyText}
                onChange={(e) => setField("bodyText", e.target.value)}
              />
              <button
                onClick={insertVariable}
                className="absolute right-2 bottom-3 px-2 py-1 text-[11px] font-bold bg-[#E8F8F5] border border-[#A7E9D1] text-[#075E54] rounded-md hover:bg-[#D1F2EB] shadow-sm"
              >
                + {"{{"}{variableNumbers.length + 1}{"}}"}
              </button>
            </div>
            {fieldError("components.BODY") && (
              <p className="text-red-500 text-xs mt-1 font-medium">{fieldError("components.BODY")}</p>
            )}

            {/* 🔥 NAYA: Variable Examples — Meta ko approval ke liye ye zaroori hai */}
            {variableNumbers.length > 0 && (
              <div className="mt-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
                <h3 className="text-[11px] font-bold text-[#92400E] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Variable Examples (Required by Meta)
                </h3>
                <p className="text-[11px] text-[#92400E]/80 mb-3">
                  Har variable ka ek sample value do — Meta yehi dekh kar template verify/approve karta hai.
                </p>
                <div className="space-y-2.5">
                  {variableNumbers.map((n) => (
                    <div key={n} className="flex items-center gap-2.5">
                      <span className="text-[12px] font-mono font-bold text-[#075E54] bg-white border border-[#A7E9D1] px-2 py-1.5 rounded-md min-w-[46px] text-center">
                        {`{{${n}}}`}
                      </span>
                      <input
                        className={InputCls}
                        placeholder={`Example: ${n === 1 ? "Rahul Sharma" : n === 2 ? "₹1,499" : "value here"}`}
                        value={form.bodyExamples[n] || ""}
                        onChange={(e) => setExample(n, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                {fieldError("components.BODY.example") && (
                  <p className="text-red-500 text-xs mt-2.5 font-medium">{fieldError("components.BODY.example")}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <PanelBottom className="w-4 h-4 text-[#25D366]" /> Footer{" "}
              <span className="normal-case font-medium text-gray-400 tracking-normal">(Optional)</span>
            </h2>
            <label className="flex justify-between text-[12px] font-bold text-gray-700 mb-1.5">
              Footer Text <span className="text-gray-400 font-normal">{form.footerText.length}/60</span>
            </label>
            <input
              className={InputCls}
              placeholder="e.g. Reply STOP to unsubscribe"
              value={form.footerText}
              onChange={(e) => setField("footerText", e.target.value)}
              maxLength={60}
            />
          </div>

          {/* Buttons */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <CornerUpLeft className="w-4 h-4 text-[#25D366]" /> Buttons{" "}
              <span className="normal-case font-medium text-gray-400 tracking-normal">(Interactive)</span>
            </h2>
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => addButton(ButtonType.QUICK_REPLY)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-[#25D366] hover:text-[#25D366] transition-all"
              >
                <CornerUpLeft className="w-3.5 h-3.5" /> Quick Reply
              </button>
              <button
                onClick={() => addButton(ButtonType.URL)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-[#25D366] hover:text-[#25D366] transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> URL / Video Link
              </button>
              <button
                onClick={() => addButton(ButtonType.PHONE_NUMBER)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-[#25D366] hover:text-[#25D366] transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </button>
            </div>
            <div className="space-y-3">
              {form.buttons.map((btn, idx) => (
                <div key={btn.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                  <button
                    onClick={() => removeButton(btn.id)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    {btn.type === ButtonType.QUICK_REPLY ? <><CornerUpLeft className="w-3.5 h-3.5" /> Quick Reply</> :
                     btn.type === ButtonType.URL ? <><ExternalLink className="w-3.5 h-3.5" /> URL / Video Action</> :
                     <><Phone className="w-3.5 h-3.5" /> Phone</>} #{idx + 1}
                  </p>
                  <div className="mb-3">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Button Text <span className="text-gray-400 font-normal">({btn.text.length}/25)</span>
                    </label>
                    <input
                      className={InputCls}
                      placeholder="Label"
                      value={btn.text}
                      onChange={(e) => updateButton(btn.id, { text: e.target.value })}
                      maxLength={25}
                    />
                  </div>
                  {btn.type === ButtonType.URL && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">URL Link (Website or Video)</label>
                      <input
                        className={InputCls}
                        value={btn.url}
                        onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                      />
                    </div>
                  )}
                  {btn.type === ButtonType.PHONE_NUMBER && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Phone (E.164 format)</label>
                      <input
                        className={InputCls}
                        value={btn.phone_number}
                        onChange={(e) => updateButton(btn.id, { phone_number: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview Panel — Desktop only */}
        <aside className="hidden lg:flex w-[400px] border-l border-gray-200 bg-white flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.02)] z-10 overflow-y-auto">
          <div className="p-6 sticky top-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[15px] font-bold text-gray-800">Live Preview</h2>
              <span className="flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" /> WhatsApp
              </span>
            </div>
            <TemplatePreview form={form} />
            <div className="mt-8 bg-[#F9FAFB] border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">API Payload Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Name</p>
                  <p className="text-[12px] font-bold text-gray-800 truncate">{form.name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Language</p>
                  <p className="text-[12px] font-bold text-gray-800">{form.language}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Category</p>
                  <p className="text-[12px] font-bold text-gray-800">{form.category}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Buttons</p>
                  <p className="text-[12px] font-bold text-gray-800">{form.buttons.length}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Mobile Preview Bottom Sheet ── */}
      {showMobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/60" onClick={() => setShowMobilePreview(false)} />
          <div className="bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#25D366]" />
                <span className="text-[14px] font-bold text-gray-800">Live Preview</span>
                <span className="flex items-center gap-1 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" /> WhatsApp
                </span>
              </div>
              <button
                onClick={() => setShowMobilePreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-col items-center py-6 px-4">
              <TemplatePreview form={form} />
              <div className="w-full max-w-[300px] mt-6 bg-[#F9FAFB] border border-gray-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Payload Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Name</p>
                    <p className="text-[12px] font-bold text-gray-800 truncate">{form.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Category</p>
                    <p className="text-[12px] font-bold text-gray-800">{form.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Language</p>
                    <p className="text-[12px] font-bold text-gray-800">{form.language}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Buttons</p>
                    <p className="text-[12px] font-bold text-gray-800">{form.buttons.length}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMobilePreview(false)}
                className="mt-5 w-full max-w-[300px] py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
