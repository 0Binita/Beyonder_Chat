import { AlertTriangle, Shield, ShieldAlert, AlertOctagon } from "lucide-react";

const ToxicityWarning = ({ toxicity, showSentimentOverride = true }) => {
  if (!toxicity || !toxicity.isToxic) {
    return null;
  }

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          message: "This message may contain mildly inappropriate content"
        };
      case "high":
        return {
          icon: ShieldAlert,
          color: "text-orange-500",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          message: "This message contains potentially harmful content"
        };
      case "severe":
        return {
          icon: AlertOctagon,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          message: "This message contains highly toxic content"
        };
      default:
        return {
          icon: Shield,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          message: "Content flagged for review"
        };
    }
  };

  const config = getSeverityConfig(toxicity.severity);
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 p-2 mb-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
      <div className="text-xs">
        <p className={`font-medium ${config.color}`}>Content Warning</p>
        <p className="text-gray-600">{config.message}</p>
        {toxicity.categories && toxicity.categories.length > 0 && (
          <p className="text-gray-500 mt-1">
            Categories: {toxicity.categories.join(", ")}
          </p>
        )}
        <p className="text-gray-400 mt-1">
          Confidence: {Math.round(toxicity.toxicityScore * 100)}%
        </p>
        {showSentimentOverride && (
          <p className="text-gray-500 mt-1 italic">
            ⚠️ Sentiment automatically set to negative due to toxic content
          </p>
        )}
      </div>
    </div>
  );
};

export default ToxicityWarning;