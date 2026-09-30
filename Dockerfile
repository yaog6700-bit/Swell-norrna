# ─────────────────────────────────────────────────────────────────────────────
# Build Rust backend
# ─────────────────────────────────────────────────────────────────────────────
FROM rust:1.82-alpine AS rust-builder

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

WORKDIR /app
COPY Cargo.toml ./
COPY crates/ ./crates/
COPY scripts/ ./scripts/

RUN cargo build --release -p norrna-manager

# ─────────────────────────────────────────────────────────────────────────────
# Final slim image
# ─────────────────────────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=rust-builder /app/target/release/norrna-manager ./norrna-manager

# Frontend dist is COPIED IN by CI (pre-built by Actions, extracted before docker build)
COPY web/dist ./dist

RUN mkdir -p /data

EXPOSE 9000 9001

ENV WEBPORT=9000
ENV AGENTPORT=9001

CMD ["/app/norrna-manager", "--webport", "9000", "--agentport", "9001", "--data", "/data"]