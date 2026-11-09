
import { NextRequest, NextResponse } from "next/server";

export function withCors(
  req: Request,
  response: NextResponse
): NextResponse {
  const origin = req.headers.get("origin");

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Vary", "Origin");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

export function corsOptions(req: Request): NextResponse {
  return withCors(
    req,
    new NextResponse(null, { status: 204 })
  );
}
