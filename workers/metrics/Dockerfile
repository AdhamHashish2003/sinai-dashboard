# Shared Dockerfile template for LaunchForge Python workers.
#
# Railway auto-detects Python projects via Nixpacks when a requirements.txt
# exists at the service root, so this file is usually unnecessary. Include it
# here as a canonical reference: if you need to override Railway's default
# build (e.g., pin a specific Python version or add system deps), copy this
# file into the worker dir as `Dockerfile` and Railway will use it instead.
#
# Build command per service:  docker build -f Dockerfile -t <worker> .
# Run command per service:    python main.py
#
FROM python:3.11-slim

WORKDIR /app

# System deps — needed only if a worker pulls in libs requiring compilation.
# asyncpg and httpx both ship wheels, so nothing is strictly required here.
# Uncomment if a worker ever adds a compiled dep:
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential \
#   && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
