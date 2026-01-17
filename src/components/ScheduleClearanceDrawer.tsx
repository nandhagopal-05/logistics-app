import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface ScheduleClearanceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    job?: any;
    initialData?: any;
}

const ScheduleClearanceDrawer: React.FC<ScheduleClearanceDrawerProps> = ({ isOpen, onClose, onSave, job, initialData }) => {
    const [formData, setFormData] = useState({
        date: '',
        type: '',
        port: '',
        bl_awb: '',
        transport_mode: '',
        packages: '',
        clearance_method: '',
        remarks: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.clearance_date ? new Date(initialData.clearance_date).toISOString().split('T')[0] : '',
                type: initialData.clearance_type || '',
                port: initialData.port || '',
                bl_awb: initialData.bl_awb || '',
                transport_mode: initialData.transport_mode || '',
                packages: initialData.packages || '',
                clearance_method: initialData.clearance_method || '',
                remarks: initialData.remarks || ''
            });
        } else {
            setFormData({
                date: '',
                type: '',
                port: '',
                bl_awb: '',
                transport_mode: '',
                packages: '',
                clearance_method: '',
                remarks: ''
            });
        }
    }, [initialData, isOpen]);


    // Derived options from job
    // Assuming job has properties master_bl and house_bl (even if currently placeholders in UI, intention is clear)
    const blOptions = [job?.bl_awb_no, job?.house_bl].filter((opt) => opt && opt !== '-');

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
                <div className="h-full w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Reschedule Clearance' : 'New schedule clearance'}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Clearance Date */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clearance Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Clearance Type */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clearance Type</label>
                            <div className="relative">
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!formData.type ? 'text-gray-400' : 'text-gray-700'}`}
                                >
                                    <option value="" disabled>Select an option</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Express">Express</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Clearance Port */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clearance Port</label>
                            <div className="relative">
                                <select
                                    name="port"
                                    value={formData.port}
                                    onChange={handleInputChange}
                                    className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!formData.port ? 'text-gray-400' : 'text-gray-700'}`}
                                >
                                    <option value="" disabled>Select an option</option>
                                    <option value="MALE">MALE</option>
                                    <option value="HULHUMALE">HULHUMALE</option>
                                    <option value="MALE AIRPORT">MALE AIRPORT</option>
                                    <option value="ADDU">ADDU</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>


                        {/* Clearance Method */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clearance Method</label>
                            <div className="relative">
                                <select
                                    name="clearance_method"
                                    value={formData.clearance_method}
                                    onChange={handleInputChange}
                                    className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!formData.clearance_method ? 'text-gray-400' : 'text-gray-700'}`}
                                >
                                    <option value="" disabled>Select an option</option>
                                    <option value="DHONI">DHONI</option>
                                    <option value="LORRY">LORRY</option>
                                    <option value="OTHER">OTHER</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Select Clearing BL/AWB */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Clearing BL/AWB</label>
                            <div className="relative">
                                <select
                                    name="bl_awb"
                                    value={formData.bl_awb}
                                    onChange={handleInputChange}
                                    className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!formData.bl_awb ? 'text-gray-400' : 'text-gray-700'}`}
                                >
                                    <option value="" disabled>Select an option</option>
                                    {blOptions.length > 0 ? (
                                        blOptions.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No BL/AWB available</option>
                                    )}
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Clearance Transport Mode */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clearance Transport Mode</label>
                            <div className="relative">
                                <select
                                    name="transport_mode"
                                    value={formData.transport_mode}
                                    onChange={handleInputChange}
                                    className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!formData.transport_mode ? 'text-gray-400' : 'text-gray-700'}`}
                                >
                                    <option value="" disabled>Select an option</option>
                                    <option value="Sea">Sea</option>
                                    <option value="Air">Air</option>
                                    <option value="Road">Road</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Packages */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Packages</label>
                            <input
                                type="text"
                                name="packages"
                                value={formData.packages}
                                onChange={handleInputChange}
                                placeholder="e.g. 20 PKG"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-700"
                            />
                        </div>

                        {/* Remarks */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            ></textarea>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 actions-footer">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleClearanceDrawer;
