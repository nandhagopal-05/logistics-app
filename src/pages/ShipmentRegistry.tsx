
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { shipmentsAPI, consigneesAPI, exportersAPI, clearanceAPI, deliveryAgentsAPI } from '../services/api';
import {
    Search, Plus,
    FileText,
    MoreVertical, Pencil, Check,
    Anchor, Plane, Truck, Package, X, Download, Trash2,
    CreditCard, UploadCloud, FileSpreadsheet, Receipt


} from 'lucide-react';
import ScheduleClearanceDrawer from '../components/ScheduleClearanceDrawer';

const ShipmentRegistry: React.FC = () => {
    // State
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'empty' | 'details' | 'create'>('empty');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Details');
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [popupJob, setPopupJob] = useState<any | null>(null);
    const [popupType, setPopupType] = useState<'invoice' | 'bl' | 'payment' | 'upload' | null>(null);


    // Dropdown Data State
    const [consigneesList, setConsigneesList] = useState<any[]>([]);
    const [exportersList, setExportersList] = useState<any[]>([]);
    const [deliveryAgentsList, setDeliveryAgentsList] = useState<any[]>([]);

    // Form State (for Register New Job)
    const [isEditingJob, setIsEditingJob] = useState(false);
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
            const [consigneesRes, exportersRes, deliveryAgentsRes] = await Promise.all([
                consigneesAPI.getAll(),
                exportersAPI.getAll(),
                deliveryAgentsAPI.getAll()
            ]);
            setConsigneesList(consigneesRes.data || []);
            setExportersList(exportersRes.data || []);
            setDeliveryAgentsList(deliveryAgentsRes.data || []);
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

    const handleViewDoc = async (doc: any) => {
        try {
            const response = await shipmentsAPI.viewDocument(selectedJob.id, doc.id);
            const blob = new Blob([response.data], { type: doc.file_type || 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewDoc(doc);
        } catch (error: any) {
            console.error(error);
            const msg = error.response && error.response.status === 404
                ? "File not found on server. It may have been deleted."
                : "Unable to view document. Check console for details.";
            alert(msg);
        }
    };

    const handleDownloadDoc = async (doc: any) => {
        try {
            const response = await shipmentsAPI.downloadDocument(selectedJob.id, doc.id);
            const blob = new Blob([response.data], { type: doc.file_type || 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.file_name);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error: any) {
            console.error(error);
            const msg = error.response && error.response.status === 404
                ? "File not found on server. It may have been deleted."
                : "Unable to download document. Check console for details.";
            alert(msg);
        }
    };

    const handleJobClick = async (job: any) => {
        setSelectedJob(job);
        setViewMode('details');
        try {
            const response = await shipmentsAPI.getById(job.id);
            setSelectedJob(response.data);
        } catch (error) {
            console.error("Error fetching job details", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditJobClick = () => {
        setFormData({
            service: selectedJob.description || 'Form Filling & Clearance',
            consignee: selectedJob.receiver_name || '',
            exporter: selectedJob.sender_name || '',
            transport_mode: selectedJob.transport_mode || 'SEA',
            shipment_type: selectedJob.shipment_type || 'IMP',
            billing_contact: selectedJob.billing_contact || '',
            billing_contact_same: !selectedJob.billing_contact || selectedJob.billing_contact === selectedJob.receiver_name
        });
        setIsEditingJob(true);
        setViewMode('create');
    };

    const handleUpdateJob = async () => {
        try {
            setLoading(true);
            const updateData = {
                sender_name: formData.exporter,
                receiver_name: formData.consignee,
                transport_mode: formData.transport_mode,
                service: formData.service,
                shipment_type: formData.shipment_type,
                billing_contact: formData.billing_contact_same ? formData.consignee : formData.billing_contact
            };

            await shipmentsAPI.update(selectedJob.id, updateData);

            alert('Job Updated Successfully!');
            setIsEditingJob(false);
            setViewMode('details');
            setSelectedJob((prev: any) => ({ ...prev, ...updateData }));
            loadJobs(true);
        } catch (error) {
            console.error('Update Job Failed', error);
            alert('Failed to update job');
        } finally {
            setLoading(false);
        }
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
            apiData.append('service', formData.service);
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



    const handleEditClick = (section: string) => {
        setEditingSection(section);
        setEditFormData(selectedJob);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleCancelEdit = () => {
        setEditingSection(null);
        setEditFormData({});
    };

    const handleSaveDetails = async () => {
        if (!selectedJob) return;
        try {
            setLoading(true);
            const response = await shipmentsAPI.update(selectedJob.id, editFormData);
            const updated = response.data;
            setSelectedJob(updated);
            setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
            setEditingSection(null);
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update details");
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleSave = async (data: any) => {
        try {
            if (!selectedJob) return;
            await clearanceAPI.create({
                job_id: selectedJob.id,
                ...data
            });
            alert('Clearance Scheduled Successfully!');
            // Reload logs or job details if needed
        } catch (error) {
            console.error('Failed to schedule clearance', error);
            alert('Failed to schedule clearance');
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

            <div className="flex items-center justify-between mt-2">
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
        </div>
    );

    const renderCreateForm = () => (
        <div className="flex flex-col h-full bg-white animate-fade-in-up">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{isEditingJob ? 'Edit Job' : 'Register New Job'}</h2>
                    <p className="text-sm text-gray-500">{isEditingJob ? 'Update job details.' : 'Enter shipment details to create a new registry entry.'}</p>
                </div>
                <button onClick={() => { setViewMode(isEditingJob ? 'details' : 'empty'); setIsEditingJob(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Exporter</label>
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
                    onClick={() => { setViewMode(isEditingJob ? 'details' : 'empty'); setIsEditingJob(false); }}
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={isEditingJob ? handleUpdateJob : handleCreateSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all shadow flex justify-center items-center"
                >
                    {loading ? (isEditingJob ? 'Updating...' : 'Saving...') : (isEditingJob ? 'Update Job' : 'Save Job')}
                </button>
            </div>
        </div>
    );

    const renderDocumentsTab = () => (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Documents
            </h3>

            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="py-3 px-4 font-bold">Type</th>
                            <th className="py-3 px-4 font-bold">Name</th>
                            <th className="py-3 px-4 font-bold">Size</th>
                            <th className="py-3 px-4 font-bold">Uploaded By</th>
                            <th className="py-3 px-4 font-bold">Date</th>
                            <th className="py-3 px-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {selectedJob.documents?.length > 0 ? (
                            selectedJob.documents.map((doc: any) => (
                                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold uppercase">
                                            {doc.document_type || 'Other'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-medium text-gray-900">
                                        {doc.file_name}
                                    </td>
                                    <td className="py-3 px-4 text-gray-600">
                                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-600">
                                        {doc.uploaded_by_name || 'System'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-500">
                                        {new Date(doc.uploaded_at || doc.created_at || Date.now()).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewDoc(doc)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="View"
                                            >
                                                <Search className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadDoc(doc)}
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('Delete document?')) {
                                                        try {
                                                            await shipmentsAPI.deleteDocument(selectedJob.id, doc.id);
                                                            const res = await shipmentsAPI.getById(selectedJob.id);
                                                            setSelectedJob(res.data);
                                                        } catch (e) {
                                                            console.error(e);
                                                            alert('Failed to delete');
                                                        }
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500 italic">No documents uploaded yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t pt-6">
                <h4 className="font-semibold text-sm text-gray-700 mb-4">Upload New Document</h4>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Document Type</label>
                        <select id="docTypeSelect" className="w-full p-2 border rounded text-sm bg-gray-50">
                            <option value="Invoice">Invoice</option>
                            <option value="Packing List">Packing List</option>
                            <option value="BL/AWB">BL/AWB</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">File</label>
                        <input type="file" id="docFileInput" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    </div>
                    <button onClick={async () => {
                        const fileInput = document.getElementById('docFileInput') as HTMLInputElement;
                        const typeInput = document.getElementById('docTypeSelect') as HTMLSelectElement;
                        if (fileInput?.files?.[0]) {
                            const file = fileInput.files[0];
                            const type = typeInput.value;

                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('document_type', type);
                            try {
                                await shipmentsAPI.uploadDocument(selectedJob.id, formData);
                                alert('Uploaded successfully');
                                const res = await shipmentsAPI.getById(selectedJob.id);
                                setSelectedJob(res.data);
                                fileInput.value = '';
                            } catch (e) {
                                console.error(e);
                                alert('Upload failed');
                            }
                        }
                    }} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium text-sm">Upload</button>
                </div>
            </div>
        </div>
    );

    const renderJobDetails = () => {
        if (!selectedJob) return null;

        const isEditingInvoice = editingSection === 'invoice';
        const isEditingBL = editingSection === 'bl';
        const isEditingContainers = editingSection === 'containers';
        return (
            <div className="h-full flex flex-col animate-fade-in bg-white font-sans text-gray-900">
                {/* Header Section */}
                <div className="px-8 pt-8 pb-0 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPopupJob(selectedJob); setPopupType('invoice'); setEditFormData(selectedJob); setEditingSection(null); }}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Shipment Invoice"
                                >
                                    <Receipt className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPopupJob(selectedJob); setPopupType('bl'); setEditFormData(selectedJob); setEditingSection(null); }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="BL/AWB Details"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPopupJob(selectedJob); setPopupType('payment'); setEditFormData(selectedJob); setEditingSection(null); }}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                    title="Payment"
                                >
                                    <CreditCard className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPopupJob(selectedJob); setPopupType('upload'); setEditFormData(selectedJob); setEditingSection(null); }}
                                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                                    title="Upload Document"
                                >
                                    <UploadCloud className="w-4 h-4" />
                                </button>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 uppercase">
                                {selectedJob.customer || 'Customer Name'} / {selectedJob.id?.split('-')[1] || 'JOB'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Registered on {new Date(selectedJob.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getPaymentColor(selectedJob.payment_status)}`}>
                                    {selectedJob.status || 'New'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-8 text-sm font-medium">
                        {['Details', 'Documents', 'Payments', 'History'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">

                    {/* Top Stats Row */}
                    <div className="flex justify-between items-end mb-8">
                        <div className="flex gap-12">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Number</p>
                                <p className="font-bold text-lg text-gray-900">{selectedJob.id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mode</p>
                                <p className="font-bold text-lg text-gray-900">{selectedJob.transport_mode || 'SEA'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Service</p>
                                <p className="font-medium text-gray-900">{selectedJob.service || (['Form Filling', 'Clearance', 'Form Filling & Clearance', 'DR'].includes(selectedJob.description) ? selectedJob.description : 'Clearance')}</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-black text-white text-sm font-bold rounded flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg">
                            Send to Accounts
                        </button>
                    </div>

                    {/* Progress Bar (Mockup) */}
                    <div className="mb-8">
                        <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2 px-1">
                            <span className="text-indigo-600">Document</span>
                            <span className="text-indigo-600">Clearance</span>
                            <span className="">Accounts</span>
                            <span className="">Completed</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 w-1/2"></div>
                        </div>
                    </div>

                    {activeTab === 'Details' && (<>
                        {/* Dark Info Card */}
                        <div className="bg-slate-900 text-white rounded-xl p-8 mb-6 shadow-xl relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={handleEditJobClick} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20"><Pencil className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-3 gap-8 mb-8">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Exporter</p>
                                    <p className="font-bold text-lg">{selectedJob.exporter || selectedJob.sender_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                                    <p className="font-medium">{selectedJob.shipment_type || 'IMP'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Date</p>
                                    <p className="font-medium">{new Date(selectedJob.created_at || Date.now()).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-8">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Consignee</p>
                                    <p className="font-medium">{selectedJob.consignee || selectedJob.receiver_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Contact</p>
                                    <p className="font-medium">{selectedJob.billing_contact || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Job Invoice</p>
                                    <p className="font-medium text-slate-500 italic">Not Generated</p>
                                </div>
                            </div>
                        </div>

                        {/* Shipment Invoice Card */}
                        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    Shipment Invoice
                                </h3>
                                {isEditingInvoice ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleSaveDetails} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100"><Check className="w-4 h-4" /></button>
                                        <button onClick={handleCancelEdit} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEditClick('invoice')} className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-8">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice No.</p>
                                    {isEditingInvoice ? (
                                        <input name="invoice_no" value={editFormData.invoice_no || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.invoice_no || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cargo Type</p>
                                    {isEditingInvoice ? (
                                        <select name="cargo_type" value={editFormData.cargo_type || 'GENERAL'} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm bg-white">
                                            <option value="GENERAL">GENERAL</option>
                                            <option value="PERISHABLE">PERISHABLE</option>
                                            <option value="DANGEROUS GOODS">DANGEROUS GOODS</option>
                                            <option value="CONSOLIDATED">CONSOLIDATED</option>
                                            <option value="VALUABLE">VALUABLE</option>
                                            <option value="OTHER">OTHER</option>
                                        </select>
                                    ) : (
                                        <p className="font-semibold text-gray-900 uppercase">{selectedJob.cargo_type || 'GENERAL'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">No. Items</p>
                                    {isEditingInvoice ? (
                                        <input name="no_of_pkgs" value={editFormData.no_of_pkgs || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="0" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.no_of_pkgs || selectedJob.invoice_items || '0'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customs Form No.</p>
                                    {isEditingInvoice ? (
                                        <input name="customs_r_form" value={editFormData.customs_r_form || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.customs_r_form || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Office</p>
                                    {isEditingInvoice ? (
                                        <select name="office" value={editFormData.office || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm bg-white">
                                            <option value="">Select Office</option>
                                            <option value="MPL">MPL</option>
                                            <option value="MACL">MACL</option>
                                            <option value="MCS">MCS</option>
                                            <option value="Head Office">Head Office</option>
                                        </select>
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.office || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Registered Date</p>
                                    <p className="font-semibold text-gray-900">{new Date(selectedJob.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* BL/AWB Details Card */}
                        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    BL/AWB Details
                                </h3>
                                {isEditingBL ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleSaveDetails} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100"><Check className="w-4 h-4" /></button>
                                        <button onClick={handleCancelEdit} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEditClick('bl')} className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-8 gap-y-8">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Master No.</p>
                                    {isEditingBL ? (
                                        <input name="bl_awb_no" value={editFormData.bl_awb_no || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.bl_awb_no || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ETD</p>
                                    {isEditingBL ? (
                                        <input type="date" name="date" value={editFormData.date ? new Date(editFormData.date).toISOString().substr(0, 10) : ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.date ? new Date(selectedJob.date).toLocaleDateString() : '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ETA</p>
                                    {isEditingBL ? (
                                        <input type="date" name="expected_delivery_date" value={editFormData.expected_delivery_date ? new Date(editFormData.expected_delivery_date).toISOString().substr(0, 10) : ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.expected_delivery_date ? new Date(selectedJob.expected_delivery_date).toLocaleDateString() : '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">House No.</p>
                                    {isEditingBL ? (
                                        <input name="house_bl" value={editFormData.house_bl || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.house_bl || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Loading Port</p>
                                    {isEditingBL ? (
                                        <input name="origin" value={editFormData.origin || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900 uppercase">{selectedJob.origin || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Vessel</p>
                                    {isEditingBL ? (
                                        <input name="vessel" value={editFormData.vessel || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900 uppercase">{selectedJob.vessel || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Agent</p>
                                    {isEditingBL ? (
                                        <select
                                            name="delivery_agent"
                                            value={editFormData.delivery_agent || ''}
                                            onChange={handleEditChange}
                                            className="input-field py-1 border rounded px-2 w-full text-sm bg-white"
                                        >
                                            <option value="">Select Delivery Agent</option>
                                            {deliveryAgentsList.map((agent: any) => (
                                                <option key={agent.id} value={agent.name}>
                                                    {agent.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="font-semibold text-gray-900 uppercase">{selectedJob.delivery_agent || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Packages</p>
                                    {isEditingBL ? (
                                        <input name="no_of_pkgs" value={editFormData.no_of_pkgs || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900">{selectedJob.no_of_pkgs || '0'} BUNDLES -</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Package Type</p>
                                    <p className="font-semibold text-gray-900 uppercase">BUNDLES</p>
                                </div>
                            </div>
                        </div>

                        {/* Containers Card */}
                        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                                    <Package className="w-5 h-5 text-gray-400" />
                                    Containers
                                </h3>
                                {isEditingContainers ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleSaveDetails} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100"><Check className="w-4 h-4" /></button>
                                        <button onClick={handleCancelEdit} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEditClick('containers')} className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                                )}
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="py-3 px-4 font-bold">Number</th>
                                        <th className="py-3 px-4 font-bold">Size</th>
                                        <th className="py-3 px-4 font-bold">Unloaded Date</th>
                                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedJob.container_no || isEditingContainers ? (
                                        <tr className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-4 px-4 font-medium text-gray-900">
                                                {isEditingContainers ? (
                                                    <input name="container_no" value={editFormData.container_no || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="Container No" />
                                                ) : selectedJob.container_no}
                                            </td>
                                            <td className="py-4 px-4">
                                                {isEditingContainers ? (
                                                    <select name="container_type" value={editFormData.container_type || 'FCL 20'} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm bg-white">
                                                        <option value="FCL 20">FCL 20</option>
                                                        <option value="FCL 40">FCL 40</option>
                                                        <option value="LCL">LCL</option>
                                                        <option value="AIR">AIR</option>
                                                    </select>
                                                ) : (selectedJob.container_type || 'FCL 20')}
                                            </td>
                                            <td className="py-4 px-4">
                                                {isEditingContainers ? (
                                                    <input type="date" name="unloaded_date" value={editFormData.unloaded_date ? new Date(editFormData.unloaded_date).toISOString().substr(0, 10) : ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" />
                                                ) : (selectedJob.unloaded_date ? new Date(selectedJob.unloaded_date).toLocaleDateString() : '-')}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button className="text-gray-400 hover:text-blue-600 transition-colors"><MoreVertical className="w-4 h-4 ml-auto" /></button>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-gray-400 italic">No containers listed</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>)}

                    {activeTab === 'Documents' && renderDocumentsTab()}

                    {activeTab === 'Payments' && <div className="p-12 text-center text-gray-400 italic">Payments module coming soon...</div>}
                    {activeTab === 'History' && <div className="p-12 text-center text-gray-400 italic">History module coming soon...</div>}

                </div>
            </div>
        );
    };

    const handlePopupSave = async () => {
        if (!popupJob) return;
        try {
            setLoading(true);
            const response = await shipmentsAPI.update(popupJob.id, editFormData);
            const updated = response.data;
            setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
            if (selectedJob?.id === updated.id) {
                setSelectedJob(updated);
            }
            alert("Details updated successfully");
            setPopupType(null);
            setPopupJob(null);
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update details");
        } finally {
            setLoading(false);
        }
    };

    const renderPopup = () => {
        if (!popupJob || !popupType) return null;

        return (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setPopupType(null); setPopupJob(null); }}>
                <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 capitalize flex items-center gap-2">
                                {popupType === 'invoice' && <Receipt className="w-6 h-6 text-indigo-600" />}
                                {popupType === 'bl' && <FileSpreadsheet className="w-6 h-6 text-blue-600" />}
                                {popupType === 'payment' && <CreditCard className="w-6 h-6 text-emerald-600" />}
                                {popupType === 'upload' && <UploadCloud className="w-6 h-6 text-violet-600" />}
                                {popupType === 'bl' ? 'BL/AWB Details' : popupType === 'invoice' ? 'Shipment Invoice' : popupType === 'payment' ? 'Payment Details' : 'Upload Document'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Job: {popupJob.id} - {popupJob.customer}</p>
                        </div>
                        <button onClick={() => { setPopupType(null); setPopupJob(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        {popupType === 'invoice' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice No.</label>
                                    <input name="invoice_no" value={editFormData.invoice_no || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo Type</label>
                                    <select name="cargo_type" value={editFormData.cargo_type || 'GENERAL'} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="GENERAL">GENERAL</option>
                                        <option value="PERISHABLE">PERISHABLE</option>
                                        <option value="HARDWARE">HARDWARE</option>
                                        <option value="GARMENTS">GARMENTS</option>
                                        <option value="ELECTRONICS">ELECTRONICS</option>
                                        <option value="DRY FOODS">DRY FOODS</option>
                                        <option value="FURNITURE">FURNITURE</option>
                                        <option value="OTHER">OTHER</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. Items</label>
                                    <input name="no_of_pkgs" value={editFormData.no_of_pkgs || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customs Form No.</label>
                                    <input name="customs_r_form" value={editFormData.customs_r_form || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Office</label>
                                    <select name="office" value={editFormData.office || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">Select Office</option>
                                        <option value="00MP">00MP</option>
                                        <option value="00AP">00AP</option>
                                        <option value="00HA">00HA</option>
                                        <option value="00BW">00BW</option>
                                        <option value="00HK">00HK</option>
                                        <option value="00HM">00HM</option>
                                        <option value="00PO">00PO</option>
                                        <option value="00SG">00SG</option>
                                        <option value="00SH">00SH</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {popupType === 'bl' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Master No.</label>
                                    <input name="bl_awb_no" value={editFormData.bl_awb_no || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">House No.</label>
                                    <input name="house_bl" value={editFormData.house_bl || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ETA</label>
                                    <input type="date" name="expected_delivery_date" value={editFormData.expected_delivery_date ? new Date(editFormData.expected_delivery_date).toISOString().substr(0, 10) : ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loading Port</label>
                                    <input name="origin" value={editFormData.origin || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vessel</label>
                                    <input name="vessel" value={editFormData.vessel || ''} onChange={handleEditChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Delivery Agent</label>
                                    <select
                                        name="delivery_agent"
                                        value={editFormData.delivery_agent || ''}
                                        onChange={handleEditChange}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="">Select Delivery Agent</option>
                                        {deliveryAgentsList.map((agent: any) => (
                                            <option key={agent.id} value={agent.name}>
                                                {agent.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {popupType === 'payment' && (
                            <div className="text-center py-8 text-gray-500 italic">
                                Payments module coming soon...
                            </div>
                        )}

                        {popupType === 'upload' && (
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Document Type</label>
                                        <select id="docTypeSelectPopup" className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="Invoice">Invoice</option>
                                            <option value="Packing List">Packing List</option>
                                            <option value="BL/AWB">BL/AWB</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">File</label>
                                        <input type="file" id="docFileInputPopup" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                        <button onClick={() => { setPopupType(null); setPopupJob(null); }} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>

                        {popupType === 'upload' ? (
                            <button onClick={async () => {
                                const fileInput = document.getElementById('docFileInputPopup') as HTMLInputElement;
                                const typeInput = document.getElementById('docTypeSelectPopup') as HTMLSelectElement;
                                if (fileInput?.files?.[0]) {
                                    const file = fileInput.files[0];
                                    const type = typeInput.value;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('document_type', type);
                                    try {
                                        setLoading(true);
                                        await shipmentsAPI.uploadDocument(popupJob.id, formData);
                                        alert('Uploaded successfully');
                                        // Refresh job if it's the selected one
                                        if (selectedJob?.id === popupJob.id) {
                                            const res = await shipmentsAPI.getById(popupJob.id);
                                            setSelectedJob(res.data);
                                        }
                                        setPopupType(null);
                                        setPopupJob(null);
                                    } catch (e) {
                                        console.error(e);
                                        alert('Upload failed');
                                    } finally {
                                        setLoading(false);
                                    }
                                } else {
                                    alert('Please select a file');
                                }
                            }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                                Upload Document
                            </button>
                        ) : popupType !== 'payment' && (
                            <button onClick={handlePopupSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                                Save Details
                            </button>
                        )}
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

            {/* Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center p-4 border-b">
                            <div>
                                <h3 className="font-bold text-gray-900">{previewDoc.file_name}</h3>
                                <p className="text-xs text-gray-500 uppercase">{previewDoc.document_type || 'Document'}</p>
                            </div>
                            <button onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 p-1 relative">
                            {previewDoc.file_type?.startsWith('image/') ? (
                                <img src={previewUrl || ''} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                                <iframe
                                    src={previewUrl || ''}
                                    className="w-full h-full border-none"
                                    title="Document Preview"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ScheduleClearanceDrawer
                isOpen={isScheduleDrawerOpen}
                onClose={() => setIsScheduleDrawerOpen(false)}
                onSave={handleScheduleSave}
                job={selectedJob}
            />
            {renderPopup()}
        </Layout>
    );
};

export default ShipmentRegistry;
