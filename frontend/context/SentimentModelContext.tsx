// context/SentimentModelContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ModelType = "nb" | "svc";

interface SentimentModelContextType {
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;
}

const SentimentModelContext = createContext<SentimentModelContextType | undefined>(undefined);

export const SentimentModelProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage or default to "svc"
  const [selectedModel, setSelectedModelState] = useState<ModelType>(() => {
    const saved = localStorage.getItem('selectedSentimentModel');
    return (saved as ModelType) || "svc";
  });

  // Persist to localStorage whenever the model changes
  const setSelectedModel = (model: ModelType) => {
    setSelectedModelState(model);
    localStorage.setItem('selectedSentimentModel', model);
  };

  return (
    <SentimentModelContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </SentimentModelContext.Provider>
  );
};

export const useSentimentModel = () => {
  const context = useContext(SentimentModelContext);
  if (!context) {
    throw new Error("useSentimentModel must be used within SentimentModelProvider");
  }
  return context;
};
