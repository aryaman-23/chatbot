import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import pkg from 'bullmq';
const { Queue, QueueEvents } = pkg;
import IORedis from 'ioredis';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
});

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

const taskQueueName = 'questionQueue';
const questionQueue = new Queue(taskQueueName, { connection });

const queueEvents = new QueueEvents(taskQueueName, { connection });
queueEvents.on('ready', () => {
  console.log('QueueEvents is ready to receive events.');
});

async function handleQuestion(question) {
  try {
    const job = await questionQueue.add('processQuestion', { question });
    const result = await job.waitUntilFinished(queueEvents);
    return result;
  } catch (error) {
    console.error('Error processing question:', error);
    return { type: 'text', content: 'Error processing your question' };
  }
}

io.on('connection', (socket) => {
  socket.on('question', async (question) => {
    console.log(`received text: ${question}`);
    const answer = await handleQuestion(question);
    socket.emit('answer', answer);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send('Express server is running');
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
