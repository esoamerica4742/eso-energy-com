import { createAPIFileRoute } from "@tanstack/react-start/api";
import { handleEnodeApiRequest } from "@/lib/enode-server/router";

/** POST /api/enode/link-session — OAuth link session for Enode Connect overlay. */
export const APIRoute = createAPIFileRoute("/api/enode/link-session")({
  POST: ({ request }) => {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/link-session$/, "/link");
    return handleEnodeApiRequest(
      new Request(url.toString(), {
        method: "POST",
        headers: request.headers,
        body: request.body,
      }),
    );
  },
  OPTIONS: ({ request }) => handleEnodeApiRequest(request),
});
