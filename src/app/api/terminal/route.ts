import { NextResponse } from "next/server";
import { DESKTOP, runSafeCommand } from "@/features/home/terminal-safe-mode";

type SessionState = {
  cwd: string;
  updatedAt: number;
};

const SESSION_TTL_MS = 1000 * 60 * 30;
const sessionCwd = new Map<string, SessionState>();

type TerminalRequest = {
  sessionId: string;
  command: string;
};

const purgeExpiredSessions = (now: number) => {
  for (const [sessionId, state] of sessionCwd.entries()) {
    if (now - state.updatedAt > SESSION_TTL_MS) {
      sessionCwd.delete(sessionId);
    }
  }
};

export async function POST(request: Request) {
  try {
    const now = Date.now();
    purgeExpiredSessions(now);
    const body = (await request.json()) as Partial<TerminalRequest>;
    const sessionId = body.sessionId?.trim();
    const command = body.command?.trim();

    if (!sessionId || !command) {
      return NextResponse.json({ error: "Missing sessionId or command." }, { status: 400 });
    }

    const cwd = sessionCwd.get(sessionId)?.cwd ?? DESKTOP;
    const result = runSafeCommand(cwd, command);
    sessionCwd.set(sessionId, { cwd: result.cwd, updatedAt: now });

    return NextResponse.json({
      output: result.output,
      exitCode: result.exitCode,
      cwd: result.cwd,
      clear: "clear" in result && result.clear === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown terminal error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
