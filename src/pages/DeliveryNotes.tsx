import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
    Search, Eye, Printer, ChevronDown,
    X, Download, Upload
} from 'lucide-react';
import Barcode from 'react-barcode';
import { deliveryNotesAPI } from '../services/api';

import seaflowHeader from '../assets/seaflow-header.jpg';
import seaflowFooter from '../assets/seaflow-footer.jpg';
import seaflowLogo from '../assets/seaflow-logo.jpg';
import seaflowDigitalSeal from '../assets/seaflow-digital-seal.jpg';

interface DeliveryNoteItem {
    id: number;
    schedule_id: number;
    job_id: string;
    shortage: string;
    damaged: string;
    remarks: string;
    bl_awb_no?: string;
    sender_name?: string;
    packages?: string;
    package_type?: string;
    container_no?: string;
}

interface DeliveryNoteVehicle {
    id: number;
    vehicle_id: string;
    driver_name: string;
    driver_contact: string;
    discharge_location: string;
    registration_number?: string;
    vehicle_type?: string;
}

interface DeliveryNote {
    id: string;
    consignee: string;
    exporter: string;
    issued_date: string;
    issued_by: string;
    status: string;
    comments?: string;
    unloading_date?: string;
    loading_date?: string;

    // For List Logic
    job_ids: string[];
    item_count: number;

    // Detailed Data
    items?: DeliveryNoteItem[];
    vehicles?: DeliveryNoteVehicle[];
}

const DeliveryNotes: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState('50 records');
    const [statusFilter, setStatusFilter] = useState('All statuses');

    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [loading, setLoading] = useState(true);

    // State for split view and tabs
    const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
    const [activeTab, setActiveTab] = useState<'document' | 'manage'>('manage');

    // Fetch Data
    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const response = await deliveryNotesAPI.getAll();
            setDeliveryNotes(response.data);
        } catch (error) {
            console.error('Failed to fetch delivery notes', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter logic
    const filteredNotes = deliveryNotes.filter(note => {
        const matchesSearch =
            note.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.exporter.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All statuses' || note.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleViewDetails = async (note: DeliveryNote) => {
        try {
            const response = await deliveryNotesAPI.getById(note.id);
            setSelectedNote(response.data);
            setActiveTab('manage');
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseDetails = () => {
        setSelectedNote(null);
    };

    // Render the Document Preview (Image 1 style)
    const renderDocument = () => (
        <div className="bg-white shadow-sm border border-gray-200 min-h-[1100px] text-sm font-mono relative flex flex-col">
            {/* Header Image */}
            <div className="w-full relative">
                <img src={seaflowHeader} alt="Header" className="w-full h-auto object-cover max-h-48" />
            </div>

            <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-8 mt-2">
                    <div className="w-1/2 flex items-center gap-4">
                        {/* Logo and Address */}
                        <div className="w-20 h-20 flex-shrink-0">
                            <img src={seaflowLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-blue-600 italic leading-tight">Seaflow Logistics</h2>
                            <p className="text-[10px] text-gray-600 leading-snug">H.Fusthalhaanage, 7th Floor,</p>
                            <p className="text-[10px] text-gray-600 leading-snug">Ameer Ahmed Magu, Male', 20030,</p>
                            <p className="text-[10px] text-gray-600 leading-snug">e: info@seaflow.mv, ph: +960 300 7633</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-gray-300 text-gray-800 font-bold px-4 py-2 mb-2 inline-block text-xs">GOODS DELIVERY NOTE</div>
                        <div className="flex justify-end mb-2">
                            <Barcode
                                value={selectedNote?.id || ''}
                                width={1.2}
                                height={40}
                                displayValue={false}
                                background="transparent"
                                margin={0}
                            />
                        </div>
                    </div>
                </div>

                <div className="border border-gray-800 p-4 mb-6 grid grid-cols-2 gap-8">
                    <div>
                        <p className="mb-1"><span className="font-bold">Customer:</span> {selectedNote?.consignee}</p>
                    </div>
                    <div>
                        <div>
                            <div className="border-b border-gray-300 pb-1 mb-1 flex justify-between">
                                <span className="font-bold">Delivery:</span> <span>{selectedNote?.id}</span>
                            </div>
                            <div className="border-b border-gray-300 pb-1 mb-1 flex justify-between">
                                <span className="font-bold">Loading Date:</span> <span>{selectedNote?.loading_date ? new Date(selectedNote.loading_date).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-bold">Discharge Location:</span>
                                <span>
                                    {selectedNote?.vehicles && selectedNote.vehicles.length > 0
                                        ? selectedNote.vehicles.map(v => v.discharge_location).join(', ')
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Job Table Mock */}
                <div className="mb-8">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border border-gray-300 p-2 text-left">Job No</th>
                                <th className="border border-gray-300 p-2 text-left">Shipper</th>
                                <th className="border border-gray-300 p-2 text-left">BL/AWB #</th>
                                <th className="border border-gray-300 p-2 text-left">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedNote?.items?.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="border border-gray-300 p-2">{item.job_id}</td>
                                    <td className="border border-gray-300 p-2">{item.sender_name || selectedNote.exporter}</td>
                                    <td className="border border-gray-300 p-2">{item.bl_awb_no || '-'}</td>
                                    <td className="border border-gray-300 p-2">{item.packages || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="border border-gray-800 grid grid-cols-2 mb-8 relative">
                    <div className="p-0 relative">
                        <div className="bg-gray-200 p-2 font-bold border-b border-gray-800">GOODS DELIVERED BY</div>
                        <div className="p-4 grid grid-cols-[80px_1fr] gap-4 min-h-[100px]">
                            <span className="font-bold">Name:</span> <span>{selectedNote?.issued_by}</span>
                            <span className="font-bold">Signature:</span> <div className="h-12 border-b border-gray-400"></div>
                        </div>
                        {/* Digital Seal (Yellow Zone) */}
                        <div className="absolute bottom-2 right-12 w-24 h-24 opacity-80 pointer-events-none mix-blend-multiply">
                            <img src={seaflowDigitalSeal} alt="Seal" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="p-0 border-l border-gray-800">
                        <div className="bg-gray-200 p-2 font-bold border-b border-gray-800">GOODS RECEIVED BY</div>
                        <div className="p-4 grid grid-cols-[80px_1fr] gap-4 min-h-[100px]">
                            <span className="font-bold">Name:</span> <div className="border-b border-gray-400"></div>
                            <span className="font-bold">Signature:</span> <div className="h-12 border-b border-gray-400"></div>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-center text-gray-500 mt-12">
                    Any Shortage or damage must be notified within 72 hours of receipt of goods. <br />
                    Should you have any enquiries concerning this delivery note, please contact us. <br />
                    Thank you for your business!
                </p>
            </div>

            {/* Footer Image */}
            <div className="w-full mt-auto">
                <img src={seaflowFooter} alt="Footer" className="w-full h-auto object-cover" />
            </div>
        </div>
    );

    // Render Manage View (Image 2 style)
    const renderManage = () => (
        <div className="space-y-6">
            {/* Delivery Summary */}
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Consignee</label>
                    <p className="font-medium text-gray-900">{selectedNote?.consignee}</p>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Discharge Location</label>
                    <p className="font-medium text-gray-900">
                        {selectedNote?.vehicles && selectedNote.vehicles.length > 0
                            ? selectedNote.vehicles.map(v => v.discharge_location).join(', ')
                            : '-'}
                    </p>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Created</label>
                    <p className="font-medium text-gray-900">{selectedNote?.issued_date ? new Date(selectedNote.issued_date).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Issued By</label>
                    <p className="font-medium text-gray-900">{selectedNote?.issued_by}</p>
                </div>
            </div>

            {/* Linked Jobs */}
            <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Linked Jobs</h3>
                    <span className="text-xs text-gray-400">{selectedNote?.job_ids?.length || 0} Jobs Selected</span>
                </div>
                <div className="space-y-2">
                    {selectedNote?.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start bg-gray-50 p-3 rounded border border-gray-100">
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{item.job_id}</p>
                                <p className="text-xs text-gray-500">{selectedNote?.consignee}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Packages: {item.packages || 'N/A'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Update Details */}
            <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Update Details</h3>

                <div className="mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Mark as delivered</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6 mt-1">Pending delivery</p>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Comments</label>
                    <textarea
                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-100"
                        rows={3}
                        defaultValue={selectedNote?.comments || ''}
                    ></textarea>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Unloading Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full text-sm border border-gray-200 rounded-lg p-2 pl-3 focus:outline-none focus:ring-2 focus:ring-gray-100"
                            defaultValue={selectedNote?.unloading_date ? selectedNote.unloading_date.split('T')[0] : ''}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Signed Delivery Note</label>
                    <button className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline">
                        <Upload className="w-4 h-4" /> Choose File
                    </button>
                    <p className="text-xs text-gray-400 mt-1">No file chosen</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                    <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900">Save changes</button>
                </div>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="flex h-[calc(100vh-100px)] overflow-hidden bg-white">
                {/* Left Side: The List */}
                <div className={`p-8 overflow-y-auto custom-scrollbar transition-all duration-300 ${selectedNote ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issued delivery notes</h1>
                        <p className="text-gray-500">Overview of all generated delivery notes with quick access to documents.</p>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                        <div className={`flex flex-col ${selectedNote ? 'gap-3' : 'md:flex-row gap-6'}`}>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Search Notes</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            {!selectedNote && (
                                <>
                                    <div className="w-48">
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Records</label>
                                        <div className="relative">
                                            <select
                                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 appearance-none"
                                                value={recordsPerPage}
                                                onChange={(e) => setRecordsPerPage(e.target.value)}
                                            >
                                                <option>50 records</option>
                                                <option>100 records</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="w-48">
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Status</label>
                                        <div className="relative">
                                            <select
                                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 appearance-none"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option>All statuses</option>
                                                <option>Pending</option>
                                                <option>Completed</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 mb-4">Showing {filteredNotes.length} delivery notes</div>

                    {/* Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className={`${selectedNote ? 'hidden' : ''}`}>
                                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6 font-semibold">Delivery</th>
                                    <th className="py-4 px-6 font-semibold w-1/4">Consignee</th>
                                    {!selectedNote && (
                                        <>
                                            <th className="py-4 px-6 font-semibold">Jobs</th>
                                            <th className="py-4 px-6 font-semibold">Details</th>
                                            <th className="py-4 px-6 font-semibold">Issued</th>
                                            <th className="py-4 px-6 font-semibold">Status</th>
                                        </>
                                    )}
                                    <th className="py-4 px-6 font-semibold text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">Loading records...</td>
                                    </tr>
                                ) : filteredNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">No delivery notes found</td>
                                    </tr>
                                ) : (
                                    filteredNotes.map((note) => (
                                        <tr key={note.id} className={`hover:bg-gray-50 transition-colors group cursor-pointer ${selectedNote?.id === note.id ? 'bg-blue-50' : ''}`} onClick={() => handleViewDetails(note)}>
                                            <td className="py-4 px-6">
                                                <span className="text-blue-600 font-medium text-sm hover:underline">{note.id}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-sm mb-0.5">{note.consignee}</span>
                                                    {!selectedNote && <span className="text-[11px] text-gray-500 uppercase tracking-wide">{note.exporter}</span>}
                                                </div>
                                            </td>
                                            {!selectedNote && (
                                                <>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-wrap gap-1">
                                                            {note.job_ids?.slice(0, 3).map((job, idx) => (
                                                                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">
                                                                    {job}
                                                                </span>
                                                            ))}
                                                            {(note.job_ids?.length || 0) > 3 && (
                                                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-xs font-medium border border-gray-200">
                                                                    +{note.job_ids!.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                {note.item_count}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                {/* <span className="text-xs font-semibold text-gray-800">BL / AWB</span> */}
                                                                {/* <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded border border-orange-100 mt-1 uppercase">
                                                                Male'
                                                            </span> */}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-900">{note.issued_date ? new Date(note.issued_date).toLocaleDateString() : '-'}</span>
                                                            <span className="text-xs text-gray-500">{note.issued_by}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                        ${note.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                            {note.status}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2 text-gray-400">
                                                    <button className="p-1 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setActiveTab('document'); }}>
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" onClick={(e) => { e.stopPropagation(); handleViewDetails(note); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side: Detail Panel */}
                {selectedNote && (
                    <div className="w-1/2 h-full flex flex-col bg-white border-l border-gray-200 animate-slide-in-right overflow-hidden shadow-2xl z-20">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Delivery note {selectedNote.id}</h2>
                            </div>
                            <button onClick={handleCloseDetails} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Tabs/Actions */}
                        <div className="border-b border-gray-200 px-6 py-2 bg-gray-50 flex items-center sticky top-0 z-10">
                            <div className="flex p-1 bg-white border border-gray-200 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('manage')}
                                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'manage'
                                        ? 'bg-black text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('document')}
                                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'document'
                                        ? 'bg-black text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    Document Preview
                                </button>
                            </div>

                            {activeTab === 'document' && (
                                <div className="ml-auto flex gap-2">
                                    <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all" title="Print">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all" title="Download PDF">
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/50">
                            {activeTab === 'document' ? renderDocument() : renderManage()}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgba(229, 231, 235, 0.5);
                border-radius: 20px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: rgba(209, 213, 219, 0.8);
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-in-right {
                animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
        `}</style>
        </Layout>
    );
};

export default DeliveryNotes;
