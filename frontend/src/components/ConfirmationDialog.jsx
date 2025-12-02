import { X } from "lucide-react";

const ConfirmationDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  isLoading = false,
  isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-base-100 rounded-lg max-w-sm w-full border border-base-300 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-base-content">{title}</h3>
          <button 
            onClick={onCancel}
            className="text-base-content/60 hover:text-base-content transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-base-content/80 text-center mb-6">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-base-200 hover:bg-base-300 text-base-content px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 text-primary-content ${
              isDangerous 
                ? "bg-error hover:bg-error/90" 
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
