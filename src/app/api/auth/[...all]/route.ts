import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth/better-auth";

// Better Auth handler (allowlisted in the authz scan: it authenticates requests itself).
// Created lazily so `next build` does not need auth secrets to collect page data.
let handler: ReturnType<typeof toNextJsHandler> | undefined;
const getHandler = () => (handler ??= toNextJsHandler(getAuth()));

export async function GET(request: Request) {
  return getHandler().GET(request);
}

export async function POST(request: Request) {
  return getHandler().POST(request);
}
