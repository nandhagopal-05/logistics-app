import React from 'react';
import { X } from 'lucide-react';

interface ClearanceDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: any;
    onReschedule: (schedule: any) => void;
}

const ClearanceDetailsDrawer: React.FC<ClearanceDetailsDrawerProps> = ({
    isOpen,
    onClose,
    schedule,
    onReschedule
}) => {
    if (!isOpen || !schedule) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
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
                        <h2 className="text-xl font-bold text-gray-900">Clearance Details</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* Job Information */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Job Information</h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Job Number</p>
                                    <p className="text-sm font-medium text-gray-900">{schedule.job_id}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Consignee</p>
                                    <p className="text-sm font-medium text-gray-900 truncate" title={schedule.consignee}>{schedule.consignee || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Exporter</p>
                                    <p className="text-sm font-medium text-gray-900 truncate" title={schedule.exporter}>{schedule.exporter || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Information */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Shipping Information</h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">BL/AWB Number</p>
                                    <p className="text-sm font-medium text-gray-900 break-words">{schedule.bl_awb || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Container Number</p>
                                    <p className="text-sm font-medium text-gray-900">{schedule.container_no || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Container Size</p>
                                    <p className="text-sm font-medium text-gray-900">{schedule.container_type || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Package Type</p>
                                    <p className="text-sm font-medium text-gray-900 uppercase">{schedule.package_type || 'PKG'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Package Quantity</p>
                                    <p className="text-sm font-medium text-gray-900">{schedule.packages || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Clearance Information */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Clearance Information</h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Clearance Date</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {schedule.clearance_date ? new Date(schedule.clearance_date).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        }) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Clearance Type</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${schedule.clearance_type === 'Express' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {schedule.clearance_type || 'NORMAL'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Clearance Port</p>
                                    <p className="text-sm font-medium text-gray-900 uppercase">{schedule.port || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Clearance Mode</p>
                                    <p className="text-sm font-medium text-gray-900 uppercase">{schedule.clearance_method || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Transport Mode</p>
                                    <p className="text-sm font-medium text-gray-900 uppercase">{schedule.transport_mode || '-'}</p>
                                </div>
                                {schedule.reschedule_reason && (
                                    <div className="col-span-2 mt-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                                        <p className="text-xs text-yellow-600 uppercase font-bold mb-1">Reschedule Reason</p>
                                        <p className="text-sm font-medium text-yellow-800">{schedule.reschedule_reason}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
                        <button
                            onClick={() => onReschedule(schedule)}
                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Reschedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClearanceDetailsDrawer;
