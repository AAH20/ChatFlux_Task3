import React from 'react';

/**
 * Modal component
 * 
 * Displays a modal dialog
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Modal title
 * @param {function} onClose - Function to close the modal
 * @param {function} onConfirm - Function to handle confirmation
 * @param {React.ReactNode} children - Modal content
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @param {boolean} isConfirmDisabled - Whether confirm button is disabled
 */
const Modal = ({
  isOpen,
  title,
  onClose,
  onConfirm,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isConfirmDisabled = false
}) => {
  if (!isOpen) return null;
  
  // Close modal when clicking backdrop (outside modal content)
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Prevent keyboard events from propagating outside the modal
  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-button cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className="modal-button confirm"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal; 