FROM node:14-alpine
WORKDIR /server
COPY . .
RUN npm install \
	&& npm install -g pm2 \
	&& npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["pm2-runtime", "./build/server.js"];
