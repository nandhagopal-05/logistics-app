import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Calendar, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { clearanceAPI, deliveryNotesAPI } from '../services/api';
import ScheduleClearanceDrawer from '../components/ScheduleClearanceDrawer';
import ClearanceDetailsDrawer from '../components/ClearanceDetailsDrawer';
import DeliveryNoteDrawer from '../components/DeliveryNoteDrawer';

const ClearanceSchedule: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clearanceType, setClearanceType] = useState('All types');
    const [transportMode, setTransportMode] = useState('All modes');
    const [date, setDate] = useState('');
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

    // Delivery Note Mode State
    const [isDeliveryNoteMode, setIsDeliveryNoteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeliveryDrawerOpen, setIsDeliveryDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchSchedules = async () => {
            setLoading(true);
            try {
                const response = await clearanceAPI.getAll({
                    search: searchTerm,
                    type: clearanceType,
                    transport_mode: transportMode,
                    date: date
                });
                setSchedules(response.data);
            } catch (error) {
                console.error("Failed to fetch clearance schedules", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSchedules();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, clearanceType, transportMode, date]);

    const handleEditClick = (schedule: any) => {
        setEditingSchedule(schedule);
        setIsDrawerOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (editingSchedule) {
                await clearanceAPI.update(editingSchedule.id, data);
                alert('Clearance Rescheduled Successfully!');
            }
            setEditingSchedule(null);
            setIsDrawerOpen(false);
            window.location.reload();
        } catch (error) {
            console.error('Failed to update clearance', error);
            alert('Failed to update clearance');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this clearance schedule?')) {
            try {
                await clearanceAPI.delete(id);
                setSchedules(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error('Failed to delete clearance', error);
                alert('Failed to delete clearance');
            }
        }
    };

    const toggleDeliveryNoteMode = () => {
        setIsDeliveryNoteMode(!isDeliveryNoteMode);
        setSelectedIds([]); // Reset selection when toggling
    };

    const handleSelectSchedule = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeliveryNoteSave = async (data: any) => {
        try {
            await deliveryNotesAPI.create(data);
            alert('Delivery Note Created Successfully!');
            setIsDeliveryDrawerOpen(false);
            setSelectedIds([]);
            setIsDeliveryNoteMode(false);
        } catch (error) {
            console.error('Failed to create delivery note', error);
            alert('Failed to create delivery note');
        }
    };

    const getSelectedSchedules = () => {
        return schedules.filter(s => selectedIds.includes(s.id));
    };

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clearance Schedule</h1>
                        <p className="text-gray-500 mt-1">Clearance schedule for the jobs.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setLoading(true); setSearchTerm(searchTerm + ' '); setTimeout(() => setSearchTerm(searchTerm), 10); }}
                            className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            title="Refresh"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>

                        {isDeliveryNoteMode && selectedIds.length > 0 ? (
                            <button
                                onClick={() => setIsDeliveryDrawerOpen(true)}
                                className="px-4 py-2 bg-indigo-600 border border-transparent text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <span>Create Note ({selectedIds.length})</span>
                            </button>
                        ) : (
                            <button
                                onClick={toggleDeliveryNoteMode}
                                className={`px-4 py-2 border font-medium rounded-lg transition-colors shadow-sm ${isDeliveryNoteMode ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                                {isDeliveryNoteMode ? 'Hide Delivery Note Picker' : 'Delivery Note Mode'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Search */}
                        <div className="lg:col-span-5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Search Clearances</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Job number, consignee, exporter, container, BL/AWB"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Clearance Type */}
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Clearance Type</label>
                            <div className="relative">
                                <select
                                    value={clearanceType}
                                    onChange={(e) => setClearanceType(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option>All types</option>
                                    <option>Normal</option>
                                    <option>Express</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Transport Mode */}
                        <div className="lg:col-span-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Transport Mode</label>
                            <div className="relative">
                                <select
                                    value={transportMode}
                                    onChange={(e) => setTransportMode(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option>All modes</option>
                                    <option>Road</option>
                                    <option>Sea</option>
                                    <option>Air</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Date */}
                        <div className="">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Clearance Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter date"
                                    onFocus={(e) => e.target.type = 'date'}
                                    onBlur={(e) => e.target.type = 'text'}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 text-xs text-gray-400 font-medium">
                        Showing {schedules.length} clearances
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead>
                                <tr className="bg-black text-white">
                                    {isDeliveryNoteMode && (
                                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[50px]">Select</th>
                                    )}
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">Job</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[240px]">Consignee</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Container</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Packages</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Type</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Port</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Method</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Transport</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Date</th>
                                    <th className="py-4 px-6 text-center text-xs font-bold uppercase tracking-wider w-[80px]">Edit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={isDeliveryNoteMode ? 11 : 10} className="py-12 text-center text-gray-500">Loading...</td>
                                    </tr>
                                ) : schedules.length > 0 ? (
                                    schedules.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''}`}
                                            onClick={() => {
                                                if (isDeliveryNoteMode) {
                                                    handleSelectSchedule(item.id);
                                                } else {
                                                    setSelectedSchedule(item);
                                                }
                                            }}
                                        >
                                            {isDeliveryNoteMode && (
                                                <td className="py-4 px-6 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => handleSelectSchedule(item.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                            )}
                                            <td className="py-4 px-6 text-sm font-semibold text-indigo-600">
                                                {item.job_id}
                                                <div className="text-[10px] text-gray-400 font-normal">{new Date(item.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-900">
                                                <div className="font-medium">{item.consignee || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{item.exporter}</div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                                                {item.container_no ? (
                                                    <>
                                                        <div className="font-medium text-gray-900">{item.container_no}</div>
                                                        <div className="text-xs text-gray-500">{item.container_type}</div>
                                                    </>
                                                ) : '-'}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                                                {item.packages || '-'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.clearance_type === 'Express' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.clearance_type || 'NORMAL'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-600 uppercase">{item.port || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500 uppercase">{item.clearance_method || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500 uppercase">{item.transport_mode || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(item.clearance_date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors ml-2"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isDeliveryNoteMode ? 11 : 10} className="py-12 text-center text-gray-500 text-sm">
                                            No scheduled clearances found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Drawer for Editing/Creating */}
                {isDrawerOpen && (
                    <ScheduleClearanceDrawer
                        isOpen={isDrawerOpen}
                        onClose={() => { setIsDrawerOpen(false); setEditingSchedule(null); }}
                        onSave={handleSave}
                        initialData={editingSchedule}
                        job={editingSchedule}
                        isReschedule={true}
                    />
                )}

                {/* Drawer for Viewing Details */}
                {selectedSchedule && (
                    <ClearanceDetailsDrawer
                        isOpen={!!selectedSchedule}
                        onClose={() => setSelectedSchedule(null)}
                        schedule={selectedSchedule}
                        onReschedule={(schedule) => {
                            setSelectedSchedule(null);
                            handleEditClick(schedule);
                        }}
                    />
                )}

                {/* Drawer for Delivery Note */}
                <DeliveryNoteDrawer
                    isOpen={isDeliveryDrawerOpen}
                    onClose={() => setIsDeliveryDrawerOpen(false)}
                    selectedSchedules={getSelectedSchedules()}
                    onSave={handleDeliveryNoteSave}
                />
            </div>
        </Layout>
    );
};

export default ClearanceSchedule;
