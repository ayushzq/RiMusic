/**
 * lib/chatLogic.ts
 * ─────────────────────────────────────────────────────────────────────────
 * LAYER 1 — SERVICE / UTILITY LAYER (PRISMA + NEON VERSION)
 *
 * FIREBASE REMOVED ❌
 * META API DIRECT CLIENT CALLS REMOVED ❌ (Ab ye Next.js API / server-side se honge)
 * 
 * WHAT LIVES HERE NOW ✅:
 *   1. Prisma ke hisaab se TypeScript Types (Contact, ChatMessage, etc.)
 *   2. Cloudinary Media Uploader (Direct frontend se upload fast hota hai)
 *   3. Formatters (Time, Bytes, etc.)
 *   4. Secure API Calls to Next.js Backend (No tokens exposed!)
 * ─────────────────────────────────────────────────────────────────────────
 */

import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────
// 1. TYPES (Strictly mapped to your Prisma Schema)
// ─────────────────────────────────────────────────────────────────────────

export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT"
  | "AUDIO"
  | "LOCATION"
  | "TEMPLATE"
  | "INTERACTIVE"
  | "STICKER";

export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface ChatMessage {
  id: string;
  contactId: string;
  senderId?: string | null;
  body: string;
  type: MessageType;
  direction: MessageDirection;
  status: MessageStatus;
  mediaUrl?: string | null;
  replyTo?: string | null;
  timestamp: string | Date; 
}

export interface Contact {
  id: string;
  phoneNumber: string;
  name?: string | null;
  email?: string | null;
  unreadCount: number;
  lastMessageAt: string | Date;
  isSessionActive: boolean;
  assignedToId?: string | null;
}

export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components?: any[];
}

// ─────────────────────────────────────────────────────────────────────────
// 2. UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────

export function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. CLOUDINARY (Media Uploads remain on the client for speed)
// ─────────────────────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  secureUrl: string;
  bytes: number;
  format: string;
}

export async function uploadToCloudinary(
  file: File,
  cloudName: string,
  uploadPreset: string
): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  try {
    const { data } = await axios.post(url, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return {
      secureUrl: data.secure_url,
      bytes: data.bytes,
      format: data.format,
    };
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error("Failed to upload media to Cloudinary");
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. CLIENT-SIDE API CALLS (Talking to your secure Next.js Backend)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fetch WhatsApp Config (Phone ID, etc.) from Backend
 * API route ab tumhare `SystemSettings` table se data layega
 */
export async function getUserConfig(uid?: string) {
  try {
    // Backend API par request (Token backend hi handle karega)
    const res = await axios.get('/api/settings');
    return res.data;
  } catch (error) {
    console.error("Failed to fetch user config from backend:", error);
    return null; // Crash hone se bachane ke liye null return
  }
}

/**
 * Fetch WhatsApp Templates from Backend
 * Frontend se wabaId ya token bhejne ki zaroorat nahi hai
 */
export async function fetchMetaTemplates(wabaId?: string, accessToken?: string) {
  try {
    // Backend DB se user/system config nikal kar Meta se templates layega
    const res = await axios.get('/api/whatsapp/templates');
    return res.data.templates || [];
  } catch (error) {
    console.error("Failed to fetch templates from backend:", error);
    return [];
  }
}
