import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface BLDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    deliveryAgents?: any[];
    job?: any;
}

const PACKAGE_TYPES = ['PALLET', 'BUNDLES', 'CARTON', 'PKG', 'BOX', 'CASE', 'BULK', 'UNIT'];

const BLDrawer: React.FC<BLDrawerProps> = ({ isOpen, onClose, onSave, initialData, deliveryAgents = [] }) => {
    const [formData, setFormData] = useState<any>({
        master_bl: '',
        house_bl: '',
        loading_port: '',
        vessel: '',
        etd: '',
        eta: '',
        delivery_agent: '',
        containers: [],
        packages: []
    });

    const [newPackage, setNewPackage] = useState<any>({
        pkg_count: '',
        pkg_type: 'PKG', // Default
        weight: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    // If we were editing, we might need to load linked containers/packages differently 
                    // dependent on how backend returns them. For now assume standard structure.
                });
            } else {
                setFormData({
                    master_bl: '',
                    house_bl: '',
                    loading_port: '',
                    vessel: '',
                    etd: '',
                    eta: '',
                    delivery_agent: '',
                    containers: [],
                    packages: []
                });
            }
            // Reset temp line item
            setNewPackage({
                pkg_count: '',
                pkg_type: 'PKG',
                weight: ''
            });
        }
    }, [isOpen, initialData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewPackage((prev: any) => ({ ...prev, [name]: value }));
    };

    const addLineItem = () => {
        if (!newPackage.pkg_count) {
            alert("Please enter Package Count");
            return;
        }

        const item = { ...newPackage, id: Date.now() }; // Temporary ID
        setFormData((prev: any) => ({
            ...prev,
            packages: [...(prev.packages || []), item]
        }));

        setNewPackage({
            pkg_count: '',
            pkg_type: 'PKG',
            weight: ''
        });
    };

    const removeLineItem = (index: number) => {
        setFormData((prev: any) => ({
            ...prev,
            packages: prev.packages.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleSubmit = () => {
        if (!formData.master_bl && !formData.house_bl) {
            alert("Master No or House No is required");
            return;
        }
        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
                <div className="h-full w-full bg-white shadow-2xl flex flex-col animate-slide-in-right">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Shipment BL/AWB</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Master Number*</label>
                                <input name="master_bl" value={formData.master_bl} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm" placeholder="Enter Master No" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">House Number</label>
                                <input name="house_bl" value={formData.house_bl} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm" placeholder="Enter House No" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loading Port*</label>
                                <input name="loading_port" value={formData.loading_port} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vessel*</label>
                                <input name="vessel" value={formData.vessel} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ETD</label>
                                <input type="date" name="etd" value={formData.etd} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ETA</label>
                                <input type="date" name="eta" value={formData.eta} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Delivery Agent*</label>
                            <div className="relative">
                                <select name="delivery_agent" value={formData.delivery_agent} onChange={handleInputChange} className="input-field w-full py-2 px-3 border rounded text-sm appearance-none bg-white">
                                    <option value="">Select an option</option>
                                    {deliveryAgents.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Package Details Section */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-900">Package Details</h3>
                                <button className="text-gray-400 hover:text-gray-600"><Plus className="w-4 h-4" /></button>
                            </div>

                            <div className="space-y-4 mb-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Packages*</label>
                                        <input type="number" name="pkg_count" value={newPackage.pkg_count} onChange={handlePackageChange} className="input-field w-full py-2 px-3 border rounded text-sm" placeholder="Count" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type*</label>
                                        <select name="pkg_type" value={newPackage.pkg_type} onChange={handlePackageChange} className="input-field w-full py-2 px-3 border rounded text-sm bg-white">
                                            {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight(KG)</label>
                                        <input type="number" name="weight" value={newPackage.weight} onChange={handlePackageChange} className="input-field w-full py-2 px-3 border rounded text-sm" placeholder="KG" />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={addLineItem} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300">Add</button>
                                </div>
                            </div>

                            {/* List of added items */}
                            {formData.packages && formData.packages.length > 0 && (
                                <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                                    {formData.packages.map((p: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-xs">
                                            <div>
                                                <div className="font-bold">{p.pkg_count} {p.pkg_type}</div>
                                                {p.weight && <div className="text-gray-500">{p.weight} KG</div>}
                                            </div>
                                            <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BLDrawer;
