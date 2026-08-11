"use client";

import React, { useState } from "react";
// 👇 YAHAN SIDEBAR IMPORT KIYA HAI
import Sidebar from "@/components/Sidebar"; 
import { HelpCircle, Search, MessageCircle, Mail, BookOpen, ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How do I sync my Google Contacts?",
    a: "Go to the Contacts page, click on 'Import Contacts', and select 'Sync Google Contacts'. Log in with your Google account to automatically fetch and save your phonebook numbers."
  },
  {
    q: "How can I upload contacts using an Excel or CSV file?",
    a: "In the Contacts page, click 'Import Contacts' and choose 'Upload CSV'. Make sure your file has the name in the first column and phone number in the second column."
  },
  {
    q: "How do WhatsApp Campaigns work?",
    a: "Campaigns allow you to broadcast approved WhatsApp templates to your synced Google or CSV contact lists in bulk with live read-rate tracking."
  },
  {
    q: "Is my data secure in Firebase?",
    a: "Yes! All contacts, message logs, and configurations are securely stored under your unique user ID in Firebase Realtime Database."
  }
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    // 👇 MAIN WRAPPER (SideBar fix rakhne ke liye)
    <div className="flex h-[100dvh] w-full bg-[#F5F7F9] overflow-hidden pb-[70px] md:pb-0 font-sans text-gray-900 relative">
      
      {/* ─── Sidebar Navigation ─── */}
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      {/* ─── Main Content Area (Scrollable) ─── */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#00A884]" />
            Help Center & Support
          </h1>
          <p className="text-sm text-gray-500 mt-1">Find answers, guides, and get in touch with our support team.</p>
        </div>

        {/* Main Content */}
        <div className="p-6 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
          
          {/* Support Banner */}
          <div className="bg-gradient-to-r from-[#075E54] to-[#00A884] rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Need direct assistance?</h2>
              <p className="text-sm text-white/80 mt-0.5">Our developer support team is available 24/7 to help you out.</p>
            </div>
            <a 
              href="mailto:support@basekey.in" 
              className="bg-white text-[#075E54] hover:bg-gray-100 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow flex items-center gap-2 shrink-0"
            >
              <Mail className="w-4 h-4" /> Contact Support
            </a>
          </div>

          {/* FAQs Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#00A884]" /> Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={index} className="border border-gray-200 rounded-xl overflow-hidden transition">
                    <button 
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-5 py-4 text-left font-bold text-gray-800 text-sm flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180 text-[#00A884]" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 py-3 text-sm text-gray-600 bg-white border-t border-gray-100 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
