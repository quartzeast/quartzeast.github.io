import { siteConfig } from "@/site.config";

/**
 * Prepends the site base path to an internal link
 * @param path - The internal path (e.g., "/posts/", "/about/")
 * @returns The path with base prefix applied
 */
export function withBase(path: string): string {
	if (siteConfig.base === "/") {
		return path;
	}
	// Remove leading slash from base for joining
	const basePath = siteConfig.base.endsWith("/") ? siteConfig.base.slice(0, -1) : siteConfig.base;
	return `${basePath}${path}`;
}
