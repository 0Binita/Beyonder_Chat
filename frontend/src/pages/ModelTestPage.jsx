import { useState } from "react";
import { useSentimentModel } from "../../context/SentimentModelContext";
import { axiosInstance } from "../lib/axios";

const ModelTestPage = () => {
  const { selectedModel, setSelectedModel } = useSentimentModel();
  const [testText, setTestText] = useState("you are not good");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testSentiment = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log(`🧪 Testing with model: ${selectedModel}`);
      console.log(`📝 Input text: "${testText}"`);

      // Send test message to Django API directly
      const response = await fetch('http://127.0.0.1:8000/api/sentiment/enhanced/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: testText,
          model: selectedModel 
        })
      });

      const data = await response.json();
      
      console.log(`✅ Result from ${selectedModel}:`, data);
      
      setResult({
        model: selectedModel,
        sentiment: data.sentiment,
        confidence: data.confidence,
        model_used: data.model_used,
        method: data.method,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 bg-base-100">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">🧪 Model Switching Test</h2>
            
            {/* Model Selector */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-bold">Select Model:</span>
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedModel('nb')}
                  className={`btn ${selectedModel === 'nb' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Naive Bayes {selectedModel === 'nb' && '✓'}
                </button>
                <button
                  onClick={() => setSelectedModel('svc')}
                  className={`btn ${selectedModel === 'svc' ? 'btn-secondary' : 'btn-outline'}`}
                >
                  SVC {selectedModel === 'svc' && '✓'}
                </button>
              </div>
              <div className="badge badge-lg mt-2">
                Currently Active: {selectedModel === 'nb' ? 'Naive Bayes' : 'Support Vector Classifier'}
              </div>
            </div>

            {/* Test Input */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-bold">Test Text:</span>
              </label>
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="input input-bordered"
                placeholder="Enter text to analyze..."
              />
            </div>

            {/* Test Button */}
            <button
              onClick={testSentiment}
              disabled={loading || !testText.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Testing...
                </>
              ) : (
                'Test Sentiment Analysis'
              )}
            </button>

            {/* Results */}
            {result && (
              <div className="mt-6 p-4 bg-base-100 rounded-lg">
                <h3 className="font-bold mb-3">Results:</h3>
                {result.error ? (
                  <div className="alert alert-error">
                    <span>Error: {result.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Model Used:</span>
                      <div className={`badge ${result.model === 'nb' ? 'badge-primary' : 'badge-secondary'}`}>
                        {result.model_used || result.model}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Sentiment:</span>
                      <div className={`badge ${
                        result.sentiment === 'positive' ? 'badge-success' :
                        result.sentiment === 'negative' ? 'badge-error' :
                        'badge-warning'
                      }`}>
                        {result.sentiment}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Confidence:</span>
                      <span>{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Method:</span>
                      <span className="text-sm">{result.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Timestamp:</span>
                      <span className="text-xs">{result.timestamp}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="alert alert-info mt-6">
              <div>
                <h4 className="font-bold">How to verify model switching:</h4>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Select a model (NB or SVC)</li>
                  <li>Enter test text (e.g., "you are not good")</li>
                  <li>Click "Test Sentiment Analysis"</li>
                  <li>Check console logs for model confirmation</li>
                  <li>Switch models and test again to see differences</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelTestPage;
