"""Thin proxy: forwards /api/* requests to the Next.js dev server on localhost:3000.

Purpose: Emergent Kubernetes ingress routes /api/* to port 8001 (this proxy)
and /* to port 3000 (Next.js). Since Next.js handles API routes itself on port 3000,
we proxy /api/* back to it so the dev preview works exactly like production.
"""
import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import Response
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NEXT_URL = os.environ.get("NEXT_URL", "http://localhost:3000")
app = FastAPI(title="Betty proxy")

# Reusable async client
_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup():
    global _client
    _client = httpx.AsyncClient(timeout=120, follow_redirects=False)


@app.on_event("shutdown")
async def _shutdown():
    if _client:
        await _client.aclose()


HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length",
}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(path: str, request: Request):
    url = f"{NEXT_URL}/{path}"
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    try:
        upstream = await _client.request(
            request.method,
            url,
            content=body,
            headers=headers,
            params=request.query_params,
        )
    except Exception as e:
        logger.exception("Proxy request failed")
        return Response(content=f"Proxy error: {e}".encode(), status_code=502)

    resp_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP}
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )
