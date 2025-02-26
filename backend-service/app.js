import pkg from 'bullmq';
const { Queue, Worker } = pkg;
import IORedis from 'ioredis';
import axios from 'axios';

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

const taskQueueName = 'questionQueue';
const questionQueue = new Queue(taskQueueName, { connection });

async function processQuestion(question) {
  const questionText = question.trim().toLowerCase();

  if (questionText === 'ping') {
    return { type: 'text', content: 'pong' };
  } else if (questionText === 'weather') {
    try {
      const response = await axios.get('https://wttr.in/?format=3');
      return { type: 'text', content: response.data };
    } catch (err) {
      return { type: 'text', content: 'Error fetching weather data' };
    }
  } else if (questionText === 'apod') {
    try {
      const apiKey = 'TZRd0V3GbCrWpRFPa8JeLEC5ppIx4qMra7bMYxSS';
      const response = await axios.get('https://api.nasa.gov/planetary/apod', {
        params: { api_key: apiKey },
      });
      return { type: 'image', content: response.data.url };
    } catch (err) {
      return { type: 'text', content: 'Error fetching APOD data' };
    }
  } else {
    return { type: 'text', content: 'Unknown question' };
  }
}

const worker = new Worker(
  taskQueueName,
  async job => {
    const { question } = job.data;
    return await processQuestion(question);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Job failed: ${err.message}`);
});

console.log('Background Service is running...');
