FROM alpine:3.19.1 as base

WORKDIR /app
RUN apk add --no-cache tini nodejs

# Dependencies and build
FROM base as dependencies_and_build

COPY package*.json ./

RUN apk add --no-cache --virtual .buildtools make gcc g++ python3 linux-headers git npm && \
    npm ci --production --no-audit --omit=dev --no-update-notifier && \
    # Serialport needs to be rebuild for Alpine https://serialport.io/docs/9.x.x/guide-installation#alpine-linux
    npm rebuild --build-from-source && \
    apk del .buildtools

# Release
FROM base as release

COPY --from=dependencies_and_build /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

ENV NODE_ENV production

CMD [ "/sbin/tini", "--", "node", "src/index.mjs" ]
