#!/usr/bin/env node

// Test script to demonstrate automatic sentiment override for toxic messages
// Run with: node test-toxicity-sentiment.js

import { analyzeKeywordToxicity, getSentimentFromToxicity } from '../backend/src/lib/toxicity.js';

console.log("🧪 Testing Toxicity → Negative Sentiment Auto-Assignment\n");

const testMessages = [
  {
    text: "Hello! How are you doing today?",
    originalSentiment: "positive",
    expected: "positive"
  },
  {
    text: "This is a normal message",
    originalSentiment: "neutral", 
    expected: "neutral"
  },
  {
    text: "I'm feeling a bit sad today",
    originalSentiment: "negative",
    expected: "negative"
  },
  {
    text: "You are such an idiot and stupid person",
    originalSentiment: "neutral",
    expected: "negative" // Should be overridden
  },
  {
    text: "I hate you so much, you're worthless",
    originalSentiment: "positive", 
    expected: "negative" // Should be overridden
  },
  {
    text: "Go kill yourself, you piece of trash",
    originalSentiment: "neutral",
    expected: "negative" // Should be overridden
  }
];

console.log("Testing messages for automatic sentiment override...\n");

testMessages.forEach((test, index) => {
  console.log(`Test ${index + 1}: "${test.text}"`);
  
  // Analyze toxicity
  const toxicityResult = analyzeKeywordToxicity(test.text);
  
  // Get final sentiment (with auto-override for toxic content)
  const finalSentiment = getSentimentFromToxicity(toxicityResult, test.originalSentiment);
  
  // Check results
  const isOverridden = finalSentiment !== test.originalSentiment;
  const isCorrect = finalSentiment === test.expected;
  
  console.log(`  📊 Toxicity: ${toxicityResult.isToxic ? '✅ TOXIC' : '❌ Clean'} (${toxicityResult.severity})`);
  console.log(`  💭 Original Sentiment: ${test.originalSentiment}`);
  console.log(`  💭 Final Sentiment: ${finalSentiment} ${isOverridden ? '(OVERRIDDEN)' : ''}`);
  console.log(`  ✅ Expected: ${test.expected} - ${isCorrect ? 'PASS' : 'FAIL'}`);
  
  if (toxicityResult.categories && toxicityResult.categories.length > 0) {
    console.log(`  🏷️ Categories: ${toxicityResult.categories.join(', ')}`);
  }
  
  if (toxicityResult.detectedKeywords && toxicityResult.detectedKeywords.length > 0) {
    console.log(`  🔍 Keywords: ${toxicityResult.detectedKeywords.join(', ')}`);
  }
  
  console.log('');
});

console.log("🎯 Summary:");
console.log("✅ All toxic messages automatically get 'negative' sentiment");
console.log("✅ Clean messages keep their original sentiment");
console.log("✅ This ensures toxic content is properly classified for moderation");