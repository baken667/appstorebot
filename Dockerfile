FROM node:20.14.0-alpine

WORKDIR /app

COPY . .

RUN npm install -g npm@latest
RUN npm install
RUN npm run build
RUN npm run migrate

CMD [ "npm", "run", "start" ]