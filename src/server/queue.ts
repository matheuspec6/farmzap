import { Queue } from "bullmq"

const queues = new Map<string, Queue>()

export function getQueue(url?: string): Queue {
  const key = url || process.env.REDIS_URL || "redis://127.0.0.1:6379"
  if (!queues.has(key)) {
    queues.set(key, new Queue("sendMessages", {
      connection: { url: key },
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: { count: 1000, age: 24 * 3600 },
        removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
      },
    }))
  }
  return queues.get(key)!
}
