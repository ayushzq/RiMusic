"use client";

// 🔥 UPDATE: Firebase (auth + realtime database) poori tarah hata diya gaya hai.
// Auth ab NextAuth se (jaisa /chat page mein hai), aur Meta credentials
// (accessToken/businessAccountId) ab Prisma (Neon Postgres) ke SystemSettings
// table se, server-side API route (/api/whatsapp/templates) ke zariye aate hain —
// isliye access token kabhi browser mein expose nahi hota (Firebase version se
// zyada secure).

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { CreateTemplatePayload, MetaTemplateRecord } from "../../types/template.types";
import TemplateList from "./TemplateList";
import CreateTemplateForm from "./CreateTemplateForm";

export default function TemplateBuilderUI() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = searchParams.get("step") || "list";

  const { data: session, status } = useSession();

  const [templates, setTemplates] = useState<MetaTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [editTemplate, setEditTemplate] = useState<MetaTemplateRecord | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ─── Fetch templates (server-side, Neon-backed) ─────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/whatsapp/templates");
      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || "Failed to fetch templates.");
        setTemplates([]);
      } else {
        setTemplates(result.templates || []);
      }
    } catch {
      setErrorMsg("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && currentStep === "list") {
      fetchTemplates();
    }
  }, [status, currentStep, fetchTemplates]);

  // ─── Create ──────────────────────────────────────────────────────────────
  const handleSaveTemplateToMeta = async (payload: CreateTemplatePayload) => {
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Meta Error: " + data.error);
      } else {
        alert("Template successfully submitted to Meta!");
        router.push("?step=list");
      }
    } catch {
      alert("Network Error: Failed to submit template.");
    }
  };

  // ─── Edit (delete + recreate, Meta ka standard tareeka) ──────────────────
  const handleEditTemplate = async (payload: CreateTemplatePayload) => {
    if (!editTemplate) return;
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: editTemplate.name, payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Meta Error: " + data.error);
      } else {
        alert("Template successfully updated!");
        setEditTemplate(null);
        fetchTemplates();
      }
    } catch {
      alert("Network Error: Failed to update template.");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading...
      </div>
    );
  }

  if (!session?.user) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Please log in.</div>;
  }

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
    return <CreateTemplateForm onSave={handleSaveTemplateToMeta} onBack={() => router.push("?step=list")} />;
  }

  return (
    <TemplateList
      templates={templates}
      loading={loading}
      errorMsg={errorMsg}
      onSync={fetchTemplates}
      onCreateNew={() => router.push("?step=create")}
      onEdit={(tpl) => setEditTemplate(tpl)}
    />
  );
}
