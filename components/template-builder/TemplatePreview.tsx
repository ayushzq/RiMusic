"use client";

import React from "react";
import {
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  CheckCircle2,
  CornerUpLeft,
  ExternalLink,
  Phone,
  Bot,
  Send,
} from "lucide-react";
import { HeaderFormat, ButtonType } from "../../types/template.types";
import { FormState } from "./formState";

// Body text ke andar {{1}} ko dikhata hai — agar uska example value bhara hai to
// wahi halka highlighted chip mein dikhata hai (real WhatsApp jaisa feel).
function renderBodyWithVars(text: string, examples: Record<number, string>): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{(\d+)\}\}$/);
    if (match) {
      const varNum = parseInt(match[1], 10);
      const example = examples[varNum];
      return (
        <span
          key={i}
          className="inline-block bg-[#E8F8F5] text-[#075E54] text-[11px] font-mono px-1 rounded mx-0.5 border border-[#A7E9D1]"
          title={example ? `Sample: ${example}` : "Example missing"}
        >
          {example || part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TemplatePreview({ form }: { form: FormState }) {
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
                        {renderBodyWithVars(form.bodyText, form.bodyExamples)}
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
