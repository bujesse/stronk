FROM alpine:3.22

ARG TARGETARCH

RUN apk add --no-cache ca-certificates curl jq unzip

RUN case "$TARGETARCH" in \
    amd64) PB_ARCH="linux_amd64" ;; \
    arm64) PB_ARCH="linux_arm64" ;; \
    *) echo "Unsupported arch: $TARGETARCH" && exit 1 ;; \
  esac \
  && ASSET_URL="$(curl -fsSL https://api.github.com/repos/pocketbase/pocketbase/releases/latest | jq -r --arg arch "$PB_ARCH" '.assets[] | select(.name | endswith("_" + $arch + ".zip")) | .browser_download_url' | head -n 1)" \
  && test -n "$ASSET_URL" \
  && curl -fsSL -o /tmp/pocketbase.zip "$ASSET_URL" \
  && unzip /tmp/pocketbase.zip -d /usr/local/bin \
  && chmod +x /usr/local/bin/pocketbase \
  && rm /tmp/pocketbase.zip

COPY docker/pocketbase-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /pb
EXPOSE 8090

ENTRYPOINT ["/entrypoint.sh"]
