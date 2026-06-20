import { useState } from "react";

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [resolvePromise, setResolvePromise] = useState<
    ((val: boolean) => void) | null
  >(null);

  const confirmAction = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTitle(title);
      setMessage(message);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    if (resolvePromise) resolvePromise(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) resolvePromise(false);
    setIsOpen(false);
  };

  const ConfirmModal = () => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-base/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-surface border border-border-default rounded-xl shadow-xl p-6 max-w-sm w-full">
          <h3 className="text-lg font-medium text-primary mb-2">{title}</h3>
          <p className="text-sm text-secondary mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { confirm: confirmAction, ConfirmModal };
}
