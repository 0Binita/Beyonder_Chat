import os
import pickle
import traceback
import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# Import your NaiveBayesClassifier class if needed
from sentiment.naive_bayes import NaiveBayesClassifier
# Import the enhanced sentiment analyzer
from sentiment.enhanced_sentiment import EnhancedSentimentAnalyzer  

# Base directory setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths to your saved models
NB_MODEL_PATH = os.path.join(BASE_DIR, 'Beyonder', 'nb_classifier.pkl')
SVC_MODEL_PATH = os.path.join(BASE_DIR, 'Beyonder', 'svm_classifier.pkl')


class SentimentAPIView(APIView):
    def __init__(self):
        super().__init__()
        # Initialize the enhanced sentiment analyzer
        self.enhanced_analyzer = EnhancedSentimentAnalyzer()
    
    def post(self, request):
        print("🚀 Request received for sentiment analysis")

        model_name = request.data.get('model')
        text = request.data.get('text', '').strip()
        use_enhanced = request.data.get('use_enhanced', True)  # New option for enhanced analysis

        if not text:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)

        # If enhanced analysis is requested, use the context-aware analyzer
        if use_enhanced:
            try:
                print(f"🔍 Using enhanced sentiment analysis for: '{text}'")
                result = self.enhanced_analyzer.analyze_sentiment(text)
                
                return Response({
                    'sentiment': result['sentiment'],
                    'confidence': result['confidence'],
                    'score': result['score'],
                    'method': result['method'],
                    'word_analysis': result['word_analysis'],
                    'enhanced': True
                })
                
            except Exception as e:
                print(f"❌ Enhanced sentiment analysis error: {e}")
                traceback.print_exc()
                # Fall back to regular model analysis
                use_enhanced = False

        # Handle Naive Bayes model
        if model_name == 'nb':
            try:
                with open(NB_MODEL_PATH, 'rb') as f:
                    nb_classifier = pickle.load(f)
                    print("✅ NB model loaded successfully")
                    print(f"📝 Model type: {type(nb_classifier)}")
            except Exception as e:
                print("❌ Failed to load NB model:")
                print(f"❌ Error: {e}")
                traceback.print_exc()
                return Response({'error': 'NB model not loaded'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            try:
                print(f"🔍 Input text: '{text}'")
                print(f"🔍 Text type: {type(text)}")
                
                # Ensure text is processed as expected by the custom NB classifier
                # The custom classifier expects a list of strings
                prediction = nb_classifier.predict([text])
                print(f"✅ NB prediction successful: {prediction}")
                print(f"📝 Prediction type: {type(prediction)}")
                
                if prediction and len(prediction) > 0:
                    return Response({'sentiment': prediction[0]})
                else:
                    print("❌ Empty prediction result")
                    return Response({'error': 'No prediction returned'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except Exception as e:
                print(f"❌ NB prediction error: {e}")
                print(f"❌ Error type: {type(e)}")
                traceback.print_exc()
                return Response({'error': f'NB prediction failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Handle SVC model (with TF-IDF vectorizer)
        elif model_name == 'svc':
            try:
                with open(SVC_MODEL_PATH, 'rb') as f:
                    tfidf_vectorizer, svm_classifier = pickle.load(f)
                    print("✅ SVC model loaded successfully")
            except Exception:
                print("❌ Failed to load SVC model:")
                traceback.print_exc()
                return Response({'error': 'SVC model not loaded'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            try:
                # Vectorize the input text using loaded TF-IDF vectorizer
                X_input = tfidf_vectorizer.transform([text])
                prediction = svm_classifier.predict(X_input)
                return Response({'sentiment': prediction[0]})
            except Exception as e:
                print(f"❌ SVC prediction error: {e}")
                return Response({'error': f'SVC prediction failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            return Response({'error': 'Invalid model selection. Choose "nb" or "svc".'}, status=status.HTTP_400_BAD_REQUEST)


class ToxicityAPIView(APIView):
    def __init__(self):
        super().__init__()
        # Initialize the enhanced sentiment analyzer
        self.enhanced_analyzer = EnhancedSentimentAnalyzer()
        # Define toxicity keywords and patterns
        self.profanity_keywords = [
            'fuck', 'shit', 'damn', 'hell', 'bitch', 'asshole', 'bastard', 'crap',
            'piss', 'slut', 'whore', 'dickhead', 'motherfucker', 'cocksucker'  # Fixed the incomplete string
        ]
        
        self.threat_keywords = [
            'kill', 'murder', 'die', 'death', 'hurt', 'harm', 'violence', 'attack',
            'destroy', 'beat', 'punch', 'shoot', 'stab', 'bomb', 'threat'
        ]
        
        self.hate_keywords = [
            'hate', 'stupid', 'idiot', 'moron', 'loser', 'trash', 'garbage',
            'worthless', 'pathetic', 'disgusting', 'ugly', 'fat', 'dumb'
        ]
        
        self.identity_attack_keywords = [
            'racist',
            # Add more carefully selected terms
        ]

    def analyze_toxicity_with_ml(self, text):
        """
        Analyze toxicity using ML models and keyword detection
        """
        try:
            # First, get sentiment analysis
            sentiment_score = self.get_sentiment_analysis(text)
            
            # Keyword-based toxicity analysis
            toxicity_data = self.analyze_keywords(text)
            
            # Combine ML sentiment with keyword analysis for better accuracy
            if sentiment_score == 'negative':
                # If sentiment is negative and we have toxic keywords, increase severity
                if toxicity_data['isToxic']:
                    if toxicity_data['severity'] == 'warning':
                        toxicity_data['severity'] = 'high'
                    elif toxicity_data['severity'] == 'high':
                        toxicity_data['severity'] = 'severe'
                    
                    # Increase toxicity score
                    toxicity_data['toxicityScore'] = min(toxicity_data['toxicityScore'] + 0.2, 1.0)
                # Note: Removed automatic toxicity flagging for negative sentiment
                # as it was causing false positives for legitimate emotions like "sad"
            
            return toxicity_data
            
        except Exception as e:
            print(f"❌ ML toxicity analysis error: {e}")
            # Fallback to keyword-only analysis
            return self.analyze_keywords(text)

    def get_sentiment_analysis(self, text):
        """
        Get sentiment analysis using enhanced analyzer first, then fallback to models
        """
        try:
            # First try enhanced analyzer (with negation handling)
            result = self.enhanced_analyzer.analyze_sentiment(text)
            return result['sentiment']
            
        except Exception as e:
            print(f"❌ Enhanced sentiment analysis error, falling back to NB model: {e}")
            
            try:
                # Fallback to Naive Bayes model
                with open(NB_MODEL_PATH, 'rb') as f:
                    nb_classifier = pickle.load(f)
                
                prediction = nb_classifier.predict([text])
                return prediction[0] if prediction else 'neutral'
                
            except Exception as e2:
                print(f"❌ NB model sentiment analysis error: {e2}")
                return 'neutral'

    def analyze_keywords(self, text):
        """
        Analyze text for toxic keywords and patterns
        """
        text_lower = text.lower()
        
        # Remove special characters for better matching
        clean_text = re.sub(r'[^\w\s]', ' ', text_lower)
        words = clean_text.split()
        
        # Use exact word matching to avoid false positives (e.g., "hello" containing "hell")
        found_profanity = [word for word in words if word in self.profanity_keywords]
        found_threats = [word for word in words if word in self.threat_keywords]
        found_hate = [word for word in words if word in self.hate_keywords]
        found_identity_attacks = [word for word in words if word in self.identity_attack_keywords]
        
        all_found = found_profanity + found_threats + found_hate + found_identity_attacks
        
        # Determine categories
        categories = []
        if found_profanity:
            categories.append('profanity')
        if found_threats:
            categories.append('threat')
        if found_hate:
            categories.append('insult')
        if found_identity_attacks:
            categories.append('identity_attack')
        
        # Calculate toxicity score and severity
        total_keywords = len(all_found)
        
        if total_keywords == 0:
            return {
                'isToxic': False,
                'toxicityScore': 0.0,
                'severity': 'none',
                'categories': [],
                'detectedKeywords': []
            }
        
        # Score calculation
        score = min(total_keywords * 0.25, 1.0)
        
        # Add weight for different types of toxicity
        if found_threats:
            score += 0.3  # Threats are more severe
        if found_identity_attacks:
            score += 0.25  # Identity attacks are severe
        
        score = min(score, 1.0)
        
        # Determine severity
        if score >= 0.8:
            severity = 'severe'
        elif score >= 0.6:
            severity = 'high'
        elif score >= 0.3:
            severity = 'warning'
        else:
            severity = 'none'
        
        return {
            'isToxic': total_keywords > 0,
            'toxicityScore': round(score, 2),
            'severity': severity,
            'categories': categories,
            'detectedKeywords': all_found[:5]  # Limit to first 5 keywords
        }

    def post(self, request):
        print("🛡️ Request received for toxicity analysis")
        
        text = request.data.get('text', '').strip()
        use_ml = request.data.get('use_ml', True)  # Default to using ML
        original_sentiment = request.data.get('sentiment', 'neutral')
        
        if not text:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if use_ml:
                result = self.analyze_toxicity_with_ml(text)
                result['method'] = 'ml_enhanced'
            else:
                result = self.analyze_keywords(text)
                result['method'] = 'keyword_only'
            
            # Auto-determine sentiment: toxic messages are always negative
            final_sentiment = 'negative' if result['isToxic'] else original_sentiment
            sentiment_overridden = result['isToxic'] and original_sentiment != 'negative'
            
            return Response({
                'text': text,
                'toxicity': result,
                'sentiment': final_sentiment,
                'sentimentOverridden': sentiment_overridden,
                'timestamp': '2024-12-19T00:00:00Z'  # You might want to use datetime.now()
            })
            
        except Exception as e:
            print(f"❌ Toxicity analysis error: {e}")
            traceback.print_exc()
            return Response({
                'error': 'Toxicity analysis failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EnhancedSentimentAPIView(APIView):
    """
    Dedicated endpoint for enhanced sentiment analysis with negation handling
    """
    def __init__(self):
        super().__init__()
        self.enhanced_analyzer = EnhancedSentimentAnalyzer()
    
    def post(self, request):
        print("✨ Request received for enhanced sentiment analysis")
        
        text = request.data.get('text', '').strip()
        model_name = request.data.get('model', 'svc')  # Get model selection
        
        if not text:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # First, use enhanced analyzer for negation handling
            result = self.enhanced_analyzer.analyze_sentiment(text)
            
            # If confidence is low or neutral, use the selected ML model for verification
            if result['confidence'] < 0.5 or result['sentiment'] == 'neutral':
                print(f"🔍 Low confidence or neutral, using {model_name} model for verification")
                
                try:
                    # Use the selected model
                    if model_name == 'nb':
                        with open(NB_MODEL_PATH, 'rb') as f:
                            nb_classifier = pickle.load(f)
                        prediction = nb_classifier.predict([text])
                        ml_sentiment = prediction[0] if prediction else 'neutral'
                    else:  # svc
                        with open(SVC_MODEL_PATH, 'rb') as f:
                            tfidf_vectorizer, svm_classifier = pickle.load(f)
                        X_input = tfidf_vectorizer.transform([text])
                        prediction = svm_classifier.predict(X_input)
                        ml_sentiment = prediction[0] if prediction else 'neutral'
                    
                    # Combine enhanced and ML results
                    if result['sentiment'] == 'neutral' and ml_sentiment != 'neutral':
                        result['sentiment'] = ml_sentiment
                        result['confidence'] = 0.6
                        result['method'] = f'enhanced_with_{model_name}_fallback'
                    
                except Exception as e:
                    print(f"❌ ML model verification failed: {e}")
            
            return Response({
                'text': text,
                'sentiment': result['sentiment'],
                'confidence': result['confidence'],
                'score': result['score'],
                'method': result.get('method', 'enhanced_context_aware'),
                'model_used': model_name,
                'word_analysis': result['word_analysis'],
                'word_count': result['word_count'],
                'sentiment_words_found': result['sentiment_words_found'],
                'timestamp': '2024-12-19T00:00:00Z'
            })
            
        except Exception as e:
            print(f"❌ Enhanced sentiment analysis error: {e}")
            traceback.print_exc()
            return Response({
                'error': 'Enhanced sentiment analysis failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """
        Test endpoint with predefined examples
        """
        test_cases = [
            "you are not good",
            "you are good", 
            "this is not bad",
            "you are very good",
            "this is not very good",
            "I don't love this",
            "excellent work today",
            "this isn't terrible"
        ]
        
        results = []
        for text in test_cases:
            try:
                result = self.enhanced_analyzer.analyze_sentiment(text)
                results.append({
                    'text': text,
                    'sentiment': result['sentiment'],
                    'score': result['score'],
                    'confidence': result['confidence'],
                    'word_analysis': result['word_analysis']
                })
            except Exception as e:
                results.append({
                    'text': text,
                    'error': str(e)
                })
        
        return Response({
            'test_results': results,
            'total_tests': len(test_cases),
            'enhanced_features': [
                'Negation detection (not, don\'t, isn\'t, etc.)',
                'Intensity modifiers (very, really, extremely)',
                'Context-aware analysis (2-word window)',
                'Numerical scoring (-1 to +1)',
                'Confidence calculation'
            ]
        })
