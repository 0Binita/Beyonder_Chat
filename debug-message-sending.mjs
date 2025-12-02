#!/usr/bin/env node

/**
 * Test script to reproduce the 500 error when sending messages
 */

console.log("🧪 Testing message sending with enhanced sentiment analysis...\n");

async function testMessageSending() {
  const testMessage = "I am happy but sad";
  
  try {
    console.log(`📤 Attempting to send message: "${testMessage}"`);
    
    // Test the enhanced sentiment analysis first
    console.log("\n1️⃣ Testing enhanced sentiment analysis...");
    const sentimentResponse = await fetch('http://127.0.0.1:8001/api/sentiment/enhanced/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: testMessage })
    });
    
    if (sentimentResponse.ok) {
      const sentimentResult = await sentimentResponse.json();
      console.log("✅ Enhanced sentiment analysis working:");
      console.log(`   Sentiment: ${sentimentResult.sentiment}`);
      console.log(`   Confidence: ${(sentimentResult.confidence * 100).toFixed(1)}%`);
      console.log(`   Word Analysis: ${sentimentResult.word_analysis.length} words analyzed`);
    } else {
      console.log("❌ Enhanced sentiment analysis failed:", sentimentResponse.status);
    }
    
    // Test toxicity analysis
    console.log("\n2️⃣ Testing toxicity analysis...");
    const toxicityResponse = await fetch('http://127.0.0.1:8001/api/sentiment/toxicity/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: testMessage,
        use_ml: true,
        sentiment: "neutral"
      })
    });
    
    if (toxicityResponse.ok) {
      const toxicityResult = await toxicityResponse.json();
      console.log("✅ Toxicity analysis working:");
      console.log(`   Toxic: ${toxicityResult.toxicity.isToxic}`);
      console.log(`   Score: ${toxicityResult.toxicity.toxicityScore}`);
      console.log(`   Final Sentiment: ${toxicityResult.sentiment}`);
    } else {
      console.log("❌ Toxicity analysis failed:", toxicityResponse.status);
    }
    
    // Test the Node.js backend message API (this might require authentication)
    console.log("\n3️⃣ Testing Node.js message API...");
    const messageResponse = await fetch('http://localhost:5000/api/messages/send/68665c3e0890c9a5d67d8a0c', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Note: This might need proper authentication headers
      },
      body: JSON.stringify({ 
        text: testMessage,
        sentiment: "neutral"
      })
    });
    
    console.log(`Status: ${messageResponse.status}`);
    
    if (messageResponse.ok) {
      const messageResult = await messageResponse.json();
      console.log("✅ Message sent successfully!");
      console.log(`   Message ID: ${messageResult._id}`);
      console.log(`   Sentiment: ${messageResult.sentiment}`);
    } else {
      console.log("❌ Message sending failed");
      const errorText = await messageResponse.text();
      console.log("Error details:", errorText);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Check if Django server is running
async function checkDjangoServer() {
  try {
    const response = await fetch('http://127.0.0.1:8001/api/sentiment/enhanced/', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log("✅ Django server is running and responding");
      return true;
    } else {
      console.log("❌ Django server not responding properly");
      return false;
    }
  } catch (error) {
    console.log("❌ Cannot connect to Django server:", error.message);
    return false;
  }
}

// Check if Node.js server is running
async function checkNodeServer() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET'
    });
    
    // Even if auth fails, if we get a response, server is running
    console.log("✅ Node.js server is running");
    return true;
  } catch (error) {
    console.log("❌ Cannot connect to Node.js server:", error.message);
    return false;
  }
}

async function main() {
  console.log("🔍 Checking server connectivity...\n");
  
  const djangoOk = await checkDjangoServer();
  const nodeOk = await checkNodeServer();
  
  if (!djangoOk) {
    console.log("⚠️ Django server is not running. Please start it with:");
    console.log("   cd django_backend && python3 manage.py runserver 8001");
    return;
  }
  
  if (!nodeOk) {
    console.log("⚠️ Node.js server is not running. Please start it with:");
    console.log("   cd backend && npm run dev");
    return;
  }
  
  console.log("🚀 Both servers are running. Testing message flow...\n");
  await testMessageSending();
}

main().catch(console.error);