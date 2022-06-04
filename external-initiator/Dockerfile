FROM node:erbium-alpine3.12

ADD ./external-initiator /app
ADD ./tsconfig.json /app/tsconfig.json
WORKDIR /app
RUN rm -rf node_modules && \
    yarn install && \
    yarn build && \
    rm -rf node_modules && \
    yarn install --production

ENTRYPOINT ["node", "/app/dist/index.js"]
