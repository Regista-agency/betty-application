# ---------- Stage 1: build React frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package.json ./
COPY frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
# Empty REACT_APP_BACKEND_URL -> frontend uses relative /api paths (same origin)
ENV REACT_APP_BACKEND_URL=""
RUN npm run build


# ---------- Stage 2: Python backend + static frontend ----------
FROM python:3.11-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FRONTEND_BUILD_DIR=/app/frontend_build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip \
 && pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ \
      -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-build /frontend/build/ /app/frontend_build/

WORKDIR /app/backend

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:8001/api/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
