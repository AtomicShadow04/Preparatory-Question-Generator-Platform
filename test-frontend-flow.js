// This script simulates the frontend flow to test if the redirect works
const fs = require("fs");
const path = require("path");
const http = require("http");

// Function to simulate the frontend upload and redirect flow
async function testFrontendFlow() {
  console.log("Testing frontend flow...");

  // Simulate the upload API call
  console.log("Simulating upload API call...");

  // In a real implementation, this would be done through the browser
  // For now, let's just show what the frontend should do:

  console.log("\nFrontend should:");
  console.log(
    "1. Make a POST request to /api/upload with FormData containing the file"
  );
  console.log("2. Wait for the response");
  console.log("3. Check if response contains documentId");
  console.log(
    "4. If documentId exists, redirect to /test?documentId=DOCUMENT_ID"
  );
  console.log("5. If documentId does not exist, show an error message");

  // Let's also test the question generation API with the documentId we got
  const documentId = "doc_1756400522738_sample-document.txt"; // This is the documentId from our previous test

  console.log("\nTesting question generation with documentId:", documentId);

  // Make a request to the question generation API
  const postData = JSON.stringify({
    documentId: documentId,
    count: 3,
  });

  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/questions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    console.log(`\nQuestion API Status: ${res.statusCode}`);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const jsonData = JSON.parse(data);
        console.log("Question API Response:");
        console.log("- Message:", jsonData.message);
        console.log("- Document ID:", jsonData.documentId);
        console.log("- Questions generated:", jsonData.questionsGenerated);
        console.log(
          "- First question:",
          jsonData.questions ? jsonData.questions[0].question : "None"
        );
      } catch (error) {
        console.error("Error parsing response:", error);
        console.log("Raw response:", data);
      }
    });
  });

  req.on("error", (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  // Write data to request body
  req.write(postData);
  req.end();
}

testFrontendFlow();
