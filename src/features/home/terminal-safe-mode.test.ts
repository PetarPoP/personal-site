import { describe, expect, it } from "vitest";
import { DESKTOP, normalizePath, parseCommand, runSafeCommand } from "./terminal-safe-mode";

describe("terminal safe mode", () => {
  it("parses quoted arguments", () => {
    expect(parseCommand('cd "home/projects"')).toEqual({
      cmd: "cd",
      args: ["home/projects"],
    });
  });

  it("normalizes relative paths", () => {
    expect(normalizePath("/Desktop/home", "../projects")).toBe("/Desktop/projects");
    expect(normalizePath("/Desktop/home", ".")).toBe("/Desktop/home");
  });

  it("lists desktop files by default", () => {
    const result = runSafeCommand(DESKTOP, "ls");
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("home/");
  });

  it("blocks unsupported commands", () => {
    const result = runSafeCommand(DESKTOP, "rm -rf /");
    expect(result.exitCode).toBe(126);
    expect(result.output).toContain("Command blocked");
  });
});
