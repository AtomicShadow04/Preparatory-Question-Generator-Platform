const fs = require("fs");
const path = require("path");

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        const value = valueParts.join("=").replace(/^"(.*)"$/, "$1"); // Remove quotes if present
        process.env[key.trim()] = value;
      }
    });
  }
}

// Load the environment variables
loadEnv();

// Test the question generation API directly
async function testQuestionGeneration() {
  try {
    // Read the document ID from the document store
    const dataDir = path.join(__dirname, "data");
    const storePath = path.join(dataDir, "document-stores.json");

    if (!fs.existsSync(storePath)) {
      console.error(
        "Document store not found. Please run the upload simulation first."
      );
      return;
    }

    const data = fs.readFileSync(storePath, "utf-8");
    const stores = JSON.parse(data);
    const documentIds = Object.keys(stores);

    if (documentIds.length === 0) {
      console.error("No documents found in store.");
      return;
    }

    const documentId = documentIds[0];
    console.log("Testing question generation for document ID:", documentId);

    // Check if the API key is configured
    if (process.env.OPENAI_API_KEY) {
      console.log("\nOPENAI_API_KEY is configured.");
      console.log(
        "Key preview:",
        process.env.OPENAI_API_KEY.substring(0, 10) + "..."
      );

      // In a real implementation, we would now call the actual API
      console.log("\nTo test the actual API, you can make a POST request to:");
      console.log("http://localhost:3000/api/questions");
      console.log("With the following JSON body:");
      console.log(
        JSON.stringify({ documentId: documentId, count: 5 }, null, 2)
      );

      console.log("\nOr use curl:");
      console.log(`curl -X POST http://localhost:3000/api/questions \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"documentId": "${documentId}", "count": 5}'`);
    } else {
      console.log("\nOPENAI_API_KEY is not set.");
      console.log(
        "Please check your .env file and ensure it contains a valid OPENAI_API_KEY."
      );
    }
  } catch (error) {
    console.error("Error testing question generation:", error);
  }
}

// Run the test
testQuestionGeneration();
