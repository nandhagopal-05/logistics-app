import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import {
    Search, Printer, ChevronDown,
    X, Download, Upload,
    Mail, Phone, Globe, MapPin, Trash2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { deliveryNotesAPI, consigneesAPI } from '../services/api';

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
    schedule_port?: string; // Fetched from backend join
}

interface DeliveryNoteVehicle {
    id: number;
    vehicleId: string; // This is the ID stored in DB (Registration No)
    vehicleName?: string; // Fetched from join
    registrationNumber?: string; // Fetched from join (redundant but explicit)
    driver: string;
    driverContact: string;
    dischargeLocation: string;
    vehicle_type?: string;
}

interface Consignee {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    code: string;
}

interface DeliveryNote {
    id: string;
    consignee: string;
    consignee_email?: string; // Added from join
    consignee_phone?: string; // Added from join
    consignee_address?: string; // Added from join
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
    const [consignees, setConsignees] = useState<Consignee[]>([]);
    const [loading, setLoading] = useState(true);

    // State for split view and tabs
    const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
    const [activeTab, setActiveTab] = useState<'document' | 'manage'>('manage');
    const printRef = useRef<HTMLDivElement>(null);

    // Fetch Data
    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const [notesRes, consigneesRes] = await Promise.all([
                deliveryNotesAPI.getAll(),
                consigneesAPI.getAll()
            ]);
            setDeliveryNotes(notesRes.data);
            setConsignees(consigneesRes.data);
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

    const handleViewDetails = async (note: DeliveryNote, tab: 'document' | 'manage' = 'manage') => {
        try {
            const response = await deliveryNotesAPI.getById(note.id);
            setSelectedNote(response.data);
            setActiveTab(tab);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseDetails = () => {
        setSelectedNote(null);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;

        try {
            const element = printRef.current;
            if (!element) return;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: true,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 Width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`DeliveryNote_${selectedNote?.id || 'doc'}.pdf`);
        } catch (error) {
            console.error('PDF Generation Failed', error);
            alert(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}. Please try printing to PDF instead.`);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this delivery note? The associated jobs will be returned to the clearance schedule.')) {
            try {
                await deliveryNotesAPI.delete(id);
                setDeliveryNotes(prev => prev.filter(n => n.id !== id));
                if (selectedNote?.id === id) {
                    setSelectedNote(null);
                }
            } catch (error) {
                console.error('Failed to delete delivery note', error);
                alert('Failed to delete delivery note');
            }
        }
    };

    // Render the Document Preview (Image 1 style)
    // Render the Document Preview
    const renderDocument = () => (
        <div className="flex justify-center w-full bg-gray-100/50 py-8 text-black">
            <div
                ref={printRef}
                id="printable-content"
                className="bg-white text-[11px] font-mono relative flex flex-col shadow-lg mx-auto"
                style={{
                    width: '210mm',
                    height: '297mm',
                    position: 'relative',
                    overflow: 'hidden',
                    margin: '0',
                    boxSizing: 'border-box',
                    backgroundColor: 'white'
                }}
            >
                {/* 1. Header Image (Fixed Top Red Box) */}
                <div className="absolute top-0 left-0 w-full z-20 font-none leading-none pointer-events-none">
                    <img
                        src={seaflowHeader}
                        alt="Header"
                        className="w-full h-auto block"
                        style={{ maxWidth: '100%', maxHeight: '25mm' }} // Strictly limited height
                        crossOrigin="anonymous"
                    />
                </div>

                {/* Main Content Wrapper - Defines the Safe Area between Header and Footer */}
                <div className="absolute inset-0 z-10 flex flex-col px-12 pt-24 pb-28 h-full">

                    {/* 2. Top Static Section (Logo/Title & Customer Info) */}
                    <div className="flex-none">
                        {/* Logo & Title Row */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-1/2 flex items-center gap-4">
                                <div className="w-15 h-15 flex-shrink-0">
                                    <img src={seaflowLogo} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-sky-900 italic leading-tight">Seaflow Logistics</h2>
                                    <p className="text-[9px] text-gray-600 leading-snug">Hulhumale' Lot 11393, </p>
                                    <p className="text-[9px] text-gray-600 leading-snug">Saima Hingun, Rep of Maldives, 23000 </p>
                                    <p className="text-[9px] text-gray-600 leading-snug">e: info@seaflowlogistic.com, ph: +960 9990371/+960 9995768 </p>
                                </div>
                            </div>
                            <div className="text-right pt-2">
                                <div className="bg-gray-300 text-gray-800 font-bold px-3 py-1.5 inline-block text-xs">GOODS DELIVERY NOTE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer & Delivery Details Row */}
                <div className="border border-gray-800 p-2 mb-4 grid grid-cols-2 gap-8">
                    <div>
                        <p className="mb-1"><span className="font-bold">Customer:</span> {selectedNote?.consignee}</p>
                        <p className="mb-1"><span className="font-bold">Phone:</span> {consignees.find(c => c.name === selectedNote?.consignee)?.phone || selectedNote?.consignee_phone || '-'}</p>
                        <p className="mb-1"><span className="font-bold">Email:</span> {consignees.find(c => c.name === selectedNote?.consignee)?.email || selectedNote?.consignee_email || '-'}</p>
                    </div>
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
                                {(() => {
                                    const vehicleLocs = selectedNote?.vehicles
                                        ? selectedNote.vehicles.map(v => v.dischargeLocation).filter(Boolean)
                                        : [];

                                    if (vehicleLocs.length > 0) {
                                        return vehicleLocs.join(', ');
                                    }
                                    return selectedNote?.items?.[0]?.schedule_port || '-';
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Dynamic Middle Section (The Yellow Box Content) */}
                <div className="flex-grow flex flex-col min-h-0">
                    {/* Green Box 1: Jobs Table (Expands) */}
                    <div className="mb-4">
                        <table className="w-full border-collapse text-[10px]">
                            <thead className="bg-gray-200 font-bold border-y border-gray-400">
                                <tr>
                                    <th className="py-1 px-2 text-left w-1/5">Job No</th>
                                    <th className="py-1 px-2 text-left w-2/5">Shipper</th>
                                    <th className="py-1 px-2 text-left w-1/5">BL/AWB #</th>
                                    <th className="py-1 px-2 text-left w-1/5">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {selectedNote?.items?.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-200">
                                        <td className="py-1 px-2 align-top">{item.job_id}</td>
                                        <td className="py-1 px-2 align-top font-medium uppercase">{item.sender_name || selectedNote.exporter}</td>
                                        <td className="py-1 px-2 align-top">{item.bl_awb_no || '-'}</td>
                                        <td className="py-1 px-2 align-top font-bold">{item.packages} {item.package_type || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Green Box 2: Signatures (Pushed down by table) */}
                    <div className="border border-gray-800 flex mb-4 text-[10px] flex-shrink-0">
                        {/* GOODS DELIVERED BY */}
                        <div className="w-2/3 border-r border-gray-800 flex flex-col">
                            <div className="bg-gray-200 p-1.5 font-bold border-b border-gray-800">GOODS DELIVERED BY</div>
                            <div className="grid grid-cols-2 flex-grow min-h-[80px]">
                                <div className="p-2 border-r border-gray-800 relative flex flex-col justify-between">
                                    <div className="grid grid-cols-[40px_1fr] gap-1">
                                        <span className="font-bold">Name:</span>
                                        <span className="uppercase font-medium">{selectedNote?.issued_by}</span>
                                    </div>
                                    <div>
                                        <div className="grid grid-cols-[50px_1fr] gap-1 mb-1 items-end">
                                            <span className="font-bold">Signature:</span>
                                            <div className="h-4"></div>
                                        </div>
                                        <div className="flex justify-center -mb-2">
                                            <div className="w-14 h-14 opacity-90 mix-blend-multiply">
                                                <img src={seaflowDigitalSeal} alt="Seal" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2 flex flex-col justify-between">
                                    <div className="grid grid-cols-[40px_1fr] gap-1">
                                        <span className="font-bold">Name:</span>
                                        <div className="uppercase font-medium whitespace-nowrap overflow-hidden text-[9px]">
                                            {selectedNote?.vehicles && selectedNote.vehicles.length > 0 ? (
                                                [
                                                    selectedNote.vehicles[0].vehicleName || selectedNote.vehicles[0].vehicleId,
                                                    selectedNote.vehicles[0].driver
                                                ].filter(Boolean).join(' / ')
                                            ) : '-'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[50px_1fr] gap-1 items-end mb-2">
                                        <span className="font-bold">Signature:</span>
                                        <div className="border-b border-gray-400 h-4"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GOODS RECEIVED BY */}
                        <div className="w-1/3 flex flex-col">
                            <div className="bg-gray-200 p-1.5 font-bold border-b border-gray-800">GOODS RECEIVED BY</div>
                            <div className="p-2 flex-grow flex flex-col justify-between min-h-[80px]">
                                <div className="grid grid-cols-[40px_1fr] gap-1">
                                    <span className="font-bold">Name:</span>
                                    <div className="border-b border-gray-400 h-4 mt-1"></div>
                                </div>
                                <div className="grid grid-cols-[50px_1fr] gap-1 items-end mb-2">
                                    <span className="font-bold">Signature:</span>
                                    <div className="border-b border-gray-400 h-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Green Box 3: Disclaimer */}
                    <p className="text-[9px] text-center text-gray-500 mb-2 flex-shrink-0">
                        Any Shortage or damage must be notified within 72 hours of receipt of goods. <br />
                        Should you have any enquiries concerning this delivery note, please contact us. <br />
                        Thank you for your business!
                    </p>
                </div>
                {/* Address / Footer Info (Pinned to bottom of content area) */}
                <div className="mt-auto pt-2 text-[10px] text-gray-600 font-medium flex flex-col items-center flex-none">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 items-center mb-1">
                        <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-black" />
                            <span>info@seaflowlogistic.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-black" />
                            <span>+960 9990371/+960 9995768</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-black" />
                            <span>www.seaflowlogistic.com</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <MapPin className="w-3 h-3 text-black" />
                        <span>Hulhumale' Lot 11393, Saima Hingun, Rep of Maldives, 23000</span>
                    </div>



                    {/* 4. Footer Image (Fixed Bottom Red Box) */}
                    <div className="absolute bottom-0 left-0 w-full z-20 font-none leading-none pointer-events-none">
                        <img
                            src={seaflowFooter}
                            alt="Footer"
                            className="w-full h-auto block"
                            style={{ maxWidth: '100%', maxHeight: '25mm' }}
                            crossOrigin="anonymous"
                        />
                    </div>
                </div>
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
                            ? selectedNote.vehicles.map(v => v.dischargeLocation).join(', ')
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
                {/* Left Side: The List */}
                <div className="p-8 overflow-y-auto custom-scrollbar transition-all duration-300 w-full">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issued delivery notes</h1>
                        <p className="text-gray-500">Overview of all generated delivery notes with quick access to documents.</p>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                        <div className="flex flex-col md:flex-row gap-6">
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
                        </div>
                    </div>

                    <div className="text-xs text-gray-400 mb-4">Showing {filteredNotes.length} delivery notes</div>

                    {/* Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6 font-semibold">Delivery</th>
                                    <th className="py-4 px-6 font-semibold w-1/4">Consignee</th>
                                    <th className="py-4 px-6 font-semibold">Jobs</th>
                                    <th className="py-4 px-6 font-semibold">Details</th>
                                    <th className="py-4 px-6 font-semibold">Issued</th>
                                    <th className="py-4 px-6 font-semibold">Status</th>
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
                                                    <span className="text-[11px] text-gray-500 uppercase tracking-wide">{note.exporter}</span>
                                                </div>
                                            </td>
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
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2 text-gray-400">
                                                    <button className="p-1 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setActiveTab('document'); }}>
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Overlay */}
                {selectedNote && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
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
                                        <button
                                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all"
                                            title="Print"
                                            onClick={handlePrint}
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all"
                                            title="Download PDF"
                                            onClick={handleDownloadPDF}
                                        >
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
                    </div>
                )}
            </div>
            <style>{`
            /* Print Styles */
            @media print {
                @page {
                    size: A4 portrait;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                }
                /* Hide everything by default */
                body * {
                    visibility: hidden;
                }
                /* Make printable content visible */
                #printable-content, #printable-content * {
                    visibility: visible;
                }
                /* Position the content to fill the page */
                #printable-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                    background: white;
                    border: none;
                    box-shadow: none;
                    overflow: hidden;
                    z-index: 9999;
                }
                /* Hide buttons/UI during print */
                button, .no-print {
                    display: none;
                }
            }

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
            @keyframes scaleIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .animate-slide-in-right {
                animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-scale-in {
                animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
        `}</style>
        </Layout >
    );
};

export default DeliveryNotes;