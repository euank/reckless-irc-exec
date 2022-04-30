FROM node:buster

RUN mkdir -p /home/node/app

COPY bot.js /home/node/app
COPY config.js /home/node/app
COPY package.json /home/node/app

WORKDIR /home/node/app
RUN npm install

RUN apt-get update && apt-get install -y ruby ddate
CMD ["npm", "start"]
