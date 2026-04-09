import * as z from "zod";

export const githubRepoApiItemSchema = z.object({
  name: z.string(),
  html_url: z.string().url(),
  fork: z.boolean(),
  archived: z.boolean(),
  private: z.boolean(),
});

export const githubRepoApiResponseSchema = z.array(githubRepoApiItemSchema);

export const githubRepoListItemSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

export const githubRepoListResponseSchema = z.object({
  repos: z.array(githubRepoListItemSchema),
  error: z.string().optional(),
});
