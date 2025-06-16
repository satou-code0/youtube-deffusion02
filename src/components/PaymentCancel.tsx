import React from 'react';
import { XCircle, Home, CreditCard } from 'lucide-react';

interface PaymentCancelProps {
  onBackToHome: () => void;
  onRetryPayment: () => void;
}

export const PaymentCancel: React.FC<PaymentCancelProps> = ({ onBackToHome, onRetryPayment }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-orange-600" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4 text-orange-600">決済がキャンセルされました</h2>
        
        <p className="text-gray-600 mb-6">
          決済処理がキャンセルされました。<br/>
          有料プランをご希望の場合は、再度お試しください。
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onRetryPayment}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition-all flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-5 h-5" />
            <span>再度決済を試す</span>
          </button>
          
          <button
            onClick={onBackToHome}
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all flex items-center justify-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>ホームに戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 