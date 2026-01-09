FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src
RUN ls -a

RUN npm install && npm i -g nodemon

EXPOSE 4102

CMD [ "npm", "run" ,"dev" ]