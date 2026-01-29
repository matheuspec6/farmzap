import { Queue } from "bullmq"

const queues = new Map<string, Queue>()

export function getQueue(url?: string): Queue {
  const key = url || process.env.REDIS_URL || "redis://127.0.0.1:6379"
  if (!queues.has(key)) {
    queues.set(key, new Queue("sendMessages", { connection: { url: key } }))
  }
  return queues.get(key)!
}
