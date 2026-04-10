export const ROOT = "/";
export const DESKTOP = "/Desktop";
export const PATHS = new Set<string>([
  ROOT,
  DESKTOP,
  "/Desktop/home",
  "/Desktop/computer",
  "/Desktop/text",
  "/Desktop/images",
  "/Desktop/projects",
  "/Desktop/spotify.exe",
  "/Desktop/mailer.exe",
  "/Desktop/terminal",
]);

export const LISTING: Record<string, string[]> = {
  [ROOT]: ["Desktop/"],
  [DESKTOP]: ["home/", "computer/", "text/", "images/", "projects/", "spotify.exe", "mailer.exe", "terminal"],
  "/Desktop/home": ["about-me.txt", "cv.pdf", "projects/"],
  "/Desktop/computer": ["system-info.txt"],
  "/Desktop/text": ["about-me.txt", "note-1.txt", "mailer.exe"],
  "/Desktop/images": ["profile.png", "wallpaper.png"],
  "/Desktop/projects": ["persoSite/", "portfolio-ui/"],
  "/Desktop/spotify.exe": ["README.txt"],
  "/Desktop/mailer.exe": ["README.txt"],
  "/Desktop/terminal": ["README.txt"],
};

export const normalizePath = (base: string, rawTarget: string): string => {
  const target = rawTarget.trim();
  if (!target || target === "~") {
    return DESKTOP;
  }
  if (target === "/") {
    return ROOT;
  }
  const start = target.startsWith("/") ? target : `${base}/${target}`;
  const parts = start
    .split("/")
    .filter(Boolean)
    .reduce<string[]>((acc, part) => {
      if (part === ".") {
        return acc;
      }
      if (part === "..") {
        return acc.slice(0, -1);
      }
      return [...acc, part];
    }, []);
  return `/${parts.join("/")}` || ROOT;
};

export const parseCommand = (command: string): { cmd: string; args: string[] } => {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const ch of command.trim()) {
    if ((ch === '"' || ch === "'") && !quote) {
      quote = ch;
      continue;
    }
    if (quote && ch === quote) {
      quote = null;
      continue;
    }
    if (!quote && /\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  if (tokens.length === 0) {
    return { cmd: "", args: [] };
  }
  const [cmd, ...args] = tokens;
  return { cmd, args };
};

export const runSafeCommand = (cwd: string, command: string) => {
  const parsed = parseCommand(command);
  const cmd = parsed.cmd;
  const args = parsed.args;
  const argsJoined = args.join(" ").trim();
  if (!cmd) {
    return { output: "", exitCode: 0, cwd };
  }
  if (cmd === "pwd") {
    return { output: cwd, exitCode: 0, cwd };
  }
  if (cmd === "clear" || cmd === "cls") {
    return { output: "", exitCode: 0, cwd, clear: true };
  }
  if (cmd === "cd") {
    const nextPath = normalizePath(cwd, argsJoined || "~");
    if (!PATHS.has(nextPath)) {
      return {
        output: `cd: no such file or directory: ${argsJoined || "~"}`,
        exitCode: 1,
        cwd,
      };
    }
    return { output: "", exitCode: 0, cwd: nextPath };
  }
  if (cmd === "ls") {
    const target = argsJoined ? normalizePath(cwd, argsJoined) : cwd;
    if (!PATHS.has(target)) {
      return { output: `ls: cannot access '${argsJoined}': No such file or directory`, exitCode: 1, cwd };
    }
    const entries = LISTING[target] ?? [];
    return { output: entries.join("  "), exitCode: 0, cwd };
  }
  if (cmd === "help") {
    return {
      output: "Safe terminal mode. Supported commands: ls, cd, pwd, clear, help",
      exitCode: 0,
      cwd,
    };
  }
  return {
    output: `Command blocked in safe mode: ${cmd}`,
    exitCode: 126,
    cwd,
  };
};
