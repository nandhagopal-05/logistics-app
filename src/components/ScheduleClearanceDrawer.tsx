import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface ScheduleClearanceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    job?: any;
    initialData?: any;
    title?: string;
    isReschedule?: boolean;
}

const ScheduleClearanceDrawer: React.FC<ScheduleClearanceDrawerProps> = ({ isOpen, onClose, onSave, job, initialData, title, isReschedule = false }) => {
    const [formData, setFormData] = useState({
        date: '',
        type: '',
        port: '',
        bl_awb: '',
        transport_mode: '',
        packages: '',
        container_details: '',
        container_no: '',
        container_type: '',
        clearance_method: '',
        remarks: '',
        reschedule_reason: ''
    });

    useEffect(() => {
        if (initialData && isReschedule) {
            setFormData({
                date: initialData.clearance_date ? new Date(initialData.clearance_date).toISOString().split('T')[0] : '',
                type: initialData.clearance_type || '',
                port: initialData.port || '',
                bl_awb: initialData.bl_awb || '',
                transport_mode: initialData.transport_mode || '',
                packages: initialData.packages || '',
                container_details: initialData.container_details || '',
                container_no: initialData.container_no || '',
                container_type: initialData.container_type || '',
                clearance_method: initialData.clearance_method || '',
                remarks: initialData.remarks || '',
                reschedule_reason: initialData.reschedule_reason || ''
            });
        } else {
            // New Schedule Defaults
            // Prioritize Master BL from first BL entry if available
            const defaultBL = (job?.bls && job.bls.length > 0) ? job.bls[0].master_bl : (job?.bl_awb_no || job?.bl_awb || '');

            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: '',
                port: '',
                bl_awb: defaultBL,
                transport_mode: job?.transport_mode ? (job.transport_mode.charAt(0).toUpperCase() + job.transport_mode.slice(1).toLowerCase()) : '',
                packages: job?.packages || '',
                container_details: '',
                container_no: '',
                container_type: '',
                clearance_method: '',
                remarks: '',
                reschedule_reason: ''
            });
        }
    }, [initialData, isOpen, job, isReschedule]);

    // Derived options from job
    // Extract Master BL numbers from BLs list if available, otherwise fallback to top-level fields
    const blOptions = (job?.bls && job.bls.length > 0)
        ? job.bls.map((b: any) => b.master_bl).filter(Boolean)
        : [job?.bl_awb_no].filter((opt) => opt && opt !== '-');



    // Filter packages based on selected BL
    const getPackageOptions = () => {
        if (!formData.bl_awb) return [];
        // Find the BL object
        const selectedBLObj = job?.bls?.find((b: any) => b.master_bl === formData.bl_awb);
        if (selectedBLObj && selectedBLObj.packages) {
            return selectedBLObj.packages.map((p: any) => `${p.pkg_count} ${p.pkg_type}`);
        }
        // Fallback if no BL object structure (e.g. legacy job data)
        return job?.packages ? [job.packages] : [];
    };

    const packageOptions = getPackageOptions();

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates: any = { [name]: value };

            // If changing container details, perform lookup to set type/no
            if (name === 'container_details' && job?.containers) {
                // value format: "TYPE - NO"
                const parts = value.split(' - ');
                if (parts.length >= 2) {
                    const cType = parts[0];
                    const cNo = parts.slice(1).join(' - '); // handle potential extra dashes
                    updates.container_type = cType;
                    updates.container_no = cNo;
                }
            }
            return { ...prev, ...updates };
        });
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
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {title ? title : (isReschedule ? 'Reschedule Clearance' : 'Schedule Clearance')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {isReschedule && job && (
                            <div className="mt-2 text-sm">
                                <span className="font-bold text-indigo-600">{job.job_id}</span>
                                <span className="mx-2 text-gray-300">|</span>
                                <span className="text-gray-600 font-medium">{job.consignee}</span>
                            </div>
                        )}
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

                        {/* Reschedule Reason (Only for Edit/Reschedule) */}
                        {isReschedule && (
                            <div className="form-group">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Reschedule Reason</label>
                                <div className="relative">
                                    <select
                                        name="reschedule_reason"
                                        value={(formData as any).reschedule_reason || ''}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!(formData as any).reschedule_reason ? 'text-gray-400' : 'text-gray-700'}`}
                                    >
                                        <option value="" disabled>Select reason</option>
                                        <option value="Customer Request">Customer Request</option>
                                        <option value="MPL Issues">MPL Issues</option>
                                        <option value="Weather Conditions">Weather Conditions</option>
                                        <option value="Others">Others</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        )}


                        {/* Clearance Method */}
                        {!isReschedule && (
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
                        )}

                        {/* Select Clearing BL/AWB */}
                        {!isReschedule && (
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
                                            blOptions.map((opt: string, idx: number) => (
                                                <option key={idx} value={opt}>{opt}</option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No BL/AWB available</option>
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Clearance Transport Mode */}
                        {!isReschedule && (
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
                        )}

                        {/* Container Details (Multi-Select) */}
                        {!isReschedule && (
                            <div className="form-group mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Container Details (Select Multiple)</label>
                                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                                    {job?.containers && job.containers.length > 0 ? (
                                        job.containers.map((c: any, idx: number) => {
                                            const val = c.container_no;
                                            const isSelected = formData.container_no.split(',').map(s => s.trim()).includes(val);
                                            return (
                                                <div key={idx} className="flex items-center gap-2 py-1">
                                                    <input
                                                        type="checkbox"
                                                        id={`cont-${idx}`}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            let currentNos = formData.container_no ? formData.container_no.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                            let currentTypes = formData.container_type ? formData.container_type.split(',').map(s => s.trim()).filter(Boolean) : [];

                                                            if (checked) {
                                                                currentNos.push(c.container_no);
                                                                currentTypes.push(c.container_type);
                                                            } else {
                                                                const index = currentNos.indexOf(c.container_no);
                                                                if (index > -1) {
                                                                    currentNos.splice(index, 1);
                                                                    currentTypes.splice(index, 1);
                                                                }
                                                            }

                                                            const newContainerNo = currentNos.join(', ');

                                                            // Calculate accumulated packages for selected containers
                                                            let newPackagesStr = formData.packages;
                                                            if (currentNos.length > 0 && job.containers) {
                                                                const selectedContainers = job.containers.filter((cont: any) => currentNos.includes(cont.container_no));
                                                                const allPkgs: string[] = [];
                                                                selectedContainers.forEach((cont: any) => {
                                                                    const pList = typeof cont.packages === 'string' ? JSON.parse(cont.packages) : (cont.packages || []);
                                                                    if (Array.isArray(pList)) {
                                                                        pList.forEach((p: any) => allPkgs.push(`${p.pkg_count} ${p.pkg_type}`));
                                                                    }
                                                                });
                                                                newPackagesStr = allPkgs.join(', ');
                                                            } else if (currentNos.length === 0) {
                                                                // Reset to empty or allow manual selection if no containers
                                                                newPackagesStr = '';
                                                            }

                                                            setFormData(prev => ({
                                                                ...prev,
                                                                container_no: newContainerNo,
                                                                container_type: currentTypes.join(', '),
                                                                packages: newPackagesStr
                                                            }));
                                                        }}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <label htmlFor={`cont-${idx}`} className="text-sm text-gray-700 cursor-pointer select-none">
                                                        <span className="font-medium">{c.container_no}</span>
                                                        <span className="text-gray-400 mx-1">-</span>
                                                        <span className="text-xs text-gray-500">{c.container_type}</span>
                                                    </label>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No containers available</p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Selected: {formData.container_no || 'None'}
                                </p>
                            </div>
                        )}

                        {/* Packages (Auto-populated if containers selected, else Dropdown) */}
                        {!isReschedule && (
                            <div className="form-group">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Packages</label>
                                {formData.container_no ? (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[46px] flex items-center">
                                        {formData.packages || 'No packages found in selected containers'}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            name="packages"
                                            value={formData.packages}
                                            onChange={handleInputChange}
                                            className={`w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${!formData.packages ? 'text-gray-400' : 'text-gray-700'}`}
                                        >
                                            <option value="" disabled>Select packages</option>
                                            {packageOptions.length > 0 ? (
                                                packageOptions.map((opt: string, idx: number) => (
                                                    <option key={idx} value={opt}>{opt}</option>
                                                ))
                                            ) : (
                                                <option value="" disabled>No packages available for this BL</option>
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                )}
                            </div>
                        )}

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
