declare module "@tanstack/react-start/api" {
  export type ApiHandlerContext = {
    request: Request;
    params?: Record<string, string>;
  };

  export type ApiHandlers = {
    GET?: (ctx: ApiHandlerContext) => Response | Promise<Response>;
    POST?: (ctx: ApiHandlerContext) => Response | Promise<Response>;
    PUT?: (ctx: ApiHandlerContext) => Response | Promise<Response>;
    PATCH?: (ctx: ApiHandlerContext) => Response | Promise<Response>;
    DELETE?: (ctx: ApiHandlerContext) => Response | Promise<Response>;
    OPTIONS?: (ctx: ApiHandlerContext) => Response | Promise<Response>;
  };

  export function createAPIFileRoute(path: string): (handlers: ApiHandlers) => ApiHandlers;
}
