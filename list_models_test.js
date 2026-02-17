
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyDDCCQA6NdM70J5LKzxY4-PDBgwPvwU_qM";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // Note: listModels might not be available on the client SDK immediately or might behave differently.
        // The SDK documentation says we can list models via the API.
        // Actually, in the JS SDK, it might be separate.
        // Let's try to just hit the API endpoint using fetch if SDK fails, but let's try a simple generation with a known model first to see if it's KEY issue or MODEL issue. 
        // Wait, the error was 404 models/... not found. 404 means model not found. 403 would be key issue.
        // So the key is likely fine.

        // Using fetch to list models
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
        } else {
            console.error("No models found or error:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
