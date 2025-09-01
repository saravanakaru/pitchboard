import { createClient } from "redis";
import { env } from "./env";

let redisClient: any = null;

export const connectRedis = async (): Promise<any> => {
  try {
    redisClient = createClient({
      url: env.redisUrl,
    });

    redisClient.on("error", (err: any) =>
      console.error("Redis Client Error", err)
    );
    redisClient.on("connect", () => console.log("Redis Client Connected"));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    process.exit(1);
  }
};

export const getRedisClient = (): any => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
  }
};
