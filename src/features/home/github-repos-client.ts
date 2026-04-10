import { githubRepoListResponseSchema } from "@/features/home/github-repos-schema";
import { requestJson } from "@/features/home/api-client";
import type { GithubRepo } from "@/features/home/types";

type LoadGithubReposResult =
  | { success: true; repos: GithubRepo[] }
  | { success: false; error: string };

export const loadGithubRepos = async (): Promise<LoadGithubReposResult> => {
  const result = await requestJson({
    input: "/api/github-repos",
    parse: (json) => {
      const parsed = githubRepoListResponseSchema.safeParse(json);
      if (!parsed.success) {
        return { success: false };
      }
      return { success: true, data: parsed.data };
    },
    invalidMessage: "Invalid response format.",
    fallbackError: "Failed to load repositories.",
  });
  if (!result.success) {
    return result;
  }
  return { success: true, repos: result.data.repos };
};
