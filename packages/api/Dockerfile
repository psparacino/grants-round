FROM node:18-slim as base

RUN apt-get update && apt-get install -y openssl libssl-dev

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

ARG POSTGRES_USER
ENV POSTGRES_USER=$POSTGRES_USER

ARG POSTGRES_PASSWORD
ENV POSTGRES_PASSWORD=$POSTGRES_PASSWORD

ARG POSTGRES_DB
ENV POSTGRES_DB=$POSTGRES_DB

ARG POSTGRES_HOST
ENV POSTGRES_HOST=$POSTGRES_HOST

ARG POSTGRES_PORT
ENV POSTGRES_PORT=$POSTGRES_PORT

ARG SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN

ARG SUBGRAPH_DUMMY_API
ENV SUBGRAPH_DUMMY_API=$SUBGRAPH_DUMMY_API

ARG PORT
ENV PORT=$PORT

RUN npm run prisma:migrate
RUN npm run build

# Cleanup
RUN npx clean-modules

## Using multi-staged builds to decrease image size.
#FROM node:14-alpine
#WORKDIR /src/app
#COPY --from=build src/app/node_modules/ node_modules/
#COPY --from=build src/app/package.json .
#COPY --from=build src/app/build/ build/

ENV NODE_ENV production

EXPOSE 3000

CMD ["npm", "start"]