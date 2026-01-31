import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface ShipmentInvoiceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

const ShipmentInvoiceDrawer: React.FC<ShipmentInvoiceDrawerProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<any>({
        invoice_no: '',
        invoice_items: '',

        customs_r_form: '',

    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                invoice_no: initialData?.invoice_no || '',
                invoice_items: initialData?.invoice_items || '',

                customs_r_form: initialData?.customs_r_form || '',

            });
        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);

    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
                <div className="h-full w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Shipment Invoice</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shipment Invoice Number*</label>
                            <input
                                name="invoice_no"
                                value={formData.invoice_no}
                                onChange={handleInputChange}
                                className="input-field w-full py-2 px-3 border rounded text-sm"
                                placeholder=""
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. of Items (Count)</label>
                                <input
                                    name="invoice_items"
                                    value={formData.invoice_items}
                                    onChange={handleInputChange}
                                    className="input-field w-full py-2 px-3 border rounded text-sm"
                                    placeholder=""
                                />
                            </div>

                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customs R No.</label>
                                <input
                                    name="customs_r_form"
                                    value={formData.customs_r_form}
                                    onChange={handleInputChange}
                                    className="input-field w-full py-2 px-3 border rounded text-sm"
                                    placeholder=""
                                />
                            </div>

                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShipmentInvoiceDrawer;
