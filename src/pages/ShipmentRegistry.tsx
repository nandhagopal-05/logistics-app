
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { shipmentsAPI, consigneesAPI, exportersAPI } from '../services/api';
import {
    Search, Plus, Ship,
    FileText,
    MoreVertical, Calendar,
    Anchor, Plane, Truck, Package, X
} from 'lucide-react';

const ShipmentRegistry: React.FC = () => {
    // State
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'empty' | 'details' | 'create'>('empty');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Dropdown Data State
    const [consigneesList, setConsigneesList] = useState<any[]>([]);
    const [exportersList, setExportersList] = useState<any[]>([]);

    // Form State (for Register New Job)
    const [formData, setFormData] = useState({
        service: 'Clearance',
        consignee: '',
        exporter: '',
        transport_mode: 'SEA',
        shipment_type: 'IMP',
        billing_contact_same: true,
        billing_contact: ''
    });

    useEffect(() => {
        loadJobs();
        loadDropdownData();

        // Poll for updates every 5 seconds
        const intervalId = setInterval(() => {
            // Only poll if we aren't currently searching (to avoid UI jumpiness during typing)
            if (!searchTerm) {
                // Pass true to silentLoading to avoid showing the full spinner on every poll
                loadJobs(true);
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [searchTerm]);

    const loadDropdownData = async () => {
        try {
            const [consigneesRes, exportersRes] = await Promise.all([
                consigneesAPI.getAll(),
                exportersAPI.getAll()
            ]);
            setConsigneesList(consigneesRes.data || []);
            setExportersList(exportersRes.data || []);
        } catch (error) {
            console.error("Failed to load dropdown data", error);
        }
    };

    const loadJobs = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await shipmentsAPI.getAll({ search: searchTerm });
            const fetchedJobs = response.data || [];
            // Map backend fields to UI expected fields if necessary, though backend should return standard set.
            setJobs(fetchedJobs.map((j: any) => ({
                ...j,
                payment_status: j.payment_status || 'Pending',
                // Fallbacks if data is missing
                exporter: j.sender_name || 'Unknown Exporter',
                customer: j.customer || j.sender_name || 'Unknown Customer'
            })));
        } catch (error) {
            console.error("Failed to load jobs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        setFormData({
            service: 'Clearance',
            consignee: '',
            exporter: '',
            transport_mode: 'SEA',
            shipment_type: 'IMP',
            billing_contact_same: true,
            billing_contact: ''
        });
        setViewMode('create');
        setSelectedJob(null);
        // Ensure dropdowns are fresh
        loadDropdownData();
    };

    const handleJobClick = (job: any) => {
        setSelectedJob(job);
        setViewMode('details');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateSubmit = async () => {
        try {
            setLoading(true);

            // Construct FormData as expected by the backend
            // The backend expects generic fields: sender_name, receiver_name, transport_mode, etc.
            const apiData = new FormData();

            // Map UI 'Exporter' -> sender_name / customer
            apiData.append('sender_name', formData.exporter);

            // Map UI 'Consignee' -> receiver_name
            apiData.append('receiver_name', formData.consignee);

            apiData.append('transport_mode', formData.transport_mode);

            // Backend requires these, so we provide defaults or mapped values
            apiData.append('description', `${formData.service}`);
            apiData.append('weight', '0'); // default
            apiData.append('price', '0');  // default

            // Default dates
            apiData.append('date', new Date().toISOString());
            apiData.append('expected_delivery_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()); // +7 days

            // Note: File uploads are not in this simplified form yet, but backend handles them optionally.

            await shipmentsAPI.create(apiData);

            alert('Job Created Successfully!');
            setViewMode('empty');
            loadJobs();

        } catch (error: any) {
            console.error('Create Job Failed', error);
            alert('Failed to create job: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode?.toUpperCase()) {
            case 'SEA': return <Anchor className="w-3 h-3" />;
            case 'AIR': return <Plane className="w-3 h-3" />;
            case 'ROAD': return <Truck className="w-3 h-3" />;
            default: return <Package className="w-3 h-3" />;
        }
    };

    const getModeColor = (mode: string) => {
        switch (mode?.toUpperCase()) {
            case 'SEA': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'AIR': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'ROAD': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPaymentColor = (status: string) => {
        return status === 'Paid'
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
            : 'bg-amber-100 text-amber-700 border-amber-200';
    };

    // --- Render Helpers ---

    const renderInboxItem = (job: any) => (
        <div
            key={job.id}
            onClick={() => handleJobClick(job)}
            className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 group
                ${selectedJob?.id === job.id
                    ? 'bg-indigo-50 border-l-4 border-indigo-500 shadow-sm'
                    : 'hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-300'
                }
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">
                    {job.id}
                </span>
                <span className="text-xs font-medium text-gray-400">
                    {new Date(job.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            </div>

            <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{job.customer || 'Unknown Customer'}</h4>
            <p className="text-xs text-gray-500 mb-3 truncate">{job.exporter}</p>

            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${getModeColor(job.transport_mode)}`}>
                    {getModeIcon(job.transport_mode)}
                    {job.transport_mode || 'SEA'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentColor(job.payment_status)}`}>
                    {job.payment_status}
                </span>
            </div>
        </div>
    );

    const renderCreateForm = () => (
        <div className="flex flex-col h-full bg-white animate-fade-in-up">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Register New Job</h2>
                    <p className="text-sm text-gray-500">Enter shipment details to create a new registry entry.</p>
                </div>
                <button onClick={() => setViewMode('empty')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                {/* Section A: Service */}
                <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Service</label>
                    <div className="relative">
                        <select
                            name="service"
                            value={formData.service}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none font-medium text-gray-700"
                        >
                            <option value="Form Filling">Form Filling</option>
                            <option value="Clearance">Clearance</option>
                            <option value="Form Filling & Clearance">Form Filling & Clearance</option>
                            <option value="DR">DR</option>
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Section B: Consignee */}
                <div className="form-group">
                    <div className="mt-4 animate-fade-in-down">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Consignee</label>
                        <div className="relative">
                            <select
                                name="consignee"
                                value={formData.consignee}
                                onChange={handleInputChange}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none text-gray-700"
                            >
                                <option value="">Select Consignee</option>
                                {consigneesList.map((consignee: any) => (
                                    <option key={consignee.id} value={consignee.name || consignee.id}>
                                        {consignee.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Section C: Exporter */}
                <div className="form-group">
                    <div className="mt-4 animate-fade-in-down">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">exporter</label>
                        <div className="relative">
                            <select
                                name="exporter"
                                value={formData.exporter}
                                onChange={handleInputChange}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none text-gray-700"
                            >
                                <option value="">Select Exporter</option>
                                {exportersList.map((exporter: any) => (
                                    <option key={exporter.id} value={exporter.name || exporter.id}>
                                        {exporter.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Section D: Transport Mode */}
                    <div className="form-group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Transport Mode</label>
                        <div className="relative">
                            <select
                                name="transport_mode"
                                value={formData.transport_mode}
                                onChange={handleInputChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none text-gray-700"
                            >
                                <option value="SEA">SEA</option>
                                <option value="AIR">AIR</option>
                                <option value="POST">POST</option>
                                <option value="EXPORT">EXPORT</option>
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Section E: Shipment Type */}
                    <div className="form-group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Shipment Type</label>
                        <div className="relative">
                            <select
                                name="shipment_type"
                                value={formData.shipment_type}
                                onChange={handleInputChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none text-gray-700"
                            >
                                <option value="IMP">IMP</option>
                                <option value="EXP">EXP</option>
                                <option value="TRANSIT">TRANSIT</option>
                                <option value="BOND">BOND</option>
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section F: Billing Contact */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.billing_contact_same}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_contact_same: e.target.checked }))}
                            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                            <span className="block text-sm font-medium text-gray-900">Billing contact is same as consignee</span>
                            <span className="block text-xs text-gray-500 mt-0.5">If unchecked, you can specify a different billing party.</span>
                        </div>
                    </label>

                    {!formData.billing_contact_same && (
                        <div className="mt-4 animate-fade-in-down">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Contact</label>
                            <div className="relative">
                                <select
                                    name="billing_contact"
                                    value={formData.billing_contact}
                                    onChange={handleInputChange}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none text-gray-700"
                                >
                                    <option value="">Select Billing Contact...</option>
                                    <option value="Contact 1">Contact 1</option>
                                </select>
                                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50">
                <button
                    onClick={() => setViewMode('empty')}
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={handleCreateSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all shadow flex justify-center items-center"
                >
                    {loading ? 'Saving...' : 'Save Job'}
                </button>
            </div>
        </div>
    );

    const renderJobDetails = () => {
        if (!selectedJob) return null;
        return (
            <div className="h-full flex flex-col animate-fade-in bg-white">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-8 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-bold text-gray-900">{selectedJob.customer || 'Valued Customer'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getPaymentColor(selectedJob.payment_status)}`}>
                                {selectedJob.payment_status}
                            </span>
                        </div>

                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span>Job No: <span className="font-mono font-bold text-gray-700">{selectedJob.id}</span></span>
                            <span className="text-gray-300">•</span>
                            <span>Registered: {new Date(selectedJob.created_at || Date.now()).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Schedule Clearance
                    </button>
                </div>

                {/* Tabs & Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                    {/* Job Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Job Summary</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border flex items-center gap-1 ${getModeColor(selectedJob.transport_mode)}`}>
                                        {getModeIcon(selectedJob.transport_mode)}
                                        {selectedJob.transport_mode || 'SEA'}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        / {selectedJob.status || 'Clearance'}
                                    </span>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative pt-4 pb-8">
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-100">
                                <div style={{ width: '40%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"></div>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-gray-500 px-1">
                                <span className="text-indigo-600">Document</span>
                                <span className="text-indigo-600">Clearance</span>
                                <span>Accounts</span>
                                <span>Completed</span>
                            </div>
                        </div>

                        {/* Exporter / Consignee Block */}
                        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                            <div className="relative z-10 grid grid-cols-2 gap-12">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Exporter</p>
                                    <p className="font-bold text-xl tracking-tight">{selectedJob.exporter || 'Exporter Name'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Consignee</p>
                                    <p className="font-bold text-xl tracking-tight">{selectedJob.receiver_name || selectedJob.customer}</p>
                                </div>
                            </div>
                            <div className="relative z-10 grid grid-cols-2 gap-12 mt-8 pt-6 border-t border-slate-700/50">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">TYPE</p>
                                    <p className="font-mono text-sm">IMP</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">REGISTERED</p>
                                    <p className="font-mono text-sm">{new Date(selectedJob.created_at || Date.now()).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500 opacity-10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>
                        </div>
                    </div>

                    {/* Placeholder for Details Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                Shipment Invoice
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-gray-50 pb-3">
                                    <span className="text-gray-500 text-sm">Invoice No</span>
                                    <span className="font-mono text-sm font-medium text-gray-900">{selectedJob.invoice_id || selectedJob.invoice?.id || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-3">
                                    <span className="text-gray-500 text-sm">Items</span>
                                    <span className="font-medium text-gray-900 text-sm">{selectedJob.description || 'General Cargo'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Ship className="w-5 h-5" />
                                </div>
                                BL/AWB Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-gray-50 pb-3">
                                    <span className="text-gray-500 text-sm">Master No</span>
                                    <span className="font-mono text-sm font-medium text-gray-900">-</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-3">
                                    <span className="text-gray-500 text-sm">House No</span>
                                    <span className="font-mono text-sm font-medium text-gray-900">-</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-100px)] flex border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm font-sans">
                {/* Left Panel: Inbox */}
                <div className="w-[380px] min-w-[320px] border-r border-gray-100 flex flex-col bg-white z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                    <div className="p-5 border-b border-gray-100">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Inbox</h2>

                            <button onClick={handleCreateClick} className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all shadow-md">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search Job No, BL/AWB, Exporter..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-dashed border-indigo-600"></div></div>
                        ) : (
                            jobs.map(renderInboxItem)
                        )}
                        {jobs.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <Search className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-900">No shipments found</p>
                                <p className="text-xs text-gray-500 mt-1">Try adjusting your search filters</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Workspace */}
                <div className="flex-1 bg-gray-50/30 relative overflow-hidden">
                    {viewMode === 'empty' && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-gray-50/50">
                                <Truck className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Nothing here yet</h3>
                            <p className="text-gray-500 max-w-sm mb-8">
                                To view a job, select a job from the inbox.<br />
                                To add a new job, click the + button to create manually, or use the upload icon for Excel import.
                            </p>
                        </div>
                    )}

                    {viewMode === 'create' && renderCreateForm()}
                    {viewMode === 'details' && renderJobDetails()}

                </div>
            </div>

        </Layout>
    );
};

export default ShipmentRegistry;
