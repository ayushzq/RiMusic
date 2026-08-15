import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// ⚠️ Adjust this import to match your actual NextAuth config file/path
// (e.g. "@/lib/auth", "@/app/api/auth/[...nextauth]/route", etc.)
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

const META_API_VERSION = "v21.0";

async function getMetaCredentials() {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "main_settings" },
  });

  if (!settings || !settings.businessAccountId || !settings.accessToken) {
    return null;
  }

  return {
    wabaId: settings.businessAccountId,
    accessToken: settings.accessToken,
  };
}

// ─── GET: List templates ────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getMetaCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Please link your Meta API credentials in Settings first." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${creds.wabaId}/message_templates?limit=100`,
      { headers: { Authorization: `Bearer ${creds.accessToken}` } }
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }
    return NextResponse.json({ templates: data.data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to connect to Meta servers." }, { status: 502 });
  }
}

// ─── POST: Create a new template ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getMetaCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Please link your Meta API credentials in Settings first." },
      { status: 400 }
    );
  }

  try {
    const payload = await req.json();
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${creds.wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    // Local record bhi save kar lo (history/backup ke liye) — best-effort, fail-safe
    try {
      await prisma.template.upsert({
        where: { name: payload.name },
        create: {
          name: payload.name,
          language: payload.language,
          category: payload.category,
          components: payload.components,
          status: "PENDING",
        },
        update: {
          language: payload.language,
          category: payload.category,
          components: payload.components,
          status: "PENDING",
        },
      });
    } catch {
      // local mirror fail hua to bhi Meta submission successful hai — ignore
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Network error: template submit nahi ho paaya." }, { status: 502 });
  }
}

// ─── PUT: Edit a template (Meta doesn't support true edit → delete + recreate) ──
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getMetaCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Please link your Meta API credentials in Settings first." },
      { status: 400 }
    );
  }

  try {
    const { oldName, payload } = await req.json();

    await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${creds.wabaId}/message_templates?name=${encodeURIComponent(oldName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      }
    );

    const createRes = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${creds.wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await createRes.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    try {
      await prisma.template.upsert({
        where: { name: payload.name },
        create: {
          name: payload.name,
          language: payload.language,
          category: payload.category,
          components: payload.components,
          status: "PENDING",
        },
        update: {
          language: payload.language,
          category: payload.category,
          components: payload.components,
          status: "PENDING",
        },
      });
    } catch {
      // ignore local mirror failure
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Network error: template update nahi ho paaya." }, { status: 502 });
  }
}
