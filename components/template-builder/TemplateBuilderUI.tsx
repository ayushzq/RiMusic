"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, database } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import DOMPurify from "isomorphic-dompurify";

import {
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle2,
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
  RefreshCw,
  Pencil,
  Eye,
  X,
  ImageUp,
  Paperclip,
  Smartphone,
  HelpCircle,
} from "lucide-react";

import {
  TemplateCategory,
  TemplateLanguage,
  HeaderFormat,
  ButtonType,
  CreateTemplatePayload,
  TemplateComponent,
  HeaderComponent,
  BodyComponent,
  FooterComponent,
  ButtonsComponent,
  TemplateButton,
  QuickReplyButton,
  UrlButton,
  PhoneNumberButton,
} from "../../types/template.types";

import {
  validateTemplate,
  ValidationResult,
  extractVariableNumbers,
} from "../../lib/validators/template.validator";

// ─── Local State Types ────────────────────────────────────────────────────────
interface ButtonDraft {
  id: string;
  type: ButtonType.QUICK_REPLY | ButtonType.URL | ButtonType.PHONE_NUMBER;
  text: string;
  url?: string;
  phone_number?: string;
}

interface FormState {
  name: string;
  category: TemplateCategory;
  language: string;
  headerFormat: HeaderFormat | "NONE";
  headerText: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText: string;
  buttons: ButtonDraft[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

function renderBodyWithVars(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((part, i) => {
    if (/^\{\{\d+\}\}$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-block bg-[#E8F8F5] text-[#075E54] text-[11px] font-mono px-1 rounded mx-0.5 border border-[#A7E9D1]"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function buildPayload(form: FormState): CreateTemplatePayload {
  const components: TemplateComponent[] = [];
  if (form.headerFormat !== "NONE") {
    const headerComp: any = { type: "HEADER", format: form.headerFormat as HeaderFormat };
    if (form.headerFormat === HeaderFormat.TEXT) {
      headerComp.text = form.headerText;
    } else {
      if (form.headerMediaUrl) {
        headerComp.example = { header_handle: [form.headerMediaUrl] };
      }
    }
    components.push(headerComp as HeaderComponent);
  }
  components.push({ type: "BODY", text: form.bodyText } as BodyComponent);
  if (form.footerText.trim()) {
    components.push({ type: "FOOTER", text: form.footerText } as FooterComponent);
  }
  if (form.buttons.length > 0) {
    const buttons: TemplateButton[] = form.buttons.map((b) => {
      if (b.type === ButtonType.QUICK_REPLY)
        return { type: ButtonType.QUICK_REPLY, text: b.text } as QuickReplyButton;
      if (b.type === ButtonType.URL)
        return { type: ButtonType.URL, text: b.text, url: b.url ?? "" } as UrlButton;
      return {
        type: ButtonType.PHONE_NUMBER,
        text: b.text,
        phone_number: b.phone_number ?? "",
      } as PhoneNumberButton;
    });
    components.push({ type: "BUTTONS", buttons } as ButtonsComponent);
  }
  return {
    name: form.name,
    category: form.category,
    language: form.language,
    components,
  };
}

const InputCls =
  "w-full bg-[#F9FAFB] border border-[#E5E7EB] text-gray-800 text-[13px] rounded-lg px-3 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] transition-all font-sans shadow-sm";

// ─── Cloudinary Media Uploader ────────────────────────────────────────────────
function MediaUploader({
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
          <img src={preview} alt="Header Preview" className="w-full h-[140px] object-cover" />
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
          <video src={preview} className="w-full h-[140px] object-cover" controls />
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

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
function PhoneMockup({ form }: { form: FormState }) {
  const hasButtons = form.buttons.length > 0;

  const renderHeader = () => {
    if (form.headerFormat === "NONE" || !form.headerFormat) return null;
    if (form.headerFormat === HeaderFormat.TEXT) {
      if (!form.headerText) return null;
      return <p className="font-bold text-[13px] text-[#111b21] mb-1.5">{form.headerText}</p>;
    }
    if (form.headerFormat === HeaderFormat.IMAGE && form.headerMediaUrl) {
      return (
        <div className="w-full h-[140px] rounded-lg mb-2 overflow-hidden">
          <img src={form.headerMediaUrl} alt="Header" className="w-full h-full object-cover" />
        </div>
      );
    }
    if (form.headerFormat === HeaderFormat.VIDEO && form.headerMediaUrl) {
      return (
        <div className="w-full h-[140px] rounded-lg mb-2 overflow-hidden bg-black">
          <video src={form.headerMediaUrl} className="w-full h-full object-cover" controls />
        </div>
      );
    }
    if (form.headerFormat === HeaderFormat.DOCUMENT && form.headerMediaUrl) {
      return (
        <div className="w-full bg-gray-50 rounded-lg mb-2 p-3 flex items-center gap-2 border border-gray-100">
          <FileText className="w-6 h-6 text-[#25D366]" />
          <span className="text-[11px] font-medium text-gray-600 truncate">Document</span>
        </div>
      );
    }
    const iconMap = {
      [HeaderFormat.IMAGE]: <ImageIcon className="w-8 h-8 text-gray-400" />,
      [HeaderFormat.VIDEO]: <Video className="w-8 h-8 text-gray-400" />,
      [HeaderFormat.DOCUMENT]: <FileText className="w-8 h-8 text-gray-400" />,
      [HeaderFormat.LOCATION]: <MapPin className="w-8 h-8 text-gray-400" />,
    };
    return (
      <div className="w-full h-[110px] bg-[#E1E8ED] rounded-lg mb-2 flex flex-col items-center justify-center gap-1.5 shadow-inner">
        {iconMap[form.headerFormat as keyof typeof iconMap]}
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          {form.headerFormat} MEDIA
        </span>
      </div>
    );
  };

  return (
    <div className="relative mx-auto w-[270px] flex-shrink-0">
      <div className="bg-[#1C1C1E] rounded-[45px] p-2.5 shadow-2xl shadow-gray-300/50 border-[3px] border-[#3A3A3C] ring-[1px] ring-gray-200">
        <div className="bg-[#EFEAE2] relative w-full h-[560px] rounded-[36px] overflow-hidden flex flex-col border-[4px] border-black">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-b-[18px] z-20 flex justify-center items-center">
            <div className="w-[40px] h-[5px] bg-gray-800 rounded-full" />
          </div>
          <div className="bg-[#075E54] pt-[30px] pb-2 px-4 flex items-center gap-2.5 z-10 shadow-md">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight">
                {form.name ? form.name.replace(/_/g, " ") : "BaseKey Bot"}
              </p>
              <p className="text-[10px] text-green-100 font-medium tracking-wide">online</p>
            </div>
          </div>
          <div className="flex-1 px-3 py-4 bg-[url('https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-light-pattern-texture.jpg')] bg-cover bg-center overflow-y-auto">
            {form.bodyText || form.headerFormat !== "NONE" || form.footerText ? (
              <div className="w-[210px] flex flex-col">
                <div className="bg-white rounded-xl rounded-tl-none shadow-sm overflow-hidden">
                  <div className="px-2.5 pt-2.5 pb-1">
                    {renderHeader()}
                    {form.bodyText ? (
                      <p className="text-[13.5px] text-[#111b21] leading-[19px] whitespace-pre-wrap break-words font-normal">
                        {renderBodyWithVars(form.bodyText)}
                      </p>
                    ) : (
                      <p className="text-[13.5px] text-gray-400 italic">Body message...</p>
                    )}
                    {form.footerText && (
                      <p className="mt-2 text-[11px] text-[#667781] leading-tight">{form.footerText}</p>
                    )}
                    <div className="flex justify-end items-center mt-1 pb-1">
                      <span className="text-[10px] text-[#667781] mr-1">10:30 AM</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#53bdeb]" />
                    </div>
                  </div>
                  {hasButtons && (
                    <div className="border-t border-gray-200 bg-white">
                      {form.buttons.map((btn, i) => (
                        <div
                          key={btn.id}
                          className={`flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium text-[#00A884] cursor-pointer active:bg-gray-50 ${
                            i < form.buttons.length - 1 ? "border-b border-gray-100" : ""
                          }`}
                        >
                          {btn.type === ButtonType.QUICK_REPLY && <CornerUpLeft className="w-4 h-4" strokeWidth={2.5} />}
                          {btn.type === ButtonType.URL && <ExternalLink className="w-4 h-4" strokeWidth={2.5} />}
                          {btn.type === ButtonType.PHONE_NUMBER && <Phone className="w-4 h-4" strokeWidth={2.5} />}
                          {btn.text || "Action Button"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="bg-[#FFF3C7] text-gray-600 text-[11px] px-3 py-1.5 rounded-lg shadow-sm text-center">
                  Messages to this chat are secured with end-to-end encryption.
                </span>
              </div>
            )}
          </div>
          <div className="bg-[#F0F0F0] px-3 py-2 pb-5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-gray-500 text-lg">+</div>
            <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs text-gray-400 shadow-sm">
              Message
            </div>
            <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white shadow-sm">
              <Send className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template View Modal ──────────────────────────────────────────────────────
function TemplateViewModal({ template, onClose }: { template: any; onClose: () => void }) {
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
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getStatusColor(template.status)}`}>
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
                  <p className="text-xs text-gray-500 mb-1">Format: <span className="font-semibold text-gray-700">{comp.format}</span></p>
                  {comp.format === "TEXT" && comp.text && <p className="text-sm font-bold text-gray-800">{comp.text}</p>}
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
              {comp.type === "BODY" && comp.text && <p className="text-sm text-gray-800 whitespace-pre-wrap">{comp.text}</p>}
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

// ─── Create / Edit Form ───────────────────────────────────────────────────────
function CreateTemplateForm({
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
  });

  const [showMobilePreview, setShowMobilePreview] = useState(false);

  useEffect(() => {
    if (initialData?.components) {
      const newForm = { ...form };
      initialData.components.forEach((comp: any) => {
        if (comp.type === "HEADER") {
          newForm.headerFormat = comp.format || "NONE";
          if (comp.format === "TEXT") newForm.headerText = comp.text || "";
          if (comp.example?.header_handle?.[0]) newForm.headerMediaUrl = comp.example.header_handle[0];
        }
        if (comp.type === "BODY") newForm.bodyText = comp.text || "";
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
  }, [initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const payload = useMemo(() => buildPayload(form), [form]);
  const validation = useMemo<ValidationResult>(() => validateTemplate(payload), [payload]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    const vars = extractVariableNumbers(form.bodyText);
    const next = vars.length > 0 ? Math.max(...vars) + 1 : 1;
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
            
            {/* Meta Variable Instruction Box */}
            <div className="mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#166534] leading-relaxed">
                <span className="font-bold">Meta Variable Rule:</span> Always use sequential variables like <code className="bg-white px-1 py-0.5 rounded border border-[#86EFAC] font-mono">&#123;&#123;1&#125;&#125;</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#86EFAC] font-mono">&#123;&#123;2&#125;&#125;</code>. Do not skip numbers (e.g. going from 1 to 3) to prevent template rejection from Meta.
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
                + {"{{"}{extractVariableNumbers(form.bodyText).length + 1}{"}}"}
              </button>
            </div>
            {fieldError("components.BODY") && (
              <p className="text-red-500 text-xs mt-1 font-medium">{fieldError("components.BODY")}</p>
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
            <PhoneMockup form={form} />
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
          <div
            className="flex-1 bg-black/60"
            onClick={() => setShowMobilePreview(false)}
          />
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
              <PhoneMockup form={form} />
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

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function TemplateBuilderUI() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = searchParams.get("step") || "list";

  const [wabaId, setWabaId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [viewTemplate, setViewTemplate] = useState<any>(null);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Firebase config sync (Token & WABA ID fetched securely from user config node)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const configRef = ref(database, `users/${currentUser.uid}/config`);
        onValue(configRef, (snapshot) => {
          if (snapshot.exists() && snapshot.val().isMatched) {
            setWabaId(snapshot.val().wabaId);
            setAccessToken(snapshot.val().accessToken);
          } else {
            setErrorMsg("Please link your Meta API credentials in Settings first.");
            setLoading(false);
          }
        });
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchTemplates = useCallback(async () => {
    if (!wabaId || !accessToken) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const result = await response.json();
      if (result.data) {
        setTemplates(result.data);
      } else if (result.error) {
        setErrorMsg(result.error.message);
      }
    } catch {
      setErrorMsg("Failed to connect to Meta servers.");
    } finally {
      setLoading(false);
    }
  }, [wabaId, accessToken]);

  useEffect(() => {
    if (currentStep === "list" && wabaId && accessToken) {
      fetchTemplates();
    }
  }, [currentStep, wabaId, accessToken, fetchTemplates]);

  const handleSaveTemplateToMeta = async (payload: CreateTemplatePayload) => {
    if (!wabaId || !accessToken) return;
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (data.error) {
        alert("Meta Error: " + data.error.message);
      } else {
        alert("Template successfully submitted to Meta!");
        router.back();
      }
    } catch {
      alert("Network Error: Failed to submit template.");
    }
  };

  const handleEditTemplate = async (payload: CreateTemplatePayload) => {
    if (!wabaId || !accessToken || !editTemplate) return;
    try {
      await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTemplate.name }),
      });
      const createResponse = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await createResponse.json();
      if (data.error) {
        alert("Meta Error: " + data.error.message);
      } else {
        alert("Template successfully updated!");
        setEditTemplate(null);
        fetchTemplates();
      }
    } catch {
      alert("Network Error: Failed to update template.");
    }
  };

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

  if (editTemplate) {
    return (
      <CreateTemplateForm
        onSave={handleEditTemplate}
        onBack={() => setEditTemplate(null)}
        initialData={editTemplate}
      />
    );
  }

  if (currentStep === "create") {
    return <CreateTemplateForm onSave={handleSaveTemplateToMeta} onBack={() => router.back()} />;
  }

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
            onClick={fetchTemplates}
            disabled={!wabaId || loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 transition"
            title="Sync from Meta"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && wabaId ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={() => router.push("?step=create")}
            disabled={!wabaId}
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
              onClick={() => router.push("?step=create")}
              disabled={!wabaId}
              className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl: any) => (
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
                    onClick={() => setEditTemplate(tpl)}
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
