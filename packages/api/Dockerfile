FROM node:14-slim as build
RUN apt-get update
RUN apt-get install -y openssl
RUN npm install -g npm@8
WORKDIR /src/app

COPY package.json ./
RUN npm install

COPY tsconfig.json .
COPY src/ src/
COPY prisma/ prisma/
COPY sentry.ts ./sentry.ts
COPY index.ts ./index.ts

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npm run prisma:migrate
RUN npm run build

# Cleanup
RUN npx clean-modules

# Using multi-staged builds to decrease image size.
FROM node:14-alpine
WORKDIR /src/app
COPY --from=build src/app/node_modules/ node_modules/
COPY --from=build src/app/package.json .
COPY --from=build src/app/build/ build/

ENV NODE_ENV production

EXPOSE 3000

CMD ["npm", "start"]