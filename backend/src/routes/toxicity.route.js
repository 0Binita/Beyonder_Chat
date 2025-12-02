import express from "express";
import { analyzeToxicity, analyzeKeywordToxicity, analyzeTextToxicity } from "../lib/toxicity.js";

const router = express.Router();

// Test endpoint for toxicity detection
router.post("/test-toxicity", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    console.log("Testing comprehensive toxicity analysis for:", text);

    // Use the enhanced toxicity analysis
    const result = await analyzeTextToxicity(text);

    res.json({
      text,
      toxicity: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in toxicity test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;