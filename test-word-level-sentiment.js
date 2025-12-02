#!/usr/bin/env node

// Script to demonstrate word-level sentiment analysis issues with negation and context
// This shows how individual word analysis can misclassify sentences due to lack of context

console.log("🔍 Testing Word-Level Sentiment Analysis Issues\n");
console.log("This demonstrates why your model shows 'you are not good' as positive\n");

// Simulated word-level sentiment analysis (like your trained model)
const wordSentiments = {
  // Positive words
  "good": "positive",
  "great": "positive", 
  "awesome": "positive",
  "excellent": "positive",
  "amazing": "positive",
  "wonderful": "positive",
  "fantastic": "positive",
  "love": "positive",
  "happy": "positive",
  "best": "positive",
  "perfect": "positive",
  "brilliant": "positive",
  
  // Negative words
  "bad": "negative",
  "terrible": "negative",
  "awful": "negative",
  "hate": "negative",
  "worst": "negative",
  "horrible": "negative",
  "disgusting": "negative",
  "stupid": "negative",
  "ugly": "negative",
  "sad": "negative",
  
  // Neutral/function words
  "you": "neutral",
  "are": "neutral", 
  "not": "neutral",  // This is the problem! "not" should flip sentiment
  "is": "neutral",
  "the": "neutral",
  "a": "neutral",
  "an": "neutral",
  "this": "neutral",
  "that": "neutral",
  "very": "neutral",
  "really": "neutral",
  "so": "neutral"
};

// Simple word-level sentiment analysis (mimics your model's behavior)
function analyzeWordLevelSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  const wordAnalysis = [];
  
  words.forEach(word => {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:"'()]/g, '');
    const sentiment = wordSentiments[cleanWord] || "neutral";
    
    wordAnalysis.push({ word: cleanWord, sentiment });
    
    if (sentiment === "positive") positiveCount++;
    else if (sentiment === "negative") negativeCount++;
    else neutralCount++;
  });
  
  // Final sentiment based on majority (this is the flawed approach)
  let finalSentiment;
  if (positiveCount > negativeCount) {
    finalSentiment = "positive";
  } else if (negativeCount > positiveCount) {
    finalSentiment = "negative";
  } else {
    finalSentiment = "neutral";
  }
  
  return {
    text,
    words: wordAnalysis,
    counts: { positive: positiveCount, negative: negativeCount, neutral: neutralCount },
    finalSentiment,
    confidence: Math.max(positiveCount, negativeCount, neutralCount) / words.length
  };
}

// Test sentences that demonstrate the problem
const testSentences = [
  // Negation problems
  "you are not good",
  "this is not great", 
  "not bad at all",
  "you are not terrible",
  
  // Context problems  
  "you are good",
  "this is great",
  "bad weather today", 
  "terrible traffic",
  
  // Complex cases
  "you are really not that good",
  "this is not very excellent", 
  "I don't love this",
  "not the best solution",
  
  // Should be positive
  "you are very good",
  "this is excellent work",
  "amazing performance today",
  
  // Should be negative
  "you are terrible",
  "this is awful work", 
  "horrible day today"
];

console.log("📊 TESTING WORD-LEVEL SENTIMENT ANALYSIS\n");
console.log("=" * 80);

testSentences.forEach((sentence, index) => {
  console.log(`\nTest ${index + 1}: "${sentence}"`);
  
  const analysis = analyzeWordLevelSentiment(sentence);
  
  // Show word-by-word breakdown
  console.log("Word Analysis:");
  analysis.words.forEach(wordInfo => {
    const indicator = wordInfo.sentiment === "positive" ? "✅" : 
                     wordInfo.sentiment === "negative" ? "❌" : "⚪";
    console.log(`  ${indicator} "${wordInfo.word}" → ${wordInfo.sentiment}`);
  });
  
  console.log(`\nCounts: ✅${analysis.counts.positive} positive, ❌${analysis.counts.negative} negative, ⚪${analysis.counts.neutral} neutral`);
  
  // Determine what the sentiment SHOULD be (human judgment)
  const shouldBe = getShouldBeSentiment(sentence);
  const isCorrect = analysis.finalSentiment === shouldBe;
  
  console.log(`Final Sentiment: ${analysis.finalSentiment} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
  console.log(`Should be: ${shouldBe}`);
  console.log(`Result: ${isCorrect ? "✅ CORRECT" : "❌ INCORRECT"}`);
  
  if (!isCorrect) {
    console.log(`🚨 PROBLEM: Word-level analysis missed the context!`);
  }
  
  console.log("-".repeat(50));
});

// Helper function to determine what sentiment should actually be
function getShouldBeSentiment(sentence) {
  const lower = sentence.toLowerCase();
  
  // Negation cases
  if (lower.includes("not good") || lower.includes("not great") || 
      lower.includes("not excellent") || lower.includes("not amazing")) {
    return "negative";
  }
  
  if (lower.includes("not bad") || lower.includes("not terrible") || 
      lower.includes("not awful")) {
    return "positive";
  }
  
  // Positive patterns
  if (lower.includes("very good") || lower.includes("excellent") || 
      lower.includes("amazing") || lower.includes("you are good")) {
    return "positive";
  }
  
  // Negative patterns  
  if (lower.includes("terrible") || lower.includes("awful") || 
      lower.includes("horrible") || lower.includes("you are terrible")) {
    return "negative";
  }
  
  // Default cases
  if (lower.includes("good") && !lower.includes("not")) return "positive";
  if (lower.includes("bad") && !lower.includes("not")) return "negative";
  
  return "neutral";
}

console.log("\n🎯 SUMMARY OF ISSUES:\n");
console.log("1. ❌ 'you are not good' → Shows POSITIVE (should be NEGATIVE)");
console.log("   └── Model sees 'good' = positive, ignores 'not'");
console.log("");
console.log("2. ❌ 'not bad at all' → Shows NEGATIVE (should be POSITIVE)"); 
console.log("   └── Model sees 'bad' = negative, ignores 'not'");
console.log("");
console.log("3. ❌ Word-level analysis lacks context understanding");
console.log("   └── Cannot handle negation, sarcasm, or complex grammar");
console.log("");

console.log("💡 SOLUTIONS:\n");
console.log("1. 🔧 Use sentence-level or phrase-level training data");
console.log("2. 🔧 Add negation handling logic (detect 'not', 'never', 'don't')");  
console.log("3. 🔧 Use n-gram models (bigrams, trigrams) instead of single words");
console.log("4. 🔧 Implement context-aware transformers (BERT, RoBERTa)");
console.log("5. 🔧 Add manual rules for common negation patterns");

console.log("\n🚀 This script demonstrates why your sentiment analysis");
console.log("   shows 'you are not good' as positive - it's a limitation");
console.log("   of word-level sentiment classification models!");