# Enhanced sentiment analysis with negation handling for Django backend
# Add this to django_backend/sentiment/enhanced_sentiment.py

import re
from typing import Dict, List, Tuple, Optional

class EnhancedSentimentAnalyzer:
    """
    Enhanced sentiment analyzer that handles negation and context
    to improve accuracy over basic word-level models
    """
    
    def __init__(self):
        # Negation words that flip sentiment
        self.negation_words = {
            "not", "never", "no", "none", "nobody", "nothing", "neither", "nowhere",
            "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't",
            "can't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
            "without", "lacks", "lacking", "hardly", "barely", "rarely", "seldom"
        }
        
        # Intensity modifiers
        self.intensifiers = {
            "very": 1.5,
            "really": 1.4,
            "extremely": 1.8,
            "quite": 1.2,
            "somewhat": 0.8,
            "a bit": 0.7,
            "slightly": 0.6,
            "totally": 1.6,
            "completely": 1.7,
            "absolutely": 1.8,
            "highly": 1.4,
            "super": 1.5,
            "ultra": 1.6,
            "rather": 1.1,
            "pretty": 1.2,
            "fairly": 1.1
        }
        
        # Enhanced word sentiment scores (-1 to +1)
        self.word_sentiments = {
            # Positive words
            "good": 0.7, "great": 0.8, "awesome": 0.9, "excellent": 0.9,
            "amazing": 0.9, "wonderful": 0.8, "fantastic": 0.9, "love": 0.8,
            "happy": 0.7, "best": 0.9, "perfect": 1.0, "brilliant": 0.9,
            "nice": 0.6, "fine": 0.5, "beautiful": 0.8, "impressive": 0.7,
            "outstanding": 0.9, "superb": 0.9, "marvelous": 0.8, "delighted": 0.8,
            "pleased": 0.7, "satisfied": 0.6, "glad": 0.7, "thrilled": 0.9,
            "excited": 0.8, "cheerful": 0.7, "optimistic": 0.7, "positive": 0.6,
            
            # Negative words  
            "bad": -0.7, "terrible": -0.9, "awful": -0.9, "hate": -0.8,
            "worst": -0.9, "horrible": -0.9, "disgusting": -0.8, "stupid": -0.7,
            "ugly": -0.6, "sad": -0.6, "poor": -0.5, "wrong": -0.6,
            "disappointing": -0.7, "frustrating": -0.7, "annoying": -0.6,
            "unpleasant": -0.6, "disturbing": -0.7, "offensive": -0.8,
            "pathetic": -0.8, "useless": -0.7, "worthless": -0.8, "dreadful": -0.9,
            "miserable": -0.8, "depressing": -0.8, "negative": -0.6, "painful": -0.7
        }
    
    def preprocess_text(self, text: str) -> List[str]:
        """Clean and tokenize text"""
        # Convert to lowercase and split into words
        text = text.lower().strip()
        # Remove punctuation but keep contractions
        text = re.sub(r'[^\w\s\']', ' ', text)
        words = text.split()
        return [word.strip() for word in words if word.strip()]
    
    def find_negation_context(self, words: List[str], position: int, window: int = 3) -> bool:
        """Check if a word at given position is negated within the context window"""
        start = max(0, position - window)
        for i in range(start, position):
            if words[i] in self.negation_words:
                return True
        return False
    
    def find_intensity_modifier(self, words: List[str], position: int, window: int = 2) -> float:
        """Find intensity modifiers in the context window"""
        start = max(0, position - window)
        for i in range(start, position):
            word = words[i]
            if word in self.intensifiers:
                return self.intensifiers[word]
            # Handle multi-word intensifiers like "a bit"
            if i < len(words) - 1:
                two_word = f"{word} {words[i + 1]}"
                if two_word in self.intensifiers:
                    return self.intensifiers[two_word]
        return 1.0
    
    def analyze_sentiment(self, text: str) -> Dict:
        """
        Analyze sentiment with negation and context awareness
        
        Returns:
            Dict containing sentiment analysis results
        """
        if not text or not text.strip():
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "score": 0.0,
                "word_analysis": [],
                "method": "enhanced_context_aware"
            }
        
        words = self.preprocess_text(text)
        total_score = 0.0
        sentiment_word_count = 0
        word_analysis = []
        
        for i, word in enumerate(words):
            if word in self.word_sentiments:
                original_score = self.word_sentiments[word]
                current_score = original_score
                
                # Check for negation
                is_negated = self.find_negation_context(words, i)
                if is_negated:
                    current_score = -current_score
                
                # Apply intensity modifiers
                intensity = self.find_intensity_modifier(words, i)
                current_score *= intensity
                
                total_score += current_score
                sentiment_word_count += 1
                
                word_analysis.append({
                    "word": word,
                    "original_score": original_score,
                    "final_score": current_score,
                    "is_negated": is_negated,
                    "intensity_multiplier": intensity,
                    "sentiment": "positive" if current_score > 0 else "negative" if current_score < 0 else "neutral"
                })
        
        # Calculate final sentiment
        if sentiment_word_count == 0:
            avg_score = 0.0
            sentiment = "neutral"
            confidence = 0.0
        else:
            avg_score = total_score / sentiment_word_count
            
            # Determine sentiment with thresholds
            if avg_score > 0.2:
                sentiment = "positive"
            elif avg_score < -0.2:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            # Calculate confidence (0-1 scale)
            confidence = min(abs(avg_score), 1.0)
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "score": avg_score,
            "word_analysis": word_analysis,
            "method": "enhanced_context_aware",
            "text": text,
            "word_count": len(words),
            "sentiment_words_found": sentiment_word_count
        }
    
    def batch_analyze(self, texts: List[str]) -> List[Dict]:
        """Analyze multiple texts efficiently"""
        return [self.analyze_sentiment(text) for text in texts]
    
    def is_negative_sentiment(self, text: str, threshold: float = -0.2) -> bool:
        """Quick check if text has negative sentiment"""
        result = self.analyze_sentiment(text)
        return result["score"] < threshold
    
    def is_positive_sentiment(self, text: str, threshold: float = 0.2) -> bool:
        """Quick check if text has positive sentiment"""
        result = self.analyze_sentiment(text)
        return result["score"] > threshold


# Usage example and test function
def test_enhanced_sentiment():
    """Test the enhanced sentiment analyzer"""
    analyzer = EnhancedSentimentAnalyzer()
    
    test_cases = [
        "you are not good",
        "you are good", 
        "this is not bad",
        "you are very good",
        "this is not very good",
        "really terrible performance",
        "this is really not that bad",
        "I don't love this",
        "excellent work today",
        "this isn't terrible",
        "I am not happy at all",
        "extremely good performance",
        "somewhat disappointing results"
    ]
    
    print("🧪 Enhanced Sentiment Analysis Test Results\n")
    print("=" * 60)
    
    for text in test_cases:
        result = analyzer.analyze_sentiment(text)
        print(f"\nText: '{text}'")
        print(f"Sentiment: {result['sentiment']} (score: {result['score']:.3f}, confidence: {result['confidence']:.1%})")
        
        if result['word_analysis']:
            print("Word analysis:")
            for word_info in result['word_analysis']:
                flags = []
                if word_info['is_negated']:
                    flags.append("NEGATED")
                if word_info['intensity_multiplier'] != 1.0:
                    flags.append(f"{word_info['intensity_multiplier']}x")
                
                flag_str = f" [{', '.join(flags)}]" if flags else ""
                print(f"  '{word_info['word']}': {word_info['sentiment']} ({word_info['original_score']} → {word_info['final_score']:.2f}){flag_str}")
        
        print("-" * 40)

if __name__ == "__main__":
    test_enhanced_sentiment()