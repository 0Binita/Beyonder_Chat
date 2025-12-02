import numpy as np 
class NaiveBayesClassifier:
    def __init__(self):
        self.vocab = set()
        self.class_word_counts = {}
        self.class_counts = {}
    
    def train(self, X_train, y_train):
        for x, y in zip(X_train, y_train):
            if y not in self.class_word_counts:
                self.class_word_counts[y] = {}
                self.class_counts[y] = 0
            self.class_counts[y] += 1
            words = x.split()
            for word in words:
                self.vocab.add(word)
                if word not in self.class_word_counts[y]:
                    self.class_word_counts[y][word] = 0
                self.class_word_counts[y][word] += 1
    
    def predict(self, X_test):
        y_pred = []
        for x in X_test:
            max_prob = float('-inf')
            best_class = None
            for cls in self.class_counts.keys():
                prob = self.calculate_class_probability(x, cls)
                if prob > max_prob:
                    max_prob = prob
                    best_class = cls
            y_pred.append(best_class)
        return y_pred
    
    def calculate_class_probability(self, x, cls):
        log_prob = np.log(self.class_counts[cls]) - np.log(sum(self.class_counts.values()))
        words = x.split()
        for word in words:
            if word in self.vocab:
                log_prob += np.log(self.calculate_word_probability(word, cls))
        return log_prob
    
    def calculate_word_probability(self, word, cls):
        count_word_cls = self.class_word_counts[cls].get(word, 0) + 1  # Laplace smoothing
        count_all_cls = sum(self.class_word_counts[cls].values()) + len(self.vocab)
        return count_word_cls / count_all_cls


