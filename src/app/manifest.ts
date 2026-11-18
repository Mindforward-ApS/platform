import type { MetadataRoute } from "next";

// "Føj til hjemmeskærm" / "Føj til Dock": the platform opens as its own app with the Mindforward brain.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mindforward",
    short_name: "Mindforward",
    start_url: "/",
    display: "standalone",
    background_color: "#201613",
    theme_color: "#201613",
    lang: "da",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
