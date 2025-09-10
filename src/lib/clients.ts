import Together from "together-ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { StorageFactory } from "./storage-adapter";

const APP_NAME_HELICONE = "csvtochat";

// 检查是否有 Together AI API Key
if (!process.env.TOGETHER_API_KEY) {
  throw new Error("TOGETHER_API_KEY is required");
}

const baseSDKOptions: ConstructorParameters<typeof Together>[0] = {
  apiKey: process.env.TOGETHER_API_KEY,
};

// 只有在有 Helicone API Key 时才使用 Helicone
if (process.env.HELICONE_API_KEY) {
  baseSDKOptions.baseURL = "https://together.helicone.ai/v1";
  baseSDKOptions.defaultHeaders = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-Appname": APP_NAME_HELICONE,
  };
  console.log('Using Helicone for AI requests');
} else {
  console.log('Using direct Together AI API');
}

export const togetherClient = new Together(baseSDKOptions);

// AI SDK 客户端配置
export const togetherAISDKClient = process.env.HELICONE_API_KEY 
  ? createTogetherAI({
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://together.helicone.ai/v1",
      headers: {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-AppName": APP_NAME_HELICONE,
      },
    })
  : createTogetherAI({
      apiKey: process.env.TOGETHER_API_KEY,
    });

export const codeInterpreter = togetherClient.codeInterpreter;

// 使用存储工厂获取存储适配器
export const storage = StorageFactory.getStorageAdapter();
export const uploadService = StorageFactory.getUploadAdapter();
