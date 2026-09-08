import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';

const worker = new Worker(RESEARCH_QUEUE_NAME, async(job)=>{

    },
    {connection: redisConnection}
)