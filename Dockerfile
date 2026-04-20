# ----- Build stage -----
FROM golang:1.22-alpine AS builder

WORKDIR /src

# 依赖预下载
COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://proxy.golang.org,direct \
    && go mod download

# 源码 & 编译
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/wiki-service .

# ----- Runtime stage -----
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && update-ca-certificates

WORKDIR /app
COPY --from=builder /out/wiki-service /app/wiki-service

ENV TZ=Asia/Shanghai \
    GIN_MODE=release \
    LISTEN_ADDR=:8090 \
    DB_PATH=/app/data/botc.db

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8090

ENTRYPOINT ["/app/wiki-service"]
