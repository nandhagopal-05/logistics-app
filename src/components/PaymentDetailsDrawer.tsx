import React from 'react';
import { X, FileText, Receipt } from 'lucide-react';

interface PaymentDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    payment: any;
}

const PaymentDetailsDrawer: React.FC<PaymentDetailsDrawerProps> = ({ isOpen, onClose, payment }) => {
    if (!isOpen || !payment) return null;

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-MV', { style: 'currency', currency: 'MVR' }).format(Number(amount));
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const voucherNo = `VC.${new Date(payment.created_at).getFullYear()}.${String(payment.id).padStart(4, '0')}`;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 max-w-md w-full flex animate-slide-in-right">
                <div className="h-full w-full bg-white shadow-2xl flex flex-col">

                    {/* Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* Vendor Section */}
                        <div className="mb-8">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Paid to</p>
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-gray-900">{payment.vendor}</h3>
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <FileText className="w-5 h-5 text-gray-600" />
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Voucher #</p>
                                <p className="text-sm font-medium text-gray-900">{voucherNo}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Reference</p>
                                <p className="text-sm font-medium text-gray-900 break-words">{payment.bill_ref_no || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Total</p>
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                            </div>
                        </div>

                        {/* Payment Items */}
                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-gray-900 mb-4">Payment Items</h4>
                            <div className="space-y-3">
                                {/* Single Item since our DB structure is 1 row per payment request currently */}
                                <div className="flex items-center gap-4 py-3 border-b border-gray-50">
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                        <Receipt className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xs font-medium text-gray-500">{payment.job_id}</span>
                                            <span className="text-sm font-medium text-gray-900">{payment.payment_type}</span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="text-sm text-gray-500">
                            Paid on {formatDate(payment.created_at)}
                        </div>

                    </div>

                    {/* Footer Actions (Optional/Placeholder) */}
                    {/* If needed we can add print/download buttons here later */}
                </div>
            </div>
        </div>
    );
};

export default PaymentDetailsDrawer;
