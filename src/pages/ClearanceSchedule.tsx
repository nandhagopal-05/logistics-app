import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Calendar, ChevronDown, RotateCcw } from 'lucide-react';
import { clearanceAPI } from '../services/api';

const ClearanceSchedule: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clearanceType, setClearanceType] = useState('All types');
    const [transportMode, setTransportMode] = useState('All modes');
    const [date, setDate] = useState('');
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clearance Schedule</h1>
                        <p className="text-gray-500 mt-1">Clearance schedule for the jobs.</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        Delivery Note Mode
                    </button>
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
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[120px]">Job</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[240px]">Consignee</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Container</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Packages</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Type</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[140px]">Port</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Method</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[100px]">Transport</th>
                                    <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-wider w-[160px]">Date</th>
                                    <th className="py-4 px-6 text-center text-xs font-bold uppercase tracking-wider w-[80px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-gray-500">Loading...</td>
                                    </tr>
                                ) : schedules.length > 0 ? (
                                    schedules.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-sm font-semibold text-indigo-600">
                                                {item.job_id}
                                                <div className="text-[10px] text-gray-400 font-normal">{new Date(item.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-900">
                                                <div className="font-medium">{item.consignee || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{item.exporter}</div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                                                {/* Container logic placeholder */}
                                                {item.remarks?.includes('Container:') ? item.remarks.split('Container:')[1] : '-'}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                                                20 PKG {/* Placeholder */}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.clearance_type === 'Express' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.clearance_type || 'NORMAL'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-600 uppercase">{item.port || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500">DHONI</td> {/* Placeholder */}
                                            <td className="py-4 px-6 text-sm text-gray-500 uppercase">{item.transport_mode || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(item.clearance_date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-gray-500 text-sm">
                                            No scheduled clearances found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ClearanceSchedule;
