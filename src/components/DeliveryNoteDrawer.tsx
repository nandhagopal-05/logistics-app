import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { fleetAPI } from '../services/api';

interface DeliveryNoteDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSchedules: any[];
    onSave: (data: any) => void;
}

interface VehicleEntry {
    id: string;
    vehicleId: string;
    driver: string;
    driverContact: string;
    dischargeLocation: string;
}

const DeliveryNoteDrawer: React.FC<DeliveryNoteDrawerProps> = ({ isOpen, onClose, selectedSchedules, onSave }) => {
    const [step, setStep] = useState(1);
    const [itemDetails, setItemDetails] = useState<Record<string, { shortage: string; damaged: string; remarks: string }>>({});
    const [vehiclesList, setVehiclesList] = useState<any[]>([]);

    // Step 2 State
    const [addedVehicles, setAddedVehicles] = useState<VehicleEntry[]>([
        { id: '1', vehicleId: '', driver: '', driverContact: '', dischargeLocation: '' }
    ]);
    const [commonDetails, setCommonDetails] = useState({
        loadingDate: '',
        unloadingDate: '',
        comments: ''
    });

    useEffect(() => {
        if (isOpen) {
            fleetAPI.getAll().then(res => setVehiclesList(res.data)).catch(console.error);
            // Initialize with default vehicle and pre-filled discharge location from the first selected schedule's port
            setAddedVehicles([
                {
                    id: '1',
                    vehicleId: '',
                    driver: '',
                    driverContact: '',
                    dischargeLocation: selectedSchedules[0]?.port || ''
                }
            ]);
            setStep(1); // Reset step
        }
    }, [isOpen, selectedSchedules]);

    if (!isOpen) return null;

    const handleItemChange = (id: string, field: string, value: string) => {
        setItemDetails(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleAddVehicle = () => {
        setAddedVehicles(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                vehicleId: '',
                driver: '',
                driverContact: '',
                dischargeLocation: selectedSchedules[0]?.port || ''
            }
        ]);
    };

    const handleRemoveVehicle = (id: string) => {
        if (addedVehicles.length > 1) {
            setAddedVehicles(prev => prev.filter(v => v.id !== id));
        }
    };

    const handleVehicleChange = (id: string, field: keyof VehicleEntry, value: string) => {
        setAddedVehicles(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleCommonChange = (field: string, value: string) => {
        setCommonDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => setStep(2);
    const handleBack = () => setStep(1);

    const handleSave = () => {
        const combinedData = {
            items: selectedSchedules.map(s => ({
                schedule_id: s.id,
                job_id: s.job_id,
                ...itemDetails[s.id]
            })),
            vehicles: addedVehicles,
            ...commonDetails
        };
        onSave(combinedData);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-900">Delivery Note</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {selectedSchedules.map(schedule => {
                                const details = itemDetails[schedule.id] || { shortage: '0', damaged: '0', remarks: '' };
                                return (
                                    <div key={schedule.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                        <div className="bg-white border-b border-gray-100 p-4">
                                            <h3 className="font-bold text-indigo-900 text-sm">{schedule.bl_awb_no || '-'}</h3>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-gray-900">{schedule.packages || 0} PKG</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{schedule.container_no || 'No Container'}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Shortage</label>
                                                        <input
                                                            type="number"
                                                            className="w-16 p-1.5 bg-white border border-gray-200 rounded text-center text-sm outline-none focus:border-indigo-500"
                                                            value={details.shortage}
                                                            onChange={e => handleItemChange(schedule.id, 'shortage', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Damaged</label>
                                                        <input
                                                            type="number"
                                                            className="w-16 p-1.5 bg-white border border-gray-200 rounded text-center text-sm outline-none focus:border-indigo-500"
                                                            value={details.damaged}
                                                            onChange={e => handleItemChange(schedule.id, 'damaged', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Write your remarks here"
                                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 placeholder:text-gray-400"
                                                value={details.remarks}
                                                onChange={e => handleItemChange(schedule.id, 'remarks', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Vehicles Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase">Vehicles</h3>
                                    <button onClick={handleAddVehicle} className="text-xs flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full text-indigo-700 font-medium transition-colors">
                                        <Plus className="w-3 h-3" /> Add Vehicle
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {addedVehicles.map((vehicle) => (
                                        <div key={vehicle.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group">
                                            {addedVehicles.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveVehicle(vehicle.id)}
                                                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Select Vehicle</label>
                                                    <select
                                                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                                        value={vehicle.vehicleId}
                                                        onChange={e => handleVehicleChange(vehicle.id, 'vehicleId', e.target.value)}
                                                    >
                                                        <option value="">Select Vehicle</option>
                                                        {vehiclesList.map((v: any) => (
                                                            <option key={v.id} value={v.id}>{v.registration_number} - {v.type}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Driver</label>
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                                            value={vehicle.driver}
                                                            onChange={e => handleVehicleChange(vehicle.id, 'driver', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Contact</label>
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                                            value={vehicle.driverContact}
                                                            onChange={e => handleVehicleChange(vehicle.id, 'driverContact', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Discharge Location</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                                        value={vehicle.dischargeLocation}
                                                        onChange={e => handleVehicleChange(vehicle.id, 'dischargeLocation', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Common Details */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 uppercase">Delivery Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Loading Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                            value={commonDetails.loadingDate}
                                            onChange={e => handleCommonChange('loadingDate', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unloading Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                                            value={commonDetails.unloadingDate}
                                            onChange={e => handleCommonChange('unloadingDate', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Comments</label>
                                    <textarea
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 min-h-[100px]"
                                        value={commonDetails.comments}
                                        onChange={e => handleCommonChange('comments', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
                    {step === 2 && (
                        <button onClick={handleBack} className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    {step === 1 ? (
                        <button onClick={handleNext} className="px-6 py-2 bg-indigo-900 text-white font-medium rounded-lg hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-200">
                            Next
                        </button>
                    ) : (
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryNoteDrawer;
