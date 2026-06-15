import http from 'http';
import app from './app';
import { env } from './config/env';
import { Server } from 'socket.io';
import setupSockets from './sockets';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSockets(io);

server.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
});
