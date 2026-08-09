// lib/whatsapp/sender.ts
import { db } from "@/prisma/lib/db"; 

export async function sendWhatsAppMessage(phoneId: string, to: string, payload: any) {
  const settings = await db.systemSettings.findUnique({ where: { id: "main_settings" } });
  if (!settings?.accessToken) throw new Error("WhatsApp access token not configured");

  const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });

  if (!res.ok) {
    console.error("Meta send failed:", await res.text());
  }
  return res.json();
}
