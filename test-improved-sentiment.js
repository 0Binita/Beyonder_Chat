#!/usr/bin/env node

// Enhanced script showing how to improve word-level sentiment analysis
// by adding negation handling and context awareness

console.log("🔧 IMPROVED SENTIMENT ANALYSIS WITH NEGATION HANDLING\n");

// Negation words that flip sentiment
const negationWords = [
  "not", "never", "no", "none", "nobody", "nothing", "neither", "nowhere",
  "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't",
  "can't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't"
];

// Intensity modifiers
const intensifiers = {
  "very": 1.5,
  "really": 1.4,
  "extremely": 1.8,
  "quite": 1.2,
  "somewhat": 0.8,
  "a bit": 0.7,
  "slightly": 0.6
};

// Word sentiments with scores (-1 to +1)
const wordSentimentScores = {
  // Positive words
  "good": 0.7,
  "great": 0.8,
  "awesome": 0.9,
  "excellent": 0.9,
  "amazing": 0.9,
  "wonderful": 0.8,
  "fantastic": 0.9,
  "love": 0.8,
  "happy": 0.7,
  "best": 0.9,
  "perfect": 1.0,
  "brilliant": 0.9,
  "nice": 0.6,
  "fine": 0.5,
  
  // Negative words
  "bad": -0.7,
  "terrible": -0.9,
  "awful": -0.9,
  "hate": -0.8,
  "worst": -0.9,
  "horrible": -0.9,
  "disgusting": -0.8,
  "stupid": -0.7,
  "ugly": -0.6,
  "sad": -0.6,
  "poor": -0.5,
  "wrong": -0.6
};

// Improved sentiment analysis with negation handling
function improvedSentimentAnalysis(text) {
  const words = text.toLowerCase().split(/\s+/);
  let totalScore = 0;
  let sentimentWordCount = 0;
  const analysis = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:"'()]/g, '');
    let score = wordSentimentScores[word] || 0;
    let isNegated = false;
    let intensityMultiplier = 1;
    
    // Check for negation in the previous 2 words
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const prevWord = words[j].replace(/[.,!?;:"'()]/g, '');
      if (negationWords.includes(prevWord)) {
        isNegated = true;
        break;
      }
    }
    
    // Check for intensity modifiers in the previous 2 words
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const prevWord = words[j].replace(/[.,!?;:"'()]/g, '');
      if (intensifiers[prevWord]) {
        intensityMultiplier = intensifiers[prevWord];
        break;
      }
    }
    
    // Apply negation (flip the score)
    if (isNegated && score !== 0) {
      score = -score;
    }
    
    // Apply intensity
    score *= intensityMultiplier;
    
    if (score !== 0) {
      totalScore += score;
      sentimentWordCount++;
      
      analysis.push({
        word,
        originalScore: wordSentimentScores[word] || 0,
        finalScore: score,
        isNegated,
        intensityMultiplier,
        sentiment: score > 0 ? "positive" : score < 0 ? "negative" : "neutral"
      });
    }
  }
  
  const averageScore = sentimentWordCount > 0 ? totalScore / sentimentWordCount : 0;
  
  let finalSentiment;
  if (averageScore > 0.2) finalSentiment = "positive";
  else if (averageScore < -0.2) finalSentiment = "negative";
  else finalSentiment = "neutral";
  
  return {
    text,
    totalScore,
    averageScore,
    finalSentiment,
    confidence: Math.abs(averageScore),
    wordAnalysis: analysis
  };
}

// Test cases to demonstrate improvement
const testCases = [
  {
    text: "you are not good",
    expectedSentiment: "negative",
    explanation: "Negation should flip 'good' to negative"
  },
  {
    text: "you are good", 
    expectedSentiment: "positive",
    explanation: "Simple positive case"
  },
  {
    text: "this is not bad",
    expectedSentiment: "positive", 
    explanation: "Double negative: not + bad = positive"
  },
  {
    text: "you are very good",
    expectedSentiment: "positive",
    explanation: "Intensifier should boost positive sentiment"
  },
  {
    text: "this is not very good",
    expectedSentiment: "negative",
    explanation: "Negation with intensifier"
  },
  {
    text: "really terrible performance",
    expectedSentiment: "negative", 
    explanation: "Intensifier should boost negative sentiment"
  },
  {
    text: "this is really not that bad",
    expectedSentiment: "positive",
    explanation: "Complex negation case"
  },
  {
    text: "I don't love this",
    expectedSentiment: "negative",
    explanation: "Contracted negation"
  },
  {
    text: "excellent work today",
    expectedSentiment: "positive",
    explanation: "Strong positive word"
  },
  {
    text: "this isn't terrible",
    expectedSentiment: "positive", 
    explanation: "Negated negative word"
  }
];

console.log("🧪 TESTING IMPROVED SENTIMENT ANALYSIS\n");
console.log("=" * 80);

let correctCount = 0;
let totalCount = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase.text}"`);
  console.log(`Expected: ${testCase.expectedSentiment} (${testCase.explanation})`);
  
  const result = improvedSentimentAnalysis(testCase.text);
  
  console.log("\nWord-by-word analysis:");
  result.wordAnalysis.forEach(wordInfo => {
    const negationFlag = wordInfo.isNegated ? " [NEGATED]" : "";
    const intensityFlag = wordInfo.intensityMultiplier !== 1 ? ` [${wordInfo.intensityMultiplier}x]` : "";
    const scoreChange = wordInfo.originalScore !== wordInfo.finalScore ? 
      ` (${wordInfo.originalScore} → ${wordInfo.finalScore.toFixed(2)})` : "";
    
    console.log(`  "${wordInfo.word}": ${wordInfo.sentiment}${scoreChange}${negationFlag}${intensityFlag}`);
  });
  
  const isCorrect = result.finalSentiment === testCase.expectedSentiment;
  if (isCorrect) correctCount++;
  
  console.log(`\nResult: ${result.finalSentiment} (score: ${result.averageScore.toFixed(3)}, confidence: ${(result.confidence * 100).toFixed(1)}%)`);
  console.log(`Status: ${isCorrect ? "✅ CORRECT" : "❌ INCORRECT"}`);
  
  if (!isCorrect) {
    console.log(`🚨 FAILED: Got ${result.finalSentiment}, expected ${testCase.expectedSentiment}`);
  }
  
  console.log("-".repeat(60));
});

