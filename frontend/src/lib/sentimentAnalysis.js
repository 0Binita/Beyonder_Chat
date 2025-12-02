export const analyzeConversationSentiment = (messages, currentUserId) => {
  if (!messages || messages.length === 0) {
    return { positive: 0, neutral: 0, negative: 0, conversationTone: 'neutral' };
  }

  // Separate messages by sender and receiver
  const userMessages = messages.filter(msg => msg.senderId === currentUserId);
  const otherMessages = messages.filter(msg => msg.senderId !== currentUserId);
  
  // Weight factors for different aspects of conversation analysis
  const weights = {
    recentMessages: 0.4,        // Recent messages have more impact
    sentimentFlow: 0.3,         // How sentiment changes over time
    reciprocity: 0.2,          // Balance between participants
    contextualShifts: 0.1      // Dramatic sentiment changes
  };

  // Analyze recent message bias (last 20% of conversation)
  const recentThreshold = Math.max(5, Math.floor(messages.length * 0.2));
  const recentMessages = messages.slice(-recentThreshold);
  const recentSentiment = analyzeSentimentDistribution(recentMessages);

  // Analyze sentiment flow over time
  const sentimentFlow = analyzeSentimentFlow(messages);

  // Analyze conversation reciprocity
  const reciprocity = analyzeReciprocity(userMessages, otherMessages);

  // Analyze contextual shifts (sudden sentiment changes)
  const contextualShifts = analyzeContextualShifts(messages);

  // Calculate weighted sentiment scores
  const finalSentiment = {
    positive: Math.round(
      (recentSentiment.positive * weights.recentMessages) +
      (sentimentFlow.positive * weights.sentimentFlow) +
      (reciprocity.positive * weights.reciprocity) +
      (contextualShifts.positive * weights.contextualShifts)
    ),
    neutral: Math.round(
      (recentSentiment.neutral * weights.recentMessages) +
      (sentimentFlow.neutral * weights.sentimentFlow) +
      (reciprocity.neutral * weights.reciprocity) +
      (contextualShifts.neutral * weights.contextualShifts)
    ),
    negative: Math.round(
      (recentSentiment.negative * weights.recentMessages) +
      (sentimentFlow.negative * weights.sentimentFlow) +
      (reciprocity.negative * weights.reciprocity) +
      (contextualShifts.negative * weights.contextualShifts)
    )
  };

  // Ensure percentages add up to 100
  const total = finalSentiment.positive + finalSentiment.neutral + finalSentiment.negative;
  if (total > 0) {
    finalSentiment.positive = Math.round((finalSentiment.positive / total) * 100);
    finalSentiment.neutral = Math.round((finalSentiment.neutral / total) * 100);
    finalSentiment.negative = Math.round((finalSentiment.negative / total) * 100);
  }

  // Determine overall conversation tone
  const conversationTone = determineConversationTone(finalSentiment, sentimentFlow, contextualShifts);

  return {
    ...finalSentiment,
    conversationTone,
    insights: {
      recentTrend: getRecentTrend(recentMessages, messages),
      reciprocityBalance: getReciprocityBalance(finalSentiment, userMessages, otherMessages),
      emotionalIntensity: contextualShifts.intensity
    }
  };
};

// Helper function to analyze basic sentiment distribution
const analyzeSentimentDistribution = (messages) => {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  
  messages.forEach((msg) => {
    if (msg.sentiment === "positive") counts.positive += 1;
    else if (msg.sentiment === "negative") counts.negative += 1;
    else counts.neutral += 1;
  });

  const total = counts.positive + counts.neutral + counts.negative;
  if (total === 0) return { positive: 0, neutral: 0, negative: 0 };

  return {
    positive: (counts.positive / total) * 100,
    neutral: (counts.neutral / total) * 100,
    negative: (counts.negative / total) * 100,
  };
};

// Analyze how sentiment changes throughout the conversation
const analyzeSentimentFlow = (messages) => {
  if (messages.length < 3) return analyzeSentimentDistribution(messages);

  const segments = Math.min(5, messages.length); // Divide into up to 5 segments
  const segmentSize = Math.floor(messages.length / segments);
  const sentimentScores = [];

  for (let i = 0; i < segments; i++) {
    const start = i * segmentSize;
    const end = i === segments - 1 ? messages.length : (i + 1) * segmentSize;
    const segmentMessages = messages.slice(start, end);
    const segmentSentiment = analyzeSentimentDistribution(segmentMessages);
    sentimentScores.push(segmentSentiment);
  }

  // Calculate trajectory (are things getting better or worse?)
  const firstHalf = sentimentScores.slice(0, Math.ceil(segments / 2));
  const secondHalf = sentimentScores.slice(Math.floor(segments / 2));

  const firstHalfAvg = averageSentiment(firstHalf);
  const secondHalfAvg = averageSentiment(secondHalf);

  // Weight more heavily toward the direction the conversation is heading
  const improvementFactor = (secondHalfAvg.positive - firstHalfAvg.positive) / 100;
  const deteriorationFactor = (secondHalfAvg.negative - firstHalfAvg.negative) / 100;

  return {
    positive: Math.max(0, secondHalfAvg.positive + (improvementFactor * 20)),
    neutral: secondHalfAvg.neutral,
    negative: Math.max(0, secondHalfAvg.negative + (deteriorationFactor * 20))
  };
};

// Analyze balance between conversation participants
const analyzeReciprocity = (userMessages, otherMessages) => {
  const userSentiment = analyzeSentimentDistribution(userMessages);
  const otherSentiment = analyzeSentimentDistribution(otherMessages);

  // Check if both participants are contributing similarly positive/negative energy
  const userPositivity = userSentiment.positive - userSentiment.negative;
  const otherPositivity = otherSentiment.positive - otherSentiment.negative;

  const balance = Math.abs(userPositivity - otherPositivity);
  const isBalanced = balance < 30; // Within 30% difference

  // If balanced and both positive, boost positive score
  // If balanced and both negative, this indicates mutual negativity
  if (isBalanced) {
    if (userPositivity > 0 && otherPositivity > 0) {
      return {
        positive: Math.max(userSentiment.positive, otherSentiment.positive) + 10,
        neutral: (userSentiment.neutral + otherSentiment.neutral) / 2,
        negative: Math.min(userSentiment.negative, otherSentiment.negative),
        balance: 'positive-mutual'
      };
    } else if (userPositivity < -10 && otherPositivity < -10) {
      return {
        positive: Math.min(userSentiment.positive, otherSentiment.positive),
        neutral: (userSentiment.neutral + otherSentiment.neutral) / 2,
        negative: Math.max(userSentiment.negative, otherSentiment.negative) + 10,
        balance: 'negative-mutual'
      };
    }
  }

  // Average the sentiments if not particularly balanced
  return {
    positive: (userSentiment.positive + otherSentiment.positive) / 2,
    neutral: (userSentiment.neutral + otherSentiment.neutral) / 2,
    negative: (userSentiment.negative + otherSentiment.negative) / 2,
    balance: isBalanced ? 'balanced' : 'imbalanced'
  };
};

// Analyze sudden sentiment changes that might indicate important moments
const analyzeContextualShifts = (messages) => {
  if (messages.length < 4) return analyzeSentimentDistribution(messages);

  let shiftIntensity = 0;
  let positiveShifts = 0;
  let negativeShifts = 0;

  for (let i = 2; i < messages.length; i++) {
    const prevMsg = messages[i - 2];
    const currentMsg = messages[i];

    const sentimentChange = getSentimentScore(currentMsg) - getSentimentScore(prevMsg);
    
    if (Math.abs(sentimentChange) > 1) { // Significant change
      shiftIntensity += Math.abs(sentimentChange);
      if (sentimentChange > 0) positiveShifts++;
      else negativeShifts++;
    }
  }

  const baseSentiment = analyzeSentimentDistribution(messages);
  
  // If there are many positive shifts, boost positive sentiment
  // If there are many negative shifts, this indicates volatility
  if (positiveShifts > negativeShifts && positiveShifts > 2) {
    return {
      positive: Math.min(100, baseSentiment.positive + (positiveShifts * 5)),
      neutral: baseSentiment.neutral,
      negative: Math.max(0, baseSentiment.negative - (positiveShifts * 2)),
      intensity: shiftIntensity
    };
  } else if (negativeShifts > positiveShifts && negativeShifts > 2) {
    return {
      positive: Math.max(0, baseSentiment.positive - (negativeShifts * 2)),
      neutral: baseSentiment.neutral,
      negative: Math.min(100, baseSentiment.negative + (negativeShifts * 3)),
      intensity: shiftIntensity
    };
  }

  return { ...baseSentiment, intensity: shiftIntensity };
};

// Helper functions
const getSentimentScore = (message) => {
  if (message.sentiment === 'positive') return 1;
  if (message.sentiment === 'negative') return -1;
  return 0;
};

const averageSentiment = (sentimentArray) => {
  if (sentimentArray.length === 0) return { positive: 0, neutral: 0, negative: 0 };
  
  const avg = {
    positive: sentimentArray.reduce((sum, s) => sum + s.positive, 0) / sentimentArray.length,
    neutral: sentimentArray.reduce((sum, s) => sum + s.neutral, 0) / sentimentArray.length,
    negative: sentimentArray.reduce((sum, s) => sum + s.negative, 0) / sentimentArray.length,
  };
  
  return avg;
};

const determineConversationTone = (sentiment, flow, shifts) => {
  // More accurate tone detection based on the dominant sentiment
  if (sentiment.positive > 50) return 'very-positive';
  if (sentiment.positive > sentiment.negative && sentiment.positive > 35) return 'positive';
  if (sentiment.negative > 50) return 'very-negative';
  if (sentiment.negative > sentiment.positive && sentiment.negative > 35) return 'negative';
  if (shifts.intensity > 10) return 'volatile';
  
  // Check if it's truly neutral/balanced
  const difference = Math.abs(sentiment.positive - sentiment.negative);
  if (difference < 15 && sentiment.neutral > 30) return 'neutral';
  
  return 'neutral';
};

const getRecentTrend = (recentMessages, allMessages) => {
  if (allMessages.length < 6) return 'stable'; // Need enough messages to compare
  
  // Compare recent sentiment vs earlier sentiment
  const recentThreshold = Math.max(3, Math.floor(allMessages.length * 0.3));
  const recentPortion = allMessages.slice(-recentThreshold);
  const earlierPortion = allMessages.slice(0, allMessages.length - recentThreshold);
  
  const recentSentiment = analyzeSentimentDistribution(recentPortion);
  const earlierSentiment = analyzeSentimentDistribution(earlierPortion);
  
  // Calculate the overall trend based on positive vs negative changes
  const positiveChange = recentSentiment.positive - earlierSentiment.positive;
  const negativeChange = recentSentiment.negative - earlierSentiment.negative;
  
  // Only show "improving" if:
  // 1. Positive sentiment increased significantly AND recent positive > recent negative, OR
  // 2. Negative sentiment decreased significantly AND overall trend is genuinely positive
  if ((positiveChange > 10 && recentSentiment.positive > recentSentiment.negative) || 
      (negativeChange < -15 && recentSentiment.positive >= recentSentiment.negative)) {
    return 'improving';
  }
  
  // Show "declining" if:
  // 1. Negative sentiment increased significantly, OR
  // 2. Positive sentiment decreased significantly
  if (negativeChange > 10 || positiveChange < -10) {
    return 'declining';
  }
  
  return 'stable';
};

// New function to determine reciprocity balance based on actual sentiment data
const getReciprocityBalance = (finalSentiment, userMessages, otherMessages) => {
  // If one of the participants has no messages, it's imbalanced
  if (userMessages.length === 0 || otherMessages.length === 0) {
    return 'imbalanced';
  }
  
  const userSentiment = analyzeSentimentDistribution(userMessages);
  const otherSentiment = analyzeSentimentDistribution(otherMessages);
  
  // Calculate positivity scores for each participant
  const userPositivity = userSentiment.positive - userSentiment.negative;
  const otherPositivity = otherSentiment.positive - otherSentiment.negative;
  
  // Check if both are positive (above 10% more positive than negative)
  if (userPositivity > 10 && otherPositivity > 10) {
    return 'positive-mutual';
  }
  
  // Check if both are negative (more negative than positive)
  if (userPositivity < -10 && otherPositivity < -10) {
    return 'negative-mutual';
  }
  
  // Check overall balance based on final sentiment
  if (finalSentiment.positive > finalSentiment.negative + 10) {
    return 'positive-leaning';
  } else if (finalSentiment.negative > finalSentiment.positive + 10) {
    return 'negative-leaning';
  } else {
    return 'balanced';
  }
};