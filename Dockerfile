FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 4300

ENV PORT=4300

CMD ["node", "dist/mini-spa/server/server.mjs"]