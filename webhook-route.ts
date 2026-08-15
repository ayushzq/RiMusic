import { type NextRequest, NextResponse } from "next/server";
// ✅ NAYA: Firebase hata kar Prisma import kiya
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "basekey_verify_token";

// GET — Webhook verification (Meta calls this when registering webhook)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST — Receive incoming messages & status updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Process each entry
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneId = value.metadata?.phone_number_id;

        if (!phoneId) continue;

        // Handle incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(phoneId, message);
          }
        }

        // Handle status updates (sent, delivered, read)
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleStatusUpdate(phoneId, status);
          }
        }
      }
    }

    // Always return 200 quickly — Meta retries on failure
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 }); // Still return 200 to prevent retries
  }
}

async function handleIncomingMessage(phoneId: string, message: any) {
  const from = message.from; // Sender phone number (without +)
  const messageId = message.id;
  const timestamp = parseInt(message.timestamp) * 1000; // Convert to ms
  const messageType = message.type;

  let text = "";
  let mediaUrl = null;
  // ✅ NAYA: Prisma Enum ke hisaab se type map karne ke liye
  let mappedType = "TEXT"; 

  // 📝 TUMHARA PURANA LOGIC (Ekdum waise hi rakha hai)
  switch (messageType) {
    case "text":
      text = message.text?.body || "";
      mappedType = "TEXT";
      break;
    case "image":
      text = message.image?.caption || "📷 Image";
      mediaUrl = message.image?.id;
      mappedType = "IMAGE";
      break;
    case "video":
      text = message.video?.caption || "🎥 Video";
      mediaUrl = message.video?.id;
      mappedType = "VIDEO";
      break;
    case "audio":
      text = "🎵 Audio message";
      mediaUrl = message.audio?.id;
      mappedType = "AUDIO";
      break;
    case "document":
      text = message.document?.caption || `📄 ${message.document?.filename || "Document"}`;
      mediaUrl = message.document?.id;
      mappedType = "DOCUMENT";
      break;
    case "location":
      const loc = message.location;
      text = `📍 Location: ${loc?.latitude}, ${loc?.longitude}`;
      mappedType = "LOCATION";
      break;
    case "button":
      text = message.button?.text || "Button clicked";
      mappedType = "TEXT";
      break;
    case "interactive":
      text = message.interactive?.button_reply?.title || "Interactive response";
      mappedType = "TEXT";
      break;
    default:
      text = `📎 ${messageType} message`;
      mappedType = "TEXT";
  }

  try {
    // ✅ NAYA: Update contact info in Prisma (Database me naya user bana dega agar nahi hua toh)
    const contact = await prisma.contact.upsert({
      where: { id: from },
      update: {
        lastMessageAt: new Date(timestamp),
        unreadCount: { increment: 1 },
        isSessionActive: true,
      },
      create: {
        id: from,
        phoneNumber: from,
        name: from, // Naye number ka naam default number hi hoga
        lastMessageAt: new Date(timestamp),
        unreadCount: 1,
        isSessionActive: true,
      },
    });

    // ✅ NAYA: Save message to Prisma (Pehle Firebase me hota tha)
    await prisma.message.create({
      data: {
        id: messageId,
        contactId: contact.id,
        body: text,
        direction: "INBOUND", // Customer ne bheja hai isliye INBOUND
        type: mappedType as any,
        timestamp: new Date(timestamp),
        status: "DELIVERED",
        mediaUrl: mediaUrl,
      },
    });

    console.log(`📩 Received message from ${from}: ${text.substring(0, 50)}...`);
  } catch (error) {
    console.error("Error saving message to Prisma:", error);
  }
}

async function handleStatusUpdate(phoneId: string, status: any) {
  const messageId = status.id;
  const statusValue = status.status; // sent, delivered, read, failed
  const recipientId = status.recipient_id;

  try {
    // ✅ NAYA: Prisma me message ka status update karna (Double tick, Blue tick)
    const prismaStatus = statusValue.toUpperCase(); // Prisma ko UPPERCASE pasand hai ("SENT", "READ")
    
    await prisma.message.update({
      where: { id: messageId },
      data: { status: prismaStatus as any },
    });

    console.log(`📊 Status update: ${messageId} -> ${statusValue} for ${recipientId}`);
  } catch (error) {
    console.log(`⚠️ Status update failed (Message ${messageId} not found in DB)`);
  }
}
