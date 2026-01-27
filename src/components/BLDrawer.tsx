import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Plus, Trash2, Save } from 'lucide-react';

interface BLDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    deliveryAgents?: any[];
    job?: any;
}

const PACKAGE_TYPES = ['PALLET', 'BUNDLES', 'CARTON', 'PKG', 'BOX', 'CASE', 'BULK', 'UNIT'];



const BLDrawer: React.FC<BLDrawerProps> = ({ isOpen, onClose, onSave, initialData, deliveryAgents = [], job }) => {
    const [formData, setFormData] = useState<any>({
        master_bl: '',
        house_bl: '',
        loading_port: '',
        vessel: '',
        etd: '',
        eta: '',
        delivery_agent: '',
        containers: [] // Nested structure: { container_no, container_type, packages: [] }
    });

    useEffect(() => {
        const defaultState = {
            master_bl: '',
            house_bl: '',
            loading_port: '',
            vessel: '',
            etd: '',
            eta: '',
            delivery_agent: '',
            containers: []
        };

        if (isOpen) {
            if (initialData) {
                // Compatibility: If initialData has flat packages but no containers, we might want to show them?
                // Or assume data migration. For now, strict mapping.
                // If initialData.containers exists (from new DB structure), used it.
                // If not, but legacy packages exist, maybe put them in a "General/Loose" container? 
                // For this task, we assume we are creating NEW structure or editing existing NEW structure.
                setFormData({
                    ...defaultState,
                    ...initialData,
                    containers: initialData.containers || []
                });
            } else {
                setFormData(defaultState);
            }

        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    // --- Container Logic ---

    const handleAddContainer = () => {
        setFormData((prev: any) => ({
            ...prev,
            containers: [
                ...(prev.containers || []),
                {
                    container_no: '',
                    container_type: 'FCL 20', // Default
                    packages: []
                }
            ]
        }));
    };

    const handleRemoveContainer = (index: number) => {
        setFormData((prev: any) => ({
            ...prev,
            containers: prev.containers.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleContainerChange = (index: number, field: string, value: any) => {
        setFormData((prev: any) => {
            const updated = [...prev.containers];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, containers: updated };
        });
    };

    // --- Package Logic within Container ---

    const handleAddPackage = (containerIndex: number) => {
        setFormData((prev: any) => {
            const updatedContainers = [...prev.containers];
            const container = updatedContainers[containerIndex];
            container.packages = [
                ...(container.packages || []),
                { pkg_count: '', pkg_type: 'PKG', cbm: '', weight: '' }
            ];
            return { ...prev, containers: updatedContainers };
        });
    };

    const handleRemovePackage = (containerIndex: number, pkgIndex: number) => {
        setFormData((prev: any) => {
            const updatedContainers = [...prev.containers];
            const container = updatedContainers[containerIndex];
            container.packages = container.packages.filter((_: any, i: number) => i !== pkgIndex);
            return { ...prev, containers: updatedContainers };
        });
    };

    const handlePackageChange = (containerIndex: number, pkgIndex: number, field: string, value: any) => {
        setFormData((prev: any) => {
            const updatedContainers = [...prev.containers];
            const container = updatedContainers[containerIndex];
            const updatedPackages = [...container.packages];
            updatedPackages[pkgIndex] = { ...updatedPackages[pkgIndex], [field]: value };
            container.packages = updatedPackages;
            return { ...prev, containers: updatedContainers };
        });
    };


    const handleSubmit = () => {
        if (!formData.master_bl && !formData.house_bl) {
            alert("Master No or House No is required");
            return;
        }
        // Basic validation: ensure containers have numbers?
        if (formData.containers && formData.containers.some((c: any) => !c.container_no)) {
            alert("All containers must have a Container Number");
            return;
        }
        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    const isSea = (job?.transport_mode || 'SEA') === 'SEA';

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="absolute inset-y-0 right-0 max-w-2xl w-full flex"> {/* Increased width for nested tables */}
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

                        {/* Containers Section */}
                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-900">Containers & Packages</h3>
                                <button
                                    onClick={handleAddContainer}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Add Container
                                </button>
                            </div>

                            <div className="space-y-6">
                                {formData.containers?.map((container: any, cIdx: number) => (
                                    <div key={cIdx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        {/* Container Header Line */}
                                        <div className="flex gap-4 items-end mb-4 pb-4 border-b border-gray-200">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Container No.</label>
                                                <input
                                                    value={container.container_no}
                                                    onChange={(e) => handleContainerChange(cIdx, 'container_no', e.target.value)}
                                                    className="w-full py-1.5 px-2 text-sm border rounded bg-white"
                                                    placeholder="ABCD1234567"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                                <select
                                                    value={container.container_type}
                                                    onChange={(e) => handleContainerChange(cIdx, 'container_type', e.target.value)}
                                                    className="w-full py-1.5 px-2 text-sm border rounded bg-white"
                                                >
                                                    <option value="FCL 20">FCL 20</option>
                                                    <option value="FCL 40">FCL 40</option>
                                                    <option value="LCL 20">LCL 20</option>
                                                    <option value="LCL 40">LCL 40</option>
                                                    <option value="OT 20">OT 20</option>
                                                    <option value="OT 40">OT 40</option>
                                                </select>
                                            </div>
                                            <button onClick={() => handleRemoveContainer(cIdx)} className="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Packages within Container */}
                                        <div className="pl-2">
                                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase mb-2">
                                                <div className="col-span-3">Count</div>
                                                <div className="col-span-4">Type</div>
                                                <div className="col-span-4">{isSea ? 'CBM' : 'Weight'}</div>
                                                <div className="col-span-1"></div>
                                            </div>

                                            <div className="space-y-2 mb-2">
                                                {container.packages?.map((pkg: any, pIdx: number) => (
                                                    <div key={pIdx} className="grid grid-cols-12 gap-2 items-center">
                                                        <div className="col-span-3">
                                                            <input
                                                                type="text"
                                                                value={pkg.pkg_count}
                                                                onChange={(e) => handlePackageChange(cIdx, pIdx, 'pkg_count', e.target.value)}
                                                                className="w-full py-1 px-2 text-xs border rounded"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div className="col-span-4">
                                                            <select
                                                                value={pkg.pkg_type}
                                                                onChange={(e) => handlePackageChange(cIdx, pIdx, 'pkg_type', e.target.value)}
                                                                className="w-full py-1 px-2 text-xs border rounded bg-white"
                                                            >
                                                                {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-4">
                                                            <input
                                                                type="text"
                                                                value={isSea ? pkg.cbm : pkg.weight}
                                                                onChange={(e) => handlePackageChange(cIdx, pIdx, isSea ? 'cbm' : 'weight', e.target.value)}
                                                                className="w-full py-1 px-2 text-xs border rounded"
                                                                placeholder={isSea ? '0.00' : '0.00'}
                                                            />
                                                        </div>
                                                        <div className="col-span-1 text-right">
                                                            <button onClick={() => handleRemovePackage(cIdx, pIdx)} className="text-gray-400 hover:text-red-500">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => handleAddPackage(cIdx)}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mt-2"
                                            >
                                                <Plus className="w-3 h-3" /> Add Package
                                            </button>
                                        </div>
                                    </div>
                                ))}
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

export default BLDrawer;
