const https = require("https");
const http = require("http");

// Function to make an API call
function makeApiCall() {
  const postData = JSON.stringify({
    documentId: "doc_1756383220472_sample-document.txt",
    count: 5,
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
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    res.on("data", (chunk) => {
      console.log(`Body: ${chunk}`);
    });

    res.on("end", () => {
      console.log("No more data in response.");
    });
  });

  req.on("error", (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  // Write data to request body
  req.write(postData);
  req.end();
}

// Run the test
console.log("Testing API call to generate questions...");
makeApiCall();
