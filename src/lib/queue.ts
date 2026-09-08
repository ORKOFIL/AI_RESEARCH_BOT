import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const RESEARCH_QUEUE_NAME = 'research-queue';

export const researchQueue = new Queue(RESEARCH_QUEUE_NAME, {
  connection: redisConnection,
});