const fs = require("fs");
const path = require("path");
const http = require("http");

// Function to test the upload API
async function testUploadAPI() {
  console.log("Testing upload API...");

  // Read the sample document
  const filePath = path.join(__dirname, "sample-document.txt");
  if (!fs.existsSync(filePath)) {
    console.error("Sample document not found at:", filePath);
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = "sample-document.txt";

  console.log("File read successfully");
  console.log("File size:", fileBuffer.length, "bytes");

  // Create a simple HTTP request to test the upload endpoint
  // Note: This is a simplified test and won't actually work because:
  // 1. We're not running in a browser context
  // 2. We can't easily create FormData in Node.js
  // 3. We don't have access to the Next.js server directly

  console.log("\nTo properly test the upload API, you would need to:");
  console.log("1. Open your browser and go to http://localhost:3000");
  console.log("2. Select the sample-document.txt file");
  console.log('3. Click "Upload and Generate Questions"');
  console.log("4. Check the browser console for any errors");
  console.log("5. Check if you are redirected to /test?documentId=...");

  console.log("\nIf the redirect is not working, check for:");
  console.log("- JavaScript errors in the browser console");
  console.log("- Network errors in the browser dev tools");
  console.log("- Server errors in the Next.js terminal");
  console.log("- Make sure the API returns the expected response format");
  console.log("- Make sure the frontend correctly handles the response");
}

testUploadAPI();
