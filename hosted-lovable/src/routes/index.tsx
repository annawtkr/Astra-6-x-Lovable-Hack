import { createFileRoute } from "@tanstack/react-router";
import Studio from "@/components/Studio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iYap — Your thoughts. Clearly expressed." },
      {
        name: "description",
        content:
          "iYap turns a voice note or transcript into a source-backed brief and faithful X, thread and LinkedIn drafts. Demo publishing only.",
      },
      { property: "og:title", content: "iYap — Your thoughts. Clearly expressed." },
      {
        property: "og:description",
        content: "Voice note → reviewed meaning → fidelity-checked social drafts. Nothing is ever posted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});
