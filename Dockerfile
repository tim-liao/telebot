FROM node:10.15.3-alpine
WORKDIR /timtim
ADD . /timtim
RUN npm install
ENV TZ="Asia/Taipei"
EXPOSE 3000
CMD node timtelebot.js