import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyC3y_DIbhDvyNqOgBXDPchkKrbHLq5CSWY";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

async function run() {
  try {
    const result = await model.generateContent("hello");
    console.log("Success:", await result.response.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
