import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { getState, mergeAndSaveState, type UserState } from "@/lib/store";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "login_required" }, { status: 401 });
  return NextResponse.json(await getState(userId));
}

/** Accepts the client's full local state; server merges (union profiles,
 * OR evidence) and returns the merged result for the client to adopt. */
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let incoming: UserState;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.profiles) || typeof parsed.evidence !== "object") {
      throw new Error("bad shape");
    }
    incoming = {
      profiles: parsed.profiles.slice(0, 50),
      evidence: parsed.evidence,
    };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  return NextResponse.json(await mergeAndSaveState(userId, incoming));
}
