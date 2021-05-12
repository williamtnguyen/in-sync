# 👨‍💻👩‍💻▶️ in-sync

[![Build Status](https://travis-ci.org/williamtnguyen/in-sync.svg?branch=master)](https://travis-ci.org/williamtnguyen/in-sync)

## Introduction
A scalable real-time web application that allows users to watch YouTube videos synchronously, instant message, and have voice conversations using WebSockets and WebRTC. It is built with the following technologies:
| Purpose               | Software Technology       |
|-----------------------|---------------------------|
| Frontend Development  | Reactjs, TypeScript, Antd |
| End-to-End Testing    | Cypress                   |
| WebSocket Service     | Socket.io                 |
| Render YouTube Videos | YouTube IFrame Player API |
| Voice Streaming       | Mediasoup                 |
| Server                | Express                   |
| In-memory Database    | Redis                     |
| Containerization      | Docker                    |
| Deployment            | NGINX, S3, CloudFront,  AWS EC2     |

## Install dependencies and spin up development environment:

Session Server:

_On one terminal_
```
$ cd server
$ npm install
$ docker-compose up --build
```

_On another terminal_
```
$ cd server
$ npm run dev
```
Voice Server:

```
$ cd rtc-server
$ npm install
$ npm run dev
```

Frontend:

```
$ cd client
$ npm install
$ npm start
```

## High Level System Design
![4 2 Interface and Component Design (1)](https://user-images.githubusercontent.com/42355738/117902013-6f22a980-b281-11eb-8603-6d71c237e25a.png)

## Production Environment
![prod env](https://user-images.githubusercontent.com/42355738/117905741-8913ba80-b288-11eb-9215-3819305a7ac3.png)

## Course/Contributors
- University: San Jose State University
- Course: CMPE 195E/F
- Contributors: [William Nguyen](https://github.com/williamtnguyen), [Gary Chang](https://github.com/1234momo), [Hamsika Pongubala](https://github.com/hamsikapongubala), [Emanuel Ypon](https://github.com/donieypon) 

## Project Information
- Project report: https://docs.google.com/document/d/1VVKKeB3Xbji1iMZ2RcDbfa5Zgpznv-a9gwboiDV9nZs/edit?usp=sharing 
- Demo Video: https://drive.google.com/file/d/1yeM_IBc3LHBMLEr2FvjIHRtZjPUjICab/view?usp=sharing

## References
- [Using multiple nodes with Socket.io](https://socket.io/docs/v3/using-multiple-nodes/index.html)
- [Mediasoup: Communication Between Client and Server](https://mediasoup.org/documentation/v3/communication-between-client-and-server/)
- [Mediasoup: Scalability](https://mediasoup.org/documentation/v3/scalability/)
