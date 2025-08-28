const fs = require("fs");
const path = require("path");

// Simulate the upload process
async function simulateUpload() {
  console.log("Simulating document upload...");

  // Create the uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Copy the sample document to the uploads directory
  const sourcePath = path.join(__dirname, "sample-document.txt");
  const destPath = path.join(uploadsDir, "sample-document.txt");
  fs.copyFileSync(sourcePath, destPath);

  console.log("Document copied to uploads directory");

  // Process the document (this simulates what happens in the upload API)
  const documentId = `doc_${Date.now()}_sample-document.txt`;
  console.log("Generated document ID:", documentId);

  // Read the document content
  const content = fs.readFileSync(destPath, "utf-8");

  // Create the data directory if it doesn't exist
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create the document store entry
  const storePath = path.join(dataDir, "document-stores.json");
  let stores = {};

  if (fs.existsSync(storePath)) {
    const data = fs.readFileSync(storePath, "utf-8");
    stores = JSON.parse(data);
  }

  // Create a simple document store entry
  stores[documentId] = {
    id: documentId,
    originalContent: content,
    metadata: {
      fileName: "sample-document.txt",
      uploadDate: new Date().toISOString(),
      chunkCount: 1,
    },
  };

  // Save the document store
  fs.writeFileSync(storePath, JSON.stringify(stores, null, 2));
  console.log("Document store updated");

  // Clean up the temporary file
  fs.unlinkSync(destPath);
  console.log("Temporary file cleaned up");

  return documentId;
}

// Simulate question generation
async function simulateQuestionGeneration(documentId) {
  console.log("\nSimulating question generation for document:", documentId);

  // Read the document store
  const dataDir = path.join(__dirname, "data");
  const storePath = path.join(dataDir, "document-stores.json");

  if (!fs.existsSync(storePath)) {
    console.error("Document store not found");
    return;
  }

  const data = fs.readFileSync(storePath, "utf-8");
  const stores = JSON.parse(data);

  const store = stores[documentId];
  if (!store) {
    console.error("Document not found in store");
    return;
  }

  console.log(
    "Document found with content length:",
    store.originalContent.length
  );

  // This is where we would normally call the OpenAI API
  // For simulation purposes, we'll just show what would happen
  console.log(
    "\nIn a real implementation, this would now call the OpenAI API with a prompt like:"
  );
  console.log(`
Based on the following educational content, generate 5 diverse questions that test comprehension and understanding.

Requirements:
- Include these types of questions:
  - yes-no
  - multiple-choice-single (4 options, one correct)
  - multiple-choice-multi (4-6 options, multiple correct)
  - scale (1-10 self-assessment)
  - rating (1-5 opinion/perception)
- Vary the difficulty levels: easy, medium, hard
- Questions should test understanding, not just memorization
- Cover different aspects of the content (facts, application, analysis, evaluation)

Content:
${store.originalContent.substring(0, 1000)}...

The actual implementation would then process the AI response and return the questions.
  `);
}

// Main function
async function main() {
  try {
    console.log(
      "Starting simulation of upload and question generation process...\n"
    );

    // Simulate upload
    const documentId = await simulateUpload();

    // Simulate question generation
    await simulateQuestionGeneration(documentId);

    console.log("\nSimulation complete!");
    console.log("To test the actual API endpoints, you would need to:");
    console.log("1. Start the Next.js development server with `npm run dev`");
    console.log("2. Visit http://localhost:3000 in your browser");
    console.log("3. Upload the sample-document.txt file");
    console.log(
      "4. The system will automatically generate questions and display them"
    );
  } catch (error) {
    console.error("Error in simulation:", error);
  }
}

// Run the simulation
main();
