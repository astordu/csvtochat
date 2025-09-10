import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { localStorage } from "./local-storage";

// 检查是否有 Redis 配置
const hasRedisConfig = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

const isLocal = false; // process.env.NODE_ENV !== "production";

// 50 messages per day
const ratelimit =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(50, "1 d"),
        analytics: true,
      })
    : undefined;

// 本地限流实现
interface LocalRateLimit {
  count: number;
  resetTime: number;
}

const LOCAL_LIMIT_KEY_PREFIX = "limit:";
const DAILY_LIMIT = 50;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getLocalRateLimit(userFingerPrint: string): Promise<LocalRateLimit> {
  const key = `${LOCAL_LIMIT_KEY_PREFIX}${userFingerPrint}`;
  const data = await localStorage.get(key);
  
  if (!data) {
    return {
      count: 0,
      resetTime: Date.now() + WINDOW_MS
    };
  }
  
  try {
    return JSON.parse(data);
  } catch {
    return {
      count: 0,
      resetTime: Date.now() + WINDOW_MS
    };
  }
}

async function setLocalRateLimit(userFingerPrint: string, limit: LocalRateLimit): Promise<void> {
  const key = `${LOCAL_LIMIT_KEY_PREFIX}${userFingerPrint}`;
  await localStorage.set(key, JSON.stringify(limit));
}

export const getRemainingMessages = async (userFingerPrint: string) => {
  if (ratelimit) {
    // 使用 Redis 限流
    const result = await ratelimit.getRemaining(userFingerPrint);
    return {
      remaining: result.remaining,
      reset: result.reset,
    };
  }
  
  // 使用本地限流
  const limit = await getLocalRateLimit(userFingerPrint);
  const now = Date.now();
  
  // 如果时间窗口已过期，重置计数
  if (now > limit.resetTime) {
    const newLimit: LocalRateLimit = {
      count: 0,
      resetTime: now + WINDOW_MS
    };
    await setLocalRateLimit(userFingerPrint, newLimit);
    return {
      remaining: DAILY_LIMIT,
      reset: newLimit.resetTime,
    };
  }
  
  return {
    remaining: Math.max(0, DAILY_LIMIT - limit.count),
    reset: limit.resetTime,
  };
};

export const limitMessages = async (userFingerPrint: string) => {
  if (ratelimit) {
    // 使用 Redis 限流
    const result = await ratelimit.limit(userFingerPrint);
    if (!result.success) {
      throw new Error("Too many messages");
    }
    return result;
  }
  
  // 使用本地限流
  const limit = await getLocalRateLimit(userFingerPrint);
  const now = Date.now();
  
  // 如果时间窗口已过期，重置计数
  if (now > limit.resetTime) {
    const newLimit: LocalRateLimit = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    await setLocalRateLimit(userFingerPrint, newLimit);
    return { success: true, remaining: DAILY_LIMIT - 1, reset: newLimit.resetTime };
  }
  
  // 检查是否超过限制
  if (limit.count >= DAILY_LIMIT) {
    throw new Error("Too many messages");
  }
  
  // 增加计数
  const newLimit: LocalRateLimit = {
    count: limit.count + 1,
    resetTime: limit.resetTime
  };
  await setLocalRateLimit(userFingerPrint, newLimit);
  
  return { 
    success: true, 
    remaining: DAILY_LIMIT - newLimit.count, 
    reset: newLimit.resetTime 
  };
};
