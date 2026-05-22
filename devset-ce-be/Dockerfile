# ---- STAGE 1: protoc ----
FROM debian:13.5-slim@sha256:b6e2a152f22a40ff69d92cb397223c906017e1391a73c952b588e51af8883bf8 AS protoc

ARG PROTOC_SHA256=af27ea66cd26938fe48587804ca7d4817457a08350021a1c6e23a27ccc8c6904

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && curl -fsSL -o /tmp/protoc.zip \
       "https://github.com/protocolbuffers/protobuf/releases/download/v34.1/protoc-34.1-linux-x86_64.zip" \
    && echo "${PROTOC_SHA256}  /tmp/protoc.zip" | sha256sum -c - \
    && unzip /tmp/protoc.zip -d /opt/protoc \
    && chmod +x /opt/protoc/bin/protoc \
    && /opt/protoc/bin/protoc --version | grep -x "libprotoc 34.1" \
    && rm -rf /tmp/protoc.zip /var/lib/apt/lists/*

# ---- STAGE 2: runtime ----
FROM eclipse-temurin:25-jdk@sha256:0182539a4355ab94bf1690ae86602536d8a30486c2675ba777ccbed965e1358f

COPY --from=protoc /opt/protoc/bin/protoc /usr/local/bin/protoc
COPY --from=protoc /opt/protoc/include /usr/local/include

WORKDIR /app
COPY build/libs/devset-be-ce.jar app.jar

RUN groupadd --system app \
    && useradd --system --gid app --no-create-home --home-dir /app app \
    && mkdir -p /data \
    && chown -R app:app /data

VOLUME /data

USER app

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar", "--server.port=8082"]