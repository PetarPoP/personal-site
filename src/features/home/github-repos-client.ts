import { githubRepoListResponseSchema } from "@/features/home/github-repos-schema";
import type { GithubRepo } from "@/features/home/types";

type LoadGithubReposResult =
  | { success: true; repos: GithubRepo[] }
  | { success: false; error: string };

export const loadGithubRepos = async (): Promise<LoadGithubReposResult> => {
  try {
    const response = await fetch("/api/github-repos");
    const json = await response.json();
    const parsed = githubRepoListResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: "Invalid response format." };
    }
    if (!response.ok) {
      return { success: false, error: parsed.data.error ?? "Failed to load repositories." };
    }
    return { success: true, repos: parsed.data.repos };
  } catch {
    return { success: false, error: "Failed to load repositories." };
  }
};
