
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { shipmentsAPI, consigneesAPI, exportersAPI, clearanceAPI, deliveryAgentsAPI, vendorsAPI, paymentsAPI } from '../services/api';
import {
    Search, Plus,
    FileText,
    Pencil, Check,
    Anchor, Plane, Truck, Package, X, Download, Trash2,
    CreditCard, UploadCloud, FileSpreadsheet, Receipt, Calendar


} from 'lucide-react';
import ScheduleClearanceDrawer from '../components/ScheduleClearanceDrawer';
import SearchableSelect from '../components/SearchableSelect';

const PACKAGE_TYPES = ['PALLET', 'BUNDLES', 'CARTON', 'PKG', 'BOX', 'CASE', 'BULK', 'UNIT'];

const ShipmentRegistry: React.FC = () => {
    // State
    const { user } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [jobPayments, setJobPayments] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'empty' | 'details' | 'create'>('empty');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [activeTab, setActiveTab] = useState('Details');
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [popupJob, setPopupJob] = useState<any | null>(null);
    const [popupType, setPopupType] = useState<'invoice' | 'bl' | 'payment' | 'upload' | 'schedule' | null>(null);


    // Dropdown Data State
    const [consigneesList, setConsigneesList] = useState<any[]>([]);
    const [exportersList, setExportersList] = useState<any[]>([]);
    const [deliveryAgentsList, setDeliveryAgentsList] = useState<any[]>([]);
    const [vendorsList, setVendorsList] = useState<any[]>([]);

    // Form State (for Register New Job)
    const [isEditingJob, setIsEditingJob] = useState(false);
    const [formData, setFormData] = useState({
        service: 'Clearance',
        consignee: '',
        exporter: '',
        transport_mode: 'SEA',
        shipment_type: 'IMP',
        billing_contact_same: true,
        billing_contact: '',
        manual_invoice_no: ''
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

    useEffect(() => {
        if (selectedJob && activeTab === 'Payments') {
            loadPayments(selectedJob.id);
        }
    }, [selectedJob?.id, activeTab]);

    const loadPayments = async (jobId: string) => {
        try {
            const res = await paymentsAPI.getAll(jobId);
            setJobPayments(res.data || []);
        } catch (e) {
            console.error("Failed to load payments", e);
        }
    };

    const loadDropdownData = async () => {
        try {
            const [consigneesRes, exportersRes, deliveryAgentsRes, vendorsRes] = await Promise.all([
                consigneesAPI.getAll(),
                exportersAPI.getAll(),
                deliveryAgentsAPI.getAll(),
                vendorsAPI.getAll()
            ]);
            setConsigneesList(consigneesRes.data || []);
            setExportersList(exportersRes.data || []);
            setDeliveryAgentsList(deliveryAgentsRes.data || []);
            setVendorsList(vendorsRes.data || []);
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
            billing_contact: '',
            manual_invoice_no: ''
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
            billing_contact_same: !selectedJob.billing_contact || selectedJob.billing_contact === selectedJob.receiver_name,
            manual_invoice_no: selectedJob.invoice_id || selectedJob.invoice?.id || ''
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

                billing_contact: formData.billing_contact_same ? formData.consignee : formData.billing_contact,
                job_invoice_no: formData.manual_invoice_no,
                // Ensure we don't accidentally overwrite shipment invoice with job invoice
                invoice_no: selectedJob.invoice_no
            };

            await shipmentsAPI.update(selectedJob.id, updateData);

            alert('Job Updated Successfully!');
            setIsEditingJob(false);
            setViewMode('details');
            setSelectedJob((prev: any) => ({
                ...prev,
                ...updateData,
                invoice_id: formData.manual_invoice_no,
                invoice: { ...prev.invoice, id: formData.manual_invoice_no }
            }));
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

            // Set Billing Contact
            const finalBilling = formData.billing_contact_same ? formData.consignee : formData.billing_contact;
            apiData.append('billing_contact', finalBilling);

            // Manual Invoice Number (Job Invoice)
            // Use 'job_invoice_no' to distinguish from 'invoice_no' (Shipment Invoice)
            apiData.append('job_invoice_no', formData.manual_invoice_no);

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



    const initializePackages = (job: any) => {
        if (job.packages && Array.isArray(job.packages) && job.packages.length > 0) {
            return job.packages;
        }
        // Fallback or init from flat fields if they exist
        if (job.no_of_pkgs || job.weight || job.package_type) {
            return [{
                count: job.no_of_pkgs,
                weight: job.weight,
                type: job.package_type || 'BUNDLES'
            }];
        }
        return [{ count: '', weight: '', type: 'BUNDLES' }];
    };

    const handleOpenPopup = (type: any, job: any) => {
        setPopupJob(job);
        setPopupType(type);
        const initialData = { ...job };
        if (type === 'bl') {
            initialData.packages = initializePackages(job);
        }
        if (type === 'schedule') {
            initialData.date = new Date().toISOString().split('T')[0];
            initialData.type = 'Normal';
            initialData.port = 'MALE';
            initialData.bl_awb = job.bl_awb_no || '';

        }
        setEditFormData(initialData);
        setEditingSection(null);
    };

    const handlePackageChange = (index: number, field: string, value: any) => {
        const newPackages = [...(editFormData.packages || [])];
        newPackages[index] = { ...newPackages[index], [field]: value };

        // Recalculate totals
        const totalPkgs = newPackages.reduce((sum, p) => sum + (Number(p.count) || 0), 0);
        const totalWeight = newPackages.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

        setEditFormData((prev: any) => ({
            ...prev,
            packages: newPackages,
            no_of_pkgs: totalPkgs,
            weight: totalWeight,
            package_type: newPackages.length === 1 ? newPackages[0].type : 'MIXED'
        }));
    };

    const addPackage = () => {
        setEditFormData((prev: any) => ({
            ...prev,
            packages: [...(prev.packages || []), { count: '', weight: '', type: 'BUNDLES' }]
        }));
    };

    const removePackage = (index: number) => {
        const newPackages = editFormData.packages.filter((_: any, i: number) => i !== index);
        const totalPkgs = newPackages.reduce((sum: number, p: any) => sum + (Number(p.count) || 0), 0);
        const totalWeight = newPackages.reduce((sum: number, p: any) => sum + (Number(p.weight) || 0), 0);

        setEditFormData((prev: any) => ({
            ...prev,
            packages: newPackages,
            no_of_pkgs: totalPkgs,
            weight: totalWeight
        }));
    };

    const handleEditClick = (section: string) => {
        setEditingSection(section);
        const initialData = { ...selectedJob };
        if (section === 'bl') {
            initialData.packages = initializePackages(selectedJob);
        }
        setEditFormData(initialData);
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

            // Sanitize data before sending
            const updatedData = { ...editFormData };
            if (updatedData.unloaded_date === '') {
                updatedData.unloaded_date = null;
            }
            // Sanitize other date fields just in case
            if (updatedData.expected_delivery_date === '') {
                updatedData.expected_delivery_date = null;
            }
            if (updatedData.date === '') {
                updatedData.date = null;
            }

            const response = await shipmentsAPI.update(selectedJob.id, updatedData);
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
            const currentJobId = popupJob?.id || selectedJob?.id;
            if (!currentJobId) return;

            await clearanceAPI.create({
                job_id: currentJobId,
                ...data
            });
            alert('Clearance Scheduled Successfully!');

            // Refresh Data
            loadJobs(true);
            const updatedJob = await shipmentsAPI.getById(currentJobId);
            setSelectedJob(updatedJob.data);

            // Close popup if it was open via popup state
            if (popupType === 'schedule') {
                setPopupType(null);
                setPopupJob(null);
            }
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

    const handleDeleteJob = async (jobId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            try {
                await shipmentsAPI.delete(jobId);
                setJobs(prev => prev.filter(j => j.id !== jobId));
                if (selectedJob?.id === jobId) {
                    setSelectedJob(null);
                    setViewMode('empty');
                }
                alert('Job deleted successfully');
            } catch (error) {
                console.error("Failed to delete job", error);
                alert("Failed to delete job");
            }
        }
    };

    // --- Render Helpers ---

    const renderInboxItem = (job: any) => (
        <div
            key={job.id}
            onClick={() => handleJobClick(job)}
            className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 group relative
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

                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">
                        {new Date(job.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {user?.role === 'Administrator' && (
                        <button
                            onClick={(e) => handleDeleteJob(job.id, e)}
                            className="p-1 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Job"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight pr-6">{job.customer || 'Unknown Customer'}</h4>
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

                {/* Section: Manual Job Invoice */}
                <div className="form-group mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Job Invoice No. <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input
                        type="text"
                        name="manual_invoice_no"
                        value={formData.manual_invoice_no || ''}
                        onChange={handleInputChange}
                        placeholder="Enter Job Invoice Number"
                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-700"
                    />
                </div>

                {/* Section B: Consignee */}
                <div className="form-group relative z-30">
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Consignee</label>
                        <SearchableSelect
                            options={consigneesList.map((c: any) => ({
                                id: c.id,
                                label: c.name,
                                value: c.name
                            }))}
                            value={formData.consignee}
                            onChange={(val) => setFormData(prev => ({ ...prev, consignee: val }))}
                            placeholder="Select Consignee"
                            required
                        />
                    </div>
                </div>
                {/* Section C: Exporter */}
                <div className="form-group relative z-20">
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Exporter</label>
                        <SearchableSelect
                            options={exportersList.map((e: any) => ({
                                id: e.id,
                                label: e.name,
                                value: e.name
                            }))}
                            value={formData.exporter}
                            onChange={(val) => setFormData(prev => ({ ...prev, exporter: val }))}
                            placeholder="Select Exporter"
                            required
                        />
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
                                <input
                                    list="billing-contact-list"
                                    name="billing_contact"
                                    value={formData.billing_contact}
                                    onChange={handleInputChange}
                                    placeholder="Search or Select Billing Contact..."
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-700"
                                />
                                <datalist id="billing-contact-list">
                                    {consigneesList.map((consignee: any) => (
                                        <option key={consignee.id} value={consignee.name} />
                                    ))}
                                </datalist>
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
                                    onClick={(e) => { e.stopPropagation(); handleOpenPopup('invoice', selectedJob); }}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Shipment Invoice"
                                >
                                    <Receipt className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenPopup('bl', selectedJob); }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="BL/AWB Details"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenPopup('payment', selectedJob); }}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                    title="Payment"
                                >
                                    <CreditCard className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenPopup('upload', selectedJob); }}
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
                        {selectedJob.clearance_schedule ? (
                            <button className="px-4 py-2 bg-black text-white text-sm font-bold rounded flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg">
                                Send to Accounts
                            </button>
                        ) : (
                            <button
                                onClick={() => handleOpenPopup('schedule', selectedJob)}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg"
                            >
                                <Calendar className="w-4 h-4" /> Schedule Clearance
                            </button>
                        )}
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
                                    <p className="font-medium text-slate-200">{selectedJob.invoice_id || selectedJob.invoice?.id || <span className="text-slate-500 italic">Not Generated</span>}</p>
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
                                            <option value="HARDWARE">HARDWARE</option>
                                            <option value="GARMENTS">GARMENTS</option>
                                            <option value="ELECTRONICS">ELECTRONICS</option>
                                            <option value="DRY FOODS">DRY FOODS</option>
                                            <option value="FURNITURE">FURNITURE</option>
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
                                        <input name="loading_port" value={editFormData.loading_port || editFormData.origin || ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" placeholder="-" />
                                    ) : (
                                        <p className="font-semibold text-gray-900 uppercase">{selectedJob.loading_port || selectedJob.origin || '-'}</p>
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
                                {isEditingBL ? (
                                    <div className="col-span-3">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Packages</label>
                                        <div className="space-y-2">
                                            {editFormData.packages?.map((pkg: any, idx: number) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        type="number"
                                                        placeholder="Count"
                                                        value={pkg.count}
                                                        onChange={e => handlePackageChange(idx, 'count', e.target.value)}
                                                        className="w-20 input-field py-1 border rounded px-2 text-sm"
                                                    />
                                                    <select
                                                        value={pkg.type}
                                                        onChange={e => handlePackageChange(idx, 'type', e.target.value)}
                                                        className="w-32 input-field py-1 border rounded px-2 text-sm bg-white"
                                                    >
                                                        {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder="Weight (KG)"
                                                        value={pkg.weight}
                                                        onChange={e => handlePackageChange(idx, 'weight', e.target.value)}
                                                        className="w-24 input-field py-1 border rounded px-2 text-sm"
                                                    />

                                                    <button onClick={() => removePackage(idx)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            <button onClick={addPackage} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                                <Plus className="w-3 h-3" /> Add Package
                                            </button>
                                            <div className="text-xs text-gray-500 font-medium pt-2 border-t mt-2">
                                                Total: {editFormData.no_of_pkgs} Pkgs, {editFormData.weight} KG, Type: {editFormData.package_type}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Packages</p>
                                            <p className="font-semibold text-gray-900">{selectedJob.no_of_pkgs || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Weight (KG)</p>
                                            <p className="font-semibold text-gray-900">{selectedJob.weight || '0'} KG</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Package Type</p>
                                            <p className="font-semibold text-gray-900 uppercase">{selectedJob.package_type || '-'}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {selectedJob.transport_mode === 'SEA' && (
                            <>
                                {/* Containers Card */}
                                <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100 transition-all">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                                            <Package className="w-5 h-5 text-gray-400" />
                                            Containers
                                        </h3>
                                        {!isEditingContainers && (
                                            <button
                                                onClick={() => handleEditClick('containers')}
                                                className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-colors"
                                                title={selectedJob.container_no ? "Edit Container" : "Add Container"}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                            <tr>
                                                <th className="py-3 px-4 font-bold">Number</th>
                                                <th className="py-3 px-4 font-bold">Size</th>
                                                <th className="py-3 px-4 font-bold">Unloaded Date</th>
                                                <th className="py-3 px-4 font-bold text-center">Actions</th>
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
                                                                <option value="LCL 20">LCL 20</option>
                                                                <option value="LCL 40">LCL 40</option>
                                                                <option value="OT 20">OT 20</option>
                                                                <option value="OT 40">OT 40</option>
                                                                <option value="FR 20">FR 20</option>
                                                                <option value="FR 40">FR 40</option>
                                                                <option value="D/R">D/R</option>
                                                                <option value="Reefer">Reefer 20ft</option>
                                                                <option value="Reefer">Reefer 40ft</option>
                                                                <option value="Loose cargo">Loose cargo</option>
                                                            </select>
                                                        ) : (selectedJob.container_type || 'FCL 20')}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        {isEditingContainers ? (
                                                            <input type="date" name="unloaded_date" value={editFormData.unloaded_date ? new Date(editFormData.unloaded_date).toISOString().substr(0, 10) : ''} onChange={handleEditChange} className="input-field py-1 border rounded px-2 w-full text-sm" />
                                                        ) : (selectedJob.unloaded_date ? new Date(selectedJob.unloaded_date).toLocaleDateString() : '-')}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {isEditingContainers ? (
                                                            <div className="flex items-center justify-center gap-3">
                                                                <button onClick={handleSaveDetails} className="bg-green-50 text-green-600 p-1.5 rounded hover:bg-green-100 transition-colors" title="Save">
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={handleCancelEdit} className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-100 transition-colors" title="Cancel">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-4">
                                                                <button onClick={() => handleEditClick('containers')} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-all" title="Edit">
                                                                    <Pencil className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('Are you sure you want to remove this container?')) {
                                                                            try {
                                                                                const updatedData = { ...selectedJob, container_no: null, container_type: null, unloaded_date: null };
                                                                                await shipmentsAPI.update(selectedJob.id, updatedData);
                                                                                // Refresh locally
                                                                                setSelectedJob(updatedData);
                                                                                setJobs(prev => prev.map(j => j.id === updatedData.id ? updatedData : j));
                                                                            } catch (e) {
                                                                                console.error("Failed to delete container", e);
                                                                                alert("Failed to delete container");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-indigo-600 hover:bg-red-50 hover:text-red-600 p-2 rounded-full transition-all"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
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
                            </>
                        )}
                    </>)}

                    {activeTab === 'Documents' && renderDocumentsTab()}
                    {activeTab === 'Payments' && renderPaymentsTab()}
                    {activeTab === 'History' && <div className="p-12 text-center text-gray-400 italic">History module coming soon...</div>}

                </div>
            </div >
        );
    };

    const renderPaymentsTab = () => {
        const totalCompany = jobPayments.filter(p => p.paid_by === 'Company').reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalCustomer = jobPayments.filter(p => p.paid_by === 'Customer').reduce((sum, p) => sum + parseFloat(p.amount), 0);

        return (
            <div className="p-8 font-sans">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Payments</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Paid By Company</span>
                        <span className="text-3xl font-bold text-gray-900">{totalCompany.toFixed(2)}</span>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Paid By Client</span>
                        <span className="text-3xl font-bold text-gray-900">{totalCustomer.toFixed(2)}</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="py-4 px-6 font-bold">Description</th>
                                <th className="py-4 px-6 font-bold">Vendor</th>
                                <th className="py-4 px-6 font-bold">Paid By</th>
                                <th className="py-4 px-6 font-bold">Requested By</th>
                                <th className="py-4 px-6 font-bold">Requested Date</th>
                                <th className="py-4 px-6 font-bold">Amount</th>
                                <th className="py-4 px-6 font-bold text-center">Status</th>
                                <th className="py-4 px-6 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-400 italic">No payments recorded</td>
                                </tr>
                            ) : (
                                jobPayments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6 font-medium text-gray-900">{payment.payment_type}</td>
                                        <td className="py-4 px-6">{payment.vendor}</td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${payment.paid_by === 'Company' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {payment.paid_by}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">{payment.requested_by_name || '-'}</td>
                                        <td className="py-4 px-6 text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                                        <td className="py-4 px-6">{parseFloat(payment.amount).toFixed(2)}</td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex justify-center">
                                                {payment.status === 'Approved' ? (
                                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600" title="Pending">
                                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        alert('Approve logic coming soon');
                                                    }}
                                                    className="w-8 h-8 rounded-full hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors flex items-center justify-center"
                                                    title="Approve"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Delete payment?')) {
                                                            try {
                                                                await paymentsAPI.delete(payment.id);
                                                                loadPayments(selectedJob.id);
                                                            } catch (e) { console.error(e); }
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors flex items-center justify-center"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const handlePopupSave = async () => {
        if (!popupJob) return;
        try {
            setLoading(true);

            if (popupType === 'schedule') {
                await clearanceAPI.create({
                    job_id: popupJob.id,
                    ...editFormData
                });
                // Relaxed refresh logic
                const res = await shipmentsAPI.getById(popupJob.id);
                const updated = res.data;
                setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
                if (selectedJob?.id === updated.id) {
                    setSelectedJob(updated);
                }
                alert("Clearance Scheduled Successfully");
            } else if (popupType === 'payment') {
                await paymentsAPI.create({
                    job_id: popupJob.id,
                    ...editFormData
                });
                alert('Payment Details Added Successfully');
                loadPayments(popupJob.id);
            } else {
                const response = await shipmentsAPI.update(popupJob.id, editFormData);
                const updated = response.data;
                setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
                if (selectedJob?.id === updated.id) {
                    setSelectedJob(updated);
                }
                alert("Details updated successfully");
            }

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
        if (!popupJob || !popupType || popupType === 'schedule') return null;

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
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Packages</label>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                                        <div className="grid grid-cols-10 gap-2 text-xs font-bold text-gray-400 mb-1">
                                            <div className="col-span-3">Count</div>
                                            <div className="col-span-4">Type</div>
                                            <div className="col-span-3">Weight (KG)</div>
                                        </div>
                                        {editFormData.packages?.map((pkg: any, idx: number) => (
                                            <div key={idx} className="grid grid-cols-10 gap-2 items-center">
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        value={pkg.count}
                                                        onChange={e => handlePackageChange(idx, 'count', e.target.value)}
                                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <select
                                                        value={pkg.type}
                                                        onChange={e => handlePackageChange(idx, 'type', e.target.value)}
                                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                                    >
                                                        {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-3 flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={pkg.weight}
                                                        onChange={e => handlePackageChange(idx, 'weight', e.target.value)}
                                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                        placeholder="0.0"
                                                    />
                                                    {editFormData.packages.length > 1 && (
                                                        <button onClick={() => removePackage(idx)} className="text-gray-400 hover:text-red-500">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={addPackage} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors text-sm font-medium flex justify-center items-center gap-2">
                                            <Plus className="w-4 h-4" /> Add Package
                                        </button>
                                        <div className="flex justify-between items-center pt-2 text-sm font-bold text-gray-700">
                                            <span>Total:</span>
                                            <span>{editFormData.no_of_pkgs} Pkgs / {editFormData.weight} KG</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {popupType === 'payment' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type *</label>
                                    <select name="payment_type" value={editFormData.payment_type || ''} onChange={handleEditChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">Select Type</option>
                                        <option value="MCS Processing">MCS Processing</option>
                                        <option value="MCS Import Duty">MCS Import Duty</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor *</label>
                                    <select name="vendor" value={editFormData.vendor || ''} onChange={handleEditChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">Select Vendor</option>
                                        {vendorsList.map((v: any) => (
                                            <option key={v.id} value={v.name}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">MVR</span>
                                        <input type="number" name="amount" value={editFormData.amount || ''} onChange={handleEditChange} className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Ref. No.</label>
                                    <input type="text" name="bill_ref_no" value={editFormData.bill_ref_no || ''} onChange={handleEditChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Reference Number" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Paid By *</label>
                                    <select name="paid_by" value={editFormData.paid_by || ''} onChange={handleEditChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">Select Payer</option>
                                        <option value="Company">Company</option>
                                        <option value="Customer">Customer</option>
                                    </select>
                                </div>
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
                        ) : (
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


            {popupType === 'schedule' && popupJob && (
                <ScheduleClearanceDrawer
                    isOpen={true}
                    onClose={() => { setPopupType(null); setPopupJob(null); }}
                    onSave={handleScheduleSave}
                    job={popupJob}
                    initialData={editFormData}
                />
            )}

            {renderPopup()}
        </Layout>
    );
};

export default ShipmentRegistry;
