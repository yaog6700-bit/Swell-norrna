# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm build
# Output: /app/web/dist/


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build the Rust backend
# ─────────────────────────────────────────────────────────────────────────────
FROM rust:1.82-alpine AS rust-builder

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

WORKDIR /app
# Copy workspace files
COPY Cargo.toml ./
COPY crates/ ./crates/
COPY scripts/ ./scripts/

# Build release binary (statically linked via musl)
RUN cargo build --release -p norrna-manager
# Output: /app/target/release/norrna-manager


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Final slim runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy compiled binary
COPY --from=rust-builder /app/target/release/norrna-manager ./norrna-manager

# Copy built frontend
COPY --from=frontend-builder /app/web/dist ./dist

# Data directory (mounted as a volume for persistence)
RUN mkdir -p /data

# Ports:
#   9000 → Web management panel (HTTP)
#   9001 → Agent TCP port
EXPOSE 9000 9001

ENV WEBPORT=9000
ENV AGENTPORT=9001
ENV DATA_DIR=/data

ENTRYPOINT ["/app/norrna-manager"]
CMD ["--webport", "9000", "--agentport", "9001", "--data", "/data"]