# Base alpine image to install npm packages and compile ts -> js
FROM node:14-alpine AS build
COPY . .
RUN apk update \
	&& apk add --no-cache --virtual .gyp \
		python \
		make \
		g++ \
		linux-headers \
	&& npm install \
	&& npm install mediasoup \
	&& npm run build \
	&& apk del .gyp

# Main application image
FROM node:14-alpine
WORKDIR /server
COPY --from=build ./node_modules ./node_modules
COPY --from=build ./build ./build
RUN npm install pm2 -g
ENV NODE_ENV=production
EXPOSE 4000
CMD ["pm2-runtime", "./build/server.js"]
