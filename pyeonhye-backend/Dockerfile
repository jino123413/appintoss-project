FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json knexfile.js ./
COPY migrations ./migrations
COPY src ./src

RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npm run migrate && npm run start"]
