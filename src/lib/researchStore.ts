import { randomUUID } from 'crypto';
import { redisConnection } from '@/lib/queue';

const TTL_SECONDS = 60 * 60 * 24 * 7;

const key = (id: string) => `research:${id}`;

export interface ResearchRecord {
  title: string;
  goal: string;
  sources: string;
  status: string;
  output?: string;
}

export async function createRecord(title: string, goal: string, sources: string) {
  const id = randomUUID();
  await redisConnection
    .multi()
    .hset(key(id), { title, goal, sources, status: 'pending' })
    .expire(key(id), TTL_SECONDS)
    .exec();
  return id;
}

export async function setStatus(id: string, status: string) {
  await redisConnection.hset(key(id), { status });
}

export async function setOutput(id: string, output: string) {
  await redisConnection.hset(key(id), { output });
}

export async function getRecord(id: string): Promise<ResearchRecord | null> {
  const record = await redisConnection.hgetall(key(id));
  return Object.keys(record).length ? (record as unknown as ResearchRecord) : null;
}
