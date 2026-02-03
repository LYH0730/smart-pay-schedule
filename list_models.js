import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(".env.local file not found. Ensure GOOGLE_GENAI_API_KEY is set in your environment.");
}

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

if (!API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY is not set.");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("사용 가능한 모델 목록:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

checkModels();