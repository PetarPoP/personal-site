import { notFound } from "next/navigation";
import { HomeDesktopPage } from "@/features/home/_components/home-desktop-page";
import type { ExplorerPath } from "@/features/home/types";

type DeepLinkPageProps = {
  params: Promise<{ path: string[] }>;
};

const ALLOWED_PATHS = new Set(["home", "home/projects", "computer", "trash", "text", "images", "link/home", "link/home/projects", "link/computer", "link/trash", "link/text", "link/images"]);
const EXPLORER_PATHS = new Set<ExplorerPath>(["home", "home/projects", "computer", "trash", "text", "images"]);

export default async function DeepLinkPage({ params }: DeepLinkPageProps) {
  const resolvedParams = await params;
  const routePath = resolvedParams.path.join("/").toLowerCase();
  const normalizedPath = routePath.startsWith("link/") ? routePath.slice("link/".length) : routePath;

  if (!ALLOWED_PATHS.has(routePath)) {
    notFound();
  }

  if (!EXPLORER_PATHS.has(normalizedPath as ExplorerPath)) {
    notFound();
  }

  return <HomeDesktopPage initialExplorerPath={normalizedPath as ExplorerPath} />;
}
