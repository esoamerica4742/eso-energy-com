import { createAPIFileRoute } from "@tanstack/react-start/api";
import { handleEnodeApiRequest } from "@/lib/enode-server/router";

export const APIRoute = createAPIFileRoute("/api/enode/$")({
  GET: ({ request }) => handleEnodeApiRequest(request),
  POST: ({ request }) => handleEnodeApiRequest(request),
  OPTIONS: ({ request }) => handleEnodeApiRequest(request),
});
