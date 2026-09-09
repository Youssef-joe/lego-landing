# Build a fully static binary, then ship it on a scratch image with the landing page.
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY waitlist/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /waitlist .

FROM scratch
COPY --from=build /waitlist /waitlist
COPY index.html /site/index.html
COPY media /site/media
ENV ADDR=:8080 DB_PATH=/data/waitlist.jsonl STATIC_DIR=/site
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["/waitlist"]