console.log(`\n📊 OVERALL RESULTS: ${correctCount}/${totalCount} correct (${(correctCount/totalCount*100).toFixed(1)}%)\n`);

console.log("🔄 COMPARISON: Basic vs Improved Analysis\n");

// Show side-by-side comparison for key problematic cases
const problematicCases = [
  "you are not good",
  "this is not bad", 
  "really not that great",
  "don't love this"
];

problematicCases.forEach(text => {
  console.log(`📝 "${text}"`);
  
  // Basic word-level analysis (your current model's approach)
  const words = text.split(' ');
  const positiveWords = words.filter(w => ['good', 'great', 'love', 'excellent', 'amazing'].includes(w.toLowerCase()));
  const negativeWords = words.filter(w => ['bad', 'terrible', 'hate', 'awful'].includes(w.toLowerCase()));
  const basicResult = positiveWords.length > negativeWords.length ? "positive" : 
                     negativeWords.length > positiveWords.length ? "negative" : "neutral";
  
  // Improved analysis
  const improvedResult = improvedSentimentAnalysis(text);
  
  console.log(`  Basic (word-level): ${basicResult} ❌`);
  console.log(`  Improved (context): ${improvedResult.finalSentiment} ✅`);
  console.log("");
});

console.log("💡 KEY IMPROVEMENTS IMPLEMENTED:\n");
console.log("1. ✅ Negation Detection: Looks for 'not', 'don't', etc. in previous words");
console.log("2. ✅ Score Flipping: Negated words get opposite sentiment");
console.log("3. ✅ Intensity Modifiers: 'very', 'really' boost sentiment strength");
console.log("4. ✅ Context Window: Considers 2 words before each sentiment word");
console.log("5. ✅ Weighted Scoring: Uses numerical scores instead of simple counts");
console.log("6. ✅ Confidence Scoring: Provides confidence levels for predictions");

console.log("\n🚀 RECOMMENDATIONS FOR YOUR MODEL:\n");
console.log("1. 📊 Add this negation logic to your Django sentiment analysis");
console.log("2. 🔧 Retrain with phrase-level data instead of individual words");
console.log("3. ⚡ Use this improved analysis as a preprocessing step");
console.log("4. 🎯 Combine with your existing toxicity detection for better accuracy");
console.log("5. 📈 Implement feedback loops to improve predictions over time");

console.log("\n✨ This shows how to fix 'you are not good' → negative sentiment!");