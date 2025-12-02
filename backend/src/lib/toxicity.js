import { config } from "dotenv";

config();

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
const DJANGO_TOXICITY_URL = process.env.DJANGO_TOXICITY_URL || "http://127.0.0.1:8000/api/sentiment/toxicity/";
const DJANGO_ENHANCED_SENTIMENT_URL = process.env.DJANGO_ENHANCED_SENTIMENT_URL || "http://127.0.0.1:8000/api/sentiment/enhanced/";
const DJANGO_SENTIMENT_API = process.env.DJANGO_SENTIMENT_API || 'http://127.0.0.1:8000/api/sentiment';

// Configuration for toxicity detection methods
const TOXICITY_CONFIG = {
  preferredMethod: process.env.TOXICITY_METHOD || "auto", // auto, django, perspective, keyword
  enableDjango: process.env.ENABLE_DJANGO_TOXICITY !== "false", // Default true
  enablePerspective: process.env.ENABLE_PERSPECTIVE_API !== "false", // Default true
  enableKeywordFallback: process.env.ENABLE_KEYWORD_FALLBACK !== "false", // Default true
  enableEnhancedSentiment: process.env.ENABLE_ENHANCED_SENTIMENT !== "false", // Default true
  timeout: parseInt(process.env.TOXICITY_TIMEOUT) || 5000 // 5 second timeout
};

// Enhanced sentiment analysis with negation handling
export async function getEnhancedSentiment(text, selectedModel = 'svc') {
  try {
    console.log(`🔍 [getEnhancedSentiment] Using model: ${selectedModel.toUpperCase()} for text: "${text.substring(0, 50)}..."`);
    console.log(`📡 [getEnhancedSentiment] Sending request to Django with model=${selectedModel}`);
    
    const response = await fetch(`${DJANGO_SENTIMENT_API}/enhanced/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text,
        model: selectedModel  // ✅ Already passing model
      }),
    });

    if (!response.ok) {
      throw new Error(`Django API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [getEnhancedSentiment] ${selectedModel.toUpperCase()} returned: ${data.sentiment} (confidence: ${data.confidence})`);
    console.log(`📊 [getEnhancedSentiment] Model used by Django: ${data.model_used || selectedModel}`);
    
    return {
      sentiment: data.sentiment || 'neutral',
      confidence: data.confidence || 0,
      score: data.score || 0,
      wordAnalysis: data.word_analysis || [],
      enhanced: true,
      model: data.model_used || selectedModel // Track which model was actually used
    };
  } catch (error) {
    console.error(`❌ [getEnhancedSentiment] Error with model ${selectedModel}:`, error);
    // Fallback to neutral
    return {
      sentiment: 'neutral',
      confidence: 0,
      score: 0,
      wordAnalysis: [],
      enhanced: false,
      model: 'fallback'
    };
  }
}

// Django ML-enhanced toxicity analysis
export const analyzeToxicityWithML = async (text, originalSentiment = "neutral") => {
  try {
    console.log("🤖 Analyzing toxicity with Django ML models...");
    
    const response = await fetch(DJANGO_TOXICITY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        use_ml: true,
        sentiment: originalSentiment
      }),
    });

    if (!response.ok) {
      throw new Error(`Django toxicity API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    console.log("✅ Django ML toxicity analysis successful:", result.toxicity);
    
    return {
      isToxic: result.toxicity.isToxic,
      toxicityScore: result.toxicity.toxicityScore,
      severity: result.toxicity.severity,
      categories: result.toxicity.categories,
      method: "django_ml",
      detectedKeywords: result.toxicity.detectedKeywords,
      sentiment: result.sentiment,
      sentimentOverridden: result.sentimentOverridden
    };

  } catch (error) {
    console.error("❌ Django ML toxicity analysis failed:", error);
    throw error;
  }
};

export const analyzeToxicity = async (text) => {
  try {
    if (!PERSPECTIVE_API_KEY) {
      console.warn("Perspective API key not configured, skipping toxicity analysis");
      return {
        isToxic: false,
        toxicityScore: 0,
        severity: "none",
        categories: []
      };
    }

    const data = {
      comment: { text },
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
      },
      languages: ["en"]
    };

    const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Perspective API error: ${response.statusText}`);
    }

    const result = await response.json();
    const scores = result.attributeScores;

    // Extract scores
    const toxicityScore = scores.TOXICITY?.summaryScore?.value || 0;
    const severeToxicityScore = scores.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const identityAttackScore = scores.IDENTITY_ATTACK?.summaryScore?.value || 0;
    const insultScore = scores.INSULT?.summaryScore?.value || 0;
    const profanityScore = scores.PROFANITY?.summaryScore?.value || 0;
    const threatScore = scores.THREAT?.summaryScore?.value || 0;

    // Define thresholds
    const TOXICITY_THRESHOLD = 0.7;
    const SEVERE_THRESHOLD = 0.8;
    const WARNING_THRESHOLD = 0.5;

    // Determine severity and categories
    const categories = [];
    let severity = "none";
    let isToxic = false;

    if (toxicityScore >= SEVERE_THRESHOLD || severeToxicityScore >= 0.5) {
      severity = "severe";
      isToxic = true;
    } else if (toxicityScore >= TOXICITY_THRESHOLD) {
      severity = "high";
      isToxic = true;
    } else if (toxicityScore >= WARNING_THRESHOLD) {
      severity = "warning";
      isToxic = true;
    }

    // Add specific categories
    if (identityAttackScore >= 0.6) categories.push("identity_attack");
    if (insultScore >= 0.6) categories.push("insult");
    if (profanityScore >= 0.6) categories.push("profanity");
    if (threatScore >= 0.6) categories.push("threat");

    return {
      isToxic,
      toxicityScore: Math.round(toxicityScore * 100) / 100,
      severity,
      categories,
      scores: {
        toxicity: toxicityScore,
        severeToxicity: severeToxicityScore,
        identityAttack: identityAttackScore,
        insult: insultScore,
        profanity: profanityScore,
        threat: threatScore,
      }
    };

  } catch (error) {
    console.error("Error analyzing toxicity:", error);
    // Return safe defaults on error
    return {
      isToxic: false,
      toxicityScore: 0,
      severity: "none",
      categories: [],
      error: error.message
    };
  }
};

// Alternative: Simple keyword-based fallback (less accurate but works without API)
export const analyzeKeywordToxicity = (text) => {
  const toxicKeywords = [
    // Strong profanity
    "fuck", "shit", "bitch", "asshole", "damn", "hell",
    // Threats
    "kill", "die", "murder", "violence", "hurt", "harm",
    // Hate speech indicators
    "hate", "stupid", "idiot", "moron", "loser", "trash",
    // Add more as needed
  ];

  const lowerText = text.toLowerCase();
  const foundKeywords = toxicKeywords.filter(keyword => 
    lowerText.includes(keyword)
  );

  const severity = foundKeywords.length >= 3 ? "severe" : 
                  foundKeywords.length >= 2 ? "high" : 
                  foundKeywords.length >= 1 ? "warning" : "none";

  return {
    isToxic: foundKeywords.length > 0,
    toxicityScore: Math.min(foundKeywords.length * 0.3, 1),
    severity,
    categories: foundKeywords.length > 0 ? ["profanity"] : [],
    detectedKeywords: foundKeywords,
    method: "keyword_fallback"
  };
};

// Enhanced toxicity analysis with multiple methods and fallbacks
export const analyzeTextToxicity = async (text) => {
  console.log("🛡️ Starting toxicity analysis with method:", TOXICITY_CONFIG.preferredMethod);

  // If a specific method is requested, try only that method
  if (TOXICITY_CONFIG.preferredMethod === "django" && TOXICITY_CONFIG.enableDjango) {
    try {
      return await analyzeToxicityWithML(text);
    } catch (error) {
      console.error("❌ Django ML analysis failed:", error.message);
      if (!TOXICITY_CONFIG.enableKeywordFallback) throw error;
      return analyzeKeywordToxicity(text);
    }
  }

  if (TOXICITY_CONFIG.preferredMethod === "perspective" && TOXICITY_CONFIG.enablePerspective) {
    try {
      const result = await analyzeToxicity(text);
      return { ...result, method: "perspective_api" };
    } catch (error) {
      console.error("❌ Perspective API failed:", error.message);
      if (!TOXICITY_CONFIG.enableKeywordFallback) throw error;
      return analyzeKeywordToxicity(text);
    }
  }

  if (TOXICITY_CONFIG.preferredMethod === "keyword") {
    return analyzeKeywordToxicity(text);
  }

  // Auto mode: try methods in order of preference with fallbacks
  console.log("🤖 Auto mode: trying methods in order of preference");

  // Method 1: Try Django ML models first (most accurate)
  if (TOXICITY_CONFIG.enableDjango) {
    try {
      const result = await analyzeToxicityWithML(text);
      console.log("✅ Django ML analysis successful");
      return result;
    } catch (error) {
      console.warn("⚠️ Django ML analysis failed, trying next method:", error.message);
    }
  }

  // Method 2: Try Perspective API (Google's ML)
  if (TOXICITY_CONFIG.enablePerspective && PERSPECTIVE_API_KEY) {
    try {
      const result = await analyzeToxicity(text);
      console.log("✅ Perspective API analysis successful");
      return { ...result, method: "perspective_api" };
    } catch (error) {
      console.warn("⚠️ Perspective API failed, trying keyword fallback:", error.message);
    }
  }

  // Method 3: Fallback to keyword analysis
  if (TOXICITY_CONFIG.enableKeywordFallback) {
    console.log("📝 Using keyword-based toxicity analysis");
    return analyzeKeywordToxicity(text);
  }

  // If all methods are disabled, return safe defaults
  console.warn("⚠️ All toxicity detection methods are disabled");
  return {
    isToxic: false,
    toxicityScore: 0,
    severity: "none",
    categories: [],
    method: "disabled"
  };
};

// Export configuration for external use
export const getToxicityConfig = () => ({ ...TOXICITY_CONFIG });

// Helper function to determine sentiment based on toxicity
export const getSentimentFromToxicity = (toxicityData, originalSentiment = "neutral") => {
  // If message is toxic, override sentiment to negative
  if (toxicityData && toxicityData.isToxic) {
    return "negative";
  }
  
  // Otherwise, return the original sentiment
  return originalSentiment;
};

// Enhanced function to analyze toxicity with improved sentiment analysis
export async function analyzeTextToxicityWithEnhancedSentiment(text, selectedModel = 'svc') {
  try {
    console.log(`🛡️ [analyzeTextToxicityWithEnhancedSentiment] Starting analysis with model: ${selectedModel.toUpperCase()}`);
    
    // Step 1: Get enhanced sentiment analysis (with negation handling)
    let sentimentData = null;
    if (TOXICITY_CONFIG.enableEnhancedSentiment) {
      sentimentData = await getEnhancedSentiment(text, selectedModel);
    }
    
    // Step 2: Analyze toxicity
    const toxicityData = await analyzeTextToxicity(text);
    
    // Step 3: Determine final sentiment
    let finalSentiment;
    let sentimentSource;
    let sentimentOverridden = false;
    
    if (toxicityData.isToxic) {
      // Toxic content is always negative
      finalSentiment = "negative";
      sentimentSource = "toxicity_override";
      sentimentOverridden = sentimentData && sentimentData.sentiment !== "negative";
    } else if (sentimentData && sentimentData.enhanced) {
      // Use enhanced sentiment if available
      finalSentiment = sentimentData.sentiment;
      sentimentSource = "enhanced_analysis";
    } else {
      // Fallback to neutral
      finalSentiment = "neutral";
      sentimentSource = "fallback";
    }
    
    console.log("✅ Enhanced analysis complete:", {
      sentiment: finalSentiment,
      toxic: toxicityData.isToxic,
      source: sentimentSource
    });
    
    return {
      text: text,
      toxicity: toxicityData,
      sentiment: {
        value: finalSentiment,
        confidence: sentimentData ? sentimentData.confidence : 0,
        score: sentimentData ? sentimentData.score : 0,
        source: sentimentSource,
        wordAnalysis: sentimentData ? sentimentData.wordAnalysis : [],
        enhanced: sentimentData ? sentimentData.enhanced : false
      },
      sentimentOverridden,
      analysis: {
        enhancedSentimentUsed: sentimentData ? sentimentData.enhanced : false,
        toxicityMethod: toxicityData.method,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("❌ Error in enhanced toxicity analysis:", error);
    return {
      text: text,
      toxicity: {
        isToxic: false,
        toxicityScore: 0,
        severity: "none",
        categories: [],
        method: "error"
      },
      sentiment: {
        value: "neutral",
        confidence: 0,
        score: 0,
        source: "error_fallback",
        wordAnalysis: [],
        enhanced: false
      },
      sentimentOverridden: false,
      analysis: {
        enhancedSentimentUsed: false,
        toxicityMethod: "error",
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Enhanced function to analyze toxicity and determine appropriate sentiment
export const analyzeTextToxicityWithSentiment = async (text, originalSentiment = "neutral") => {
  try {
    const toxicityData = await analyzeTextToxicity(text);
    const finalSentiment = getSentimentFromToxicity(toxicityData, originalSentiment);
    
    return {
      toxicity: toxicityData,
      sentiment: finalSentiment,
      sentimentOverridden: toxicityData.isToxic && originalSentiment !== "negative"
    };
  } catch (error) {
    console.error("Error in toxicity analysis with sentiment:", error);
    return {
      toxicity: {
        isToxic: false,
        toxicityScore: 0,
        severity: "none",
        categories: [],
        method: "error"
      },
      sentiment: originalSentiment,
      sentimentOverridden: false
    };
  }
};