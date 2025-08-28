const fs = require("fs");
const path = require("path");

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

    // Since we can't directly call the Next.js API routes from Node.js,
    // let's examine what the API does and simulate the key parts

    // Load the document store service
    const store = stores[documentId];
    console.log("Document content length:", store.originalContent.length);

    // This is what the QuestionGenerator.generateQuestions method does:
    // 1. It gets the document store (we already have it)
    // 2. It creates an OpenAI instance with the API key from process.env.OPENAI_API_KEY
    // 3. It creates a prompt with the document content
    // 4. It calls the OpenAI API
    // 5. It processes the response

    console.log("\nIf this were calling the actual API, it would:");
    console.log("1. Create an OpenAI instance with your API key");
    console.log("2. Create a prompt with the document content");
    console.log("3. Call the OpenAI API with the prompt");
    console.log("4. Process the response into questions");

    // Check if the API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log(
        "\nNote: OPENAI_API_KEY is not set in environment variables."
      );
      console.log("To test the actual API, you need to:");
      console.log("1. Set the OPENAI_API_KEY environment variable");
      console.log("2. Start the Next.js development server with `npm run dev`");
      console.log(
        "3. Make a POST request to http://localhost:3000/api/questions with:"
      );
      console.log('   { "documentId": "' + documentId + '", "count": 5 }');
    } else {
      console.log(
        "\nOPENAI_API_KEY is configured. You can test the API directly."
      );
    }
  } catch (error) {
    console.error("Error testing question generation:", error);
  }
}

// Run the test
testQuestionGeneration();
