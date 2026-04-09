import { NextResponse } from "next/server";
import * as z from "zod";

import { getServerEnv } from "@/lib/env";
import { githubRepoApiResponseSchema } from "@/features/home/github-repos-schema";

export async function GET() {
  try {
    const env = getServerEnv();
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "User-Agent": "popOS-portfolio",
    };

    if (env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    }

    const response = await fetch(
      `https://api.github.com/users/${env.GITHUB_USERNAME}/repos?sort=updated&per_page=100`,
      {
        headers,
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch GitHub repositories." }, { status: response.status });
    }

    const json = await response.json();
    const repos = githubRepoApiResponseSchema.parse(json)
      .filter((repo) => !repo.fork && !repo.archived)
      .map((repo) => ({
        name: repo.name,
        url: repo.html_url,
      }));

    return NextResponse.json({ repos });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid server env." }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error while loading repositories." }, { status: 500 });
  }
}
