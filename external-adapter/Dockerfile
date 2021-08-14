FROM node:12.22.4-alpine3.12

ADD ./external-adapter /app
ADD ./tsconfig.json /app/tsconfig.json
WORKDIR /app
RUN rm -rf node_modules && \
    yarn install && \
    yarn build && \
    rm -rf node_modules && \
    yarn install --production

ENTRYPOINT ["node", "/app/dist/index.js"]
