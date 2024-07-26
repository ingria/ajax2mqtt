FROM alpine:3.20 AS base

WORKDIR /app
RUN apk add --no-cache tini nodejs

# Dependencies and build
FROM base AS dependencies_and_build

COPY package*.json ./

RUN apk add --no-cache --virtual .buildtools make gcc g++ python3 linux-headers npm && \
    npm install --production --no-audit --omit=dev --no-update-notifier && \
    # Serialport needs to be rebuild for Alpine https://serialport.io/docs/9.x.x/guide-installation#alpine-linux
    npm rebuild --build-from-source && \
    apk del .buildtools

# Release
FROM base AS release

COPY --from=dependencies_and_build /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

ENV NODE_ENV=production
ENV A2M_IS_DOCKER=true

CMD [ "/sbin/tini", "--", "node", "src/index.mjs" ]
