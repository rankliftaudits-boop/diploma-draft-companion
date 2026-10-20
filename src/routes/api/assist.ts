import { createFileRoute } from "@tanstack/react-router";
import { handleAssist } from "@/lib/ai/assist.server";

export const Route = createFileRoute("/api/assist")({
  server: {
    handlers: {
      POST: ({ request }) => handleAssist(request),
    },
  },
});
