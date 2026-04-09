import * as z from "zod";

const serverEnvSchema = z.object({
  GITHUB_USERNAME: z.string().min(1, "GITHUB_USERNAME is required"),
  GITHUB_TOKEN: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REFRESH_TOKEN: z.string().optional(),
});

export const getServerEnv = () => serverEnvSchema.parse(process.env);
