const fs = require("fs");
const path = require("path");

// Function to simulate document upload
async function uploadDocument() {
  try {
    // Read the sample document
    const filePath = path.join(__dirname, "sample-document.txt");
    const fileBuffer = fs.readFileSync(filePath);

    // Create form data
    const formData = new FormData();
    const file = new File([fileBuffer], "sample-document.txt", {
      type: "text/plain",
    });
    formData.append("file", file);

    // Upload the file
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    console.log("Upload response:", data);

    if (data.documentId) {
      console.log("Document uploaded successfully with ID:", data.documentId);
      return data.documentId;
    } else {
      console.error("Upload failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error uploading document:", error);
    return null;
  }
}

// Function to generate questions
async function generateQuestions(documentId) {
  try {
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId, count: 5 }),
    });

    const data = await response.json();
    console.log("Question generation response:", data);

    if (data.questions) {
      console.log("Questions generated successfully:");
      data.questions.forEach((q, index) => {
        console.log(`${index + 1}. ${q.question} (${q.type})`);
      });
    } else {
      console.error("Failed to generate questions:", data.error);
    }
  } catch (error) {
    console.error("Error generating questions:", error);
  }
}

// Main function
async function main() {
  console.log("Testing question generation workflow...");

  // Upload document
  const documentId = await uploadDocument();

  if (documentId) {
    // Generate questions
    await generateQuestions(documentId);
  }
}

// Run the test
main();
