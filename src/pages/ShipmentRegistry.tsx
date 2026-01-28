
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { shipmentsAPI, consigneesAPI, exportersAPI, clearanceAPI, deliveryAgentsAPI, vendorsAPI, paymentsAPI, paymentItemsAPI, logsAPI } from '../services/api';
import {
    Search, Plus,
    FileText,
    Check, Pencil,
    Anchor, Plane, Truck, Package, X, Download, Trash2,
    CreditCard, UploadCloud, FileSpreadsheet, Calendar, MoreHorizontal, ChevronRight, Lock


} from 'lucide-react';
import ScheduleClearanceDrawer from '../components/ScheduleClearanceDrawer';
import BLDrawer from '../components/BLDrawer';
import SearchableSelect from '../components/SearchableSelect';
import ShipmentInvoiceDrawer from '../components/ShipmentInvoiceDrawer';




interface PackageDetail {
    count: string | number;
    weight: string | number;
    type: string;
}

interface JobFormData {
    service: string;
    consignee: string;
    exporter: string;
    transport_mode: string;
    shipment_type: string;
    billing_contact_same: boolean;
    billing_contact: string;
    manual_invoice_no: string;
    bl_awb_no: string;
    house_bl: string;
    date: string;
    expected_delivery_date: string;
    loading_port: string;
    vessel: string;
    delivery_agent: string;
    packages: PackageDetail[];
    [key: string]: any; // Allow dynamic access
}

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
    const [editFormData, setEditFormData] = useState<any>({});
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [isEditingJobDetails, setIsEditingJobDetails] = useState(false);
    const [jobDetailsForm, setJobDetailsForm] = useState<any>({});

    // Drawer State
    const [isBLDrawerOpen, setIsBLDrawerOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [popupJob, setPopupJob] = useState<any | null>(null);
    const [popupData, setPopupData] = useState<any | null>(null);
    const [popupType, setPopupType] = useState<'invoice' | 'bl' | 'payment' | 'upload' | 'schedule' | null>(null);

    // Multi-Container / Multi-BL State
    const [addingContainer, setAddingContainer] = useState(false);
    const [editingContainerId, setEditingContainerId] = useState<string | null>(null);
    const [newContainer, setNewContainer] = useState<any>({ container_no: '', container_type: 'FCL 20', unloaded_date: '' });

    const [newBL, setNewBL] = useState<any>({ master_bl: '', house_bl: '', loading_port: '', vessel: '', etd: '', eta: '', delivery_agent: '' });

    // Invoice Drawer State
    const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);

    const handleInvoiceDrawerSave = async (data: any) => {
        try {
            // Include unloaded_date null handling if empty
            // Sanitize payload
            const payload = {
                ...data,
                no_of_pkgs: data.no_of_pkgs ? parseInt(data.no_of_pkgs) : null,
                invoice_no: data.invoice_no || null,
                customs_r_form: data.customs_r_form || null,
                unloaded_date: data.unloaded_date || null
            };



            await shipmentsAPI.update(selectedJob.id, payload);

            // Instant Refresh
            const freshJobRes = await shipmentsAPI.getById(selectedJob.id);
            const freshJob = freshJobRes.data;
            setSelectedJob(freshJob);
            setJobs(prev => prev.map(j => j.id === freshJob.id ? freshJob : j));

            setIsInvoiceDrawerOpen(false);
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update invoice details");
        }
    };

    const handleSaveNewContainer = async () => {
        if (!newContainer.container_no) return alert('Container number is required');
        try {
            let updatedList;
            if (newContainer.id) {
                // Update
                const updated = await shipmentsAPI.updateContainer(selectedJob.id, newContainer.id, newContainer);
                updatedList = selectedJob.containers.map((c: any) => c.id === newContainer.id ? updated.data : c);
            } else {
                // Create
                const added = await shipmentsAPI.addContainer(selectedJob.id, newContainer);
                updatedList = [...(selectedJob.containers || []), added.data];
            }

            const updatedJob = { ...selectedJob, containers: updatedList };
            setSelectedJob(updatedJob);
            setJobs(prev => prev.map(j => j.id === selectedJob.id ? updatedJob : j));
            setAddingContainer(false);
            setEditingContainerId(null);
            setNewContainer({ container_no: '', container_type: 'FCL 20', unloaded_date: '' });
        } catch (e) {
            console.error(e);
            alert('Failed to save container');
        }
    };

    const handleDeleteContainerItem = async (containerId: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await shipmentsAPI.deleteContainer(selectedJob.id, containerId);
            const updatedContainers = selectedJob.containers.filter((c: any) => c.id !== containerId);
            const updatedJob = { ...selectedJob, containers: updatedContainers };
            setSelectedJob(updatedJob);
            setJobs(prev => prev.map(j => j.id === selectedJob.id ? updatedJob : j));
        } catch (e) {
            console.error(e); // alert('Failed to delete');
        }
    };



    const handleDeleteBLItem = async (blId: string) => {
        if (!window.confirm('Are you sure you want to delete this BL?')) return;
        try {
            await shipmentsAPI.deleteBL(selectedJob.id, blId);
            // Refresh logic
            const refreshed = await shipmentsAPI.getById(selectedJob.id);
            setSelectedJob(refreshed.data);
            setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...refreshed.data } : j));
        } catch (e) {
            console.error(e);
            alert('Failed to delete BL');
        }
    };

    const handleBLDrawerSave = async (data: any) => {
        try {
            // 1. Save or Update BL
            let savedBL: any;
            let updatedBLList;

            // Prepare BL payload (exclude containers/packages for the BL call if API doesn't support it)
            // Assuming API ignores extra fields or we clean it.
            const blPayload = {
                master_bl: data.master_bl,
                house_bl: data.house_bl,
                loading_port: data.loading_port,
                vessel: data.vessel,
                etd: data.etd,
                eta: data.eta,
                delivery_agent: data.delivery_agent,
                packages: data.packages || [],
                containers: data.containers || []
            };

            if (data.id) {
                const updated = await shipmentsAPI.updateBL(selectedJob.id, data.id, blPayload);
                savedBL = updated.data;
                updatedBLList = selectedJob.bls.map((b: any) => b.id === data.id ? savedBL : b);
            } else {
                const added = await shipmentsAPI.addBL(selectedJob.id, blPayload);
                savedBL = added.data;
                updatedBLList = [...(selectedJob.bls || []), savedBL];
            }

            // 2. Save Packages Only (User requested separation)
            // The drawer now returns 'packages' array

            let updatedJobPackages = selectedJob.packages || [];

            // if (data.packages) {
            //     const newPackages = data.packages.map((i: any) => ({
            //         count: i.pkg_count,
            //         type: i.pkg_type,
            //         weight: i.weight || 0
            //     }));

            //     updatedJobPackages = newPackages; // Replace existing packages to prevent duplication
            //     // Update Job with new packages
            //     await shipmentsAPI.update(selectedJob.id, { packages: updatedJobPackages });
            // }

            // 3. Refresh Details from Server to ensure consistency
            try {
                const refreshed = await shipmentsAPI.getById(selectedJob.id);
                setSelectedJob(refreshed.data);
                setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...refreshed.data } : j));
            } catch (refreshErr) {
                console.error("Error refreshing job after save", refreshErr);
                // Fallback to local update if refresh fails
                const updatedJob = {
                    ...selectedJob,
                    bls: updatedBLList,
                    packages: updatedJobPackages
                };
                setSelectedJob(updatedJob);
                setJobs(prev => prev.map(j => j.id === selectedJob.id ? updatedJob : j));
            }

            setIsBLDrawerOpen(false);
            setNewBL({ master_bl: '', house_bl: '', loading_port: '', vessel: '', etd: '', eta: '', delivery_agent: '' });

        } catch (e) {
            console.error(e);
            alert('Failed to save BL details');
        }
    };





    // Dropdown Data State
    const [consigneesList, setConsigneesList] = useState<any[]>([]);
    const [exportersList, setExportersList] = useState<any[]>([]);
    const [deliveryAgentsList, setDeliveryAgentsList] = useState<any[]>([]);
    const [vendorsList, setVendorsList] = useState<any[]>([]);
    const [paymentTypesList, setPaymentTypesList] = useState<any[]>([]);

    // Form State (for Register New Job)
    const [isEditingJob, setIsEditingJob] = useState(false);
    const [formData, setFormData] = useState<JobFormData>({
        service: 'Clearance',
        consignee: '',
        exporter: '',
        transport_mode: 'SEA',
        shipment_type: 'IMP',
        billing_contact_same: true,
        billing_contact: '',
        manual_invoice_no: '',
        // BL/AWB Details
        bl_awb_no: '',
        house_bl: '',
        date: '',
        expected_delivery_date: '',
        loading_port: '',
        vessel: '',
        delivery_agent: '',
        packages: [{ count: '', weight: '', type: '' }]
    });

    useEffect(() => {
        loadJobs();
        loadDropdownData();

        // Poll for updates every 5 seconds
        const intervalId = setInterval(() => {
            // Only poll if we aren't currently searching
            if (!searchTerm) {
                // Silent load of list
                loadJobs(true);

                // If a job is selected, refresh its details (to capture status changes like Payments)
                if (selectedJob?.id) {
                    shipmentsAPI.getById(selectedJob.id)
                        .then(res => {
                            setSelectedJob((prev: any) => {
                                // Merge to keep any local UI state on the object if any (though usually separate)
                                return { ...prev, ...res.data };
                            });
                            // If Payments tab is active, refresh payments too
                            if (activeTab === 'Payments') {
                                loadPayments(selectedJob.id);
                            }
                        })
                        .catch(err => console.error("Background refresh failed", err));
                }
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [searchTerm, selectedJob?.id, activeTab]); // Dependencies trigger restart of timer, ensuring we have latest closures

    useEffect(() => {
        if (selectedJob && activeTab === 'Payments') {
            loadPayments(selectedJob.id);
        }
        if (selectedJob && activeTab === 'History') {
            logsAPI.getAll({ entity_id: selectedJob.id, entity_type: 'SHIPMENT' })
                .then(res => setHistoryLogs(res.data))
                .catch(err => console.error("Failed to load history", err));
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

    const handleSendToAccounts = async () => {
        const draftIds = jobPayments.filter((p: any) => p.status === 'Draft').map((p: any) => p.id);
        if (draftIds.length === 0) return;

        try {
            setLoading(true);
            await paymentsAPI.sendBatch(draftIds);
            alert('Payments sent to accounts successfully!');
            loadPayments(selectedJob.id);
        } catch (e) {
            console.error(e);
            alert('Failed to send payments to accounts');
        } finally {
            setLoading(false);
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

            // Load Payment Types
            const paymentItemsRes = await paymentItemsAPI.getAll();
            setPaymentTypesList(paymentItemsRes.data || []);
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
            manual_invoice_no: '',
            // BL/AWB Details
            bl_awb_no: '',
            house_bl: '',
            date: '', // ETD
            expected_delivery_date: '', // ETA
            loading_port: '',
            vessel: '',
            delivery_agent: '',
            packages: [{ count: '', weight: '', type: '' }]
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


            // Default dates or user inputs (though now UI input is removed, defaults will primarily be used)
            apiData.append('date', formData.date || new Date().toISOString());
            apiData.append('expected_delivery_date', formData.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

            // BL/AWB Fields - Optional/Empty at creation now
            apiData.append('bl_awb_no', '');
            apiData.append('house_bl', '');
            apiData.append('loading_port', '');
            apiData.append('origin', 'China'); // Default fallback
            apiData.append('vessel', '');
            apiData.append('delivery_agent', '');

            // Packages logic - simplified as UI input is removed
            // Just send defaults or empty checks if for some reason state has data
            const pkgs = formData.packages || [];
            const totalPkgs = pkgs.reduce((s: number, p: PackageDetail) => s + (Number(p.count) || 0), 0);
            const totalWeight = pkgs.reduce((s: number, p: PackageDetail) => s + (Number(p.weight) || 0), 0);
            // Derive main package type from first package or MIXED
            const mainType = pkgs.length > 0 && pkgs[0].type ? pkgs[0].type : '';

            apiData.append('no_of_pkgs', totalPkgs.toString());
            apiData.append('weight', totalWeight.toString());
            apiData.append('package_type', mainType);
            apiData.append('pkg_type', mainType); // Sync


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



    // initializePackages removed as it was unused

    const handleOpenPopup = (type: any, job: any) => {
        // Redirect to new Drawers for specific types
        if (type === 'invoice') {
            if (selectedJob?.id !== job.id) setSelectedJob(job);
            setIsInvoiceDrawerOpen(true);
            return;
        }
        if (type === 'bl') {
            if (selectedJob?.id !== job.id) setSelectedJob(job);
            setNewBL({ master_bl: '', house_bl: '', loading_port: '', vessel: '', etd: '', eta: '', delivery_agent: '' });
            setIsBLDrawerOpen(true);
            return;
        }

        // Logic for legacy popups (schedule, payment, upload)
        setPopupJob(job);
        setPopupType(type);
        const initialData = { ...job };

        if (type === 'schedule') {
            initialData.date = new Date().toISOString().split('T')[0];
            initialData.type = '';
            initialData.port = '';
            initialData.bl_awb = job.bl_awb_no || '';
        }
        setEditFormData(initialData);

    };



    // Inline editing handlers removed as they are replaced by Drawers
    // Restoring handleEditChange as it is used by other legacy popups
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditFormData((prev: any) => ({ ...prev, [name]: value }));
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Legacy/Payment specific
            case 'Payment': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'New': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(job.status || 'New')}`}>
                        {job.status || 'New'}
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

        // Progress Calculations based on 4 Stages
        const isSea = (selectedJob.transport_mode || 'SEA') === 'SEA';

        // Stage 1: Documentation (25%)
        // Rule: Documents uploaded AND details filled (Invoice, BL/AWB, Containers if Sea)
        const hasDocuments = selectedJob.documents && selectedJob.documents.length > 0;
        const hasInvoiceDetails = !!(selectedJob.invoice_no && selectedJob.no_of_pkgs && selectedJob.cargo_type);
        const hasBLDetails = selectedJob.bls && selectedJob.bls.length > 0;
        const hasContainerDetails = !isSea || (selectedJob.containers && selectedJob.containers.length > 0);

        const isDocComplete = hasDocuments && hasInvoiceDetails && hasBLDetails && hasContainerDetails;

        // Stage 2: Clearance (50%)
        // Rule: All BLs have Delivery Notes ISSUED (Backend sets status='Cleared' or progress=100)
        // Completion happens when DN is issued for all BLs.
        const isClearanceComplete = isDocComplete && (selectedJob.status === 'Cleared' || selectedJob.status === 'Completed' || (selectedJob.progress && parseInt(selectedJob.progress) === 100));

        // Stage 3: Accounts (75%)
        // Rule: Clearance Complete AND All payments processed (is_fully_paid)
        const isPaymentComplete = selectedJob.is_fully_paid; // Calculated by backend (total > 0 && total == paid)
        const isAccountsComplete = isClearanceComplete && isPaymentComplete;

        // Stage 4: Completed (100%)
        // Rule: Manually marked as Completed
        const isJobCompleted = selectedJob.status === 'Completed';

        let activeStage = 0;
        if (isDocComplete) activeStage = 1;
        if (isClearanceComplete) activeStage = 2;
        if (isAccountsComplete) activeStage = 3;
        if (isJobCompleted) activeStage = 4;

        const handleMarkCompleted = async () => {
            let jobInvoice = selectedJob.job_invoice_no;

            if (!jobInvoice) {
                const input = window.prompt("Job Invoice Number is required to complete the job. Please enter it below:");
                if (input === null) return; // Cancelled
                if (!input.trim()) {
                    alert("Job Invoice Number cannot be empty.");
                    return;
                }
                jobInvoice = input.trim();
            } else {
                if (!window.confirm('Are you sure you want to mark this job as fully COMPLETED?')) return;
            }

            try {
                // Update both status and job_invoice_no (if it was just entered)
                await shipmentsAPI.update(selectedJob.id, {
                    status: 'Completed',
                    job_invoice_no: jobInvoice
                });

                // Refresh
                const res = await shipmentsAPI.getById(selectedJob.id);
                setSelectedJob(res.data);
                setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...res.data } : j));
            } catch (e) {
                console.error(e);
                alert('Failed to update status');
            }
        };

        const handleEditJobDetails = () => {
            setJobDetailsForm({
                exporter: selectedJob.exporter || selectedJob.sender_name || '',
                consignee: selectedJob.consignee || selectedJob.receiver_name || '',
                shipment_type: selectedJob.shipment_type || 'IMP',
                billing_contact: selectedJob.billing_contact || '',
                job_invoice_no: selectedJob.job_invoice_no || selectedJob.invoice_id || selectedJob.invoice?.invoice_no || ''
            });
            setIsEditingJobDetails(true);
            setOpenMenu(null);
        };

        const handleSaveJobDetails = async () => {
            try {
                await shipmentsAPI.update(selectedJob.id, jobDetailsForm);
                const res = await shipmentsAPI.getById(selectedJob.id);
                setSelectedJob(res.data);
                setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, ...res.data } : j));
                setIsEditingJobDetails(false);
            } catch (e) {
                console.error(e);
                alert('Failed to update details');
            }
        };

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white font-sans text-gray-900">
                {/* Header Section */}
                <div className="px-8 pt-6 pb-0 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            {/* Quick Actions Icons */}
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    onClick={() => handleOpenPopup('invoice', selectedJob)}
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                    title="Shipment Invoice"
                                >
                                    <FileText className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleOpenPopup('bl', selectedJob)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                    title="BL/AWB Details"
                                >
                                    <FileSpreadsheet className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleOpenPopup('payment', selectedJob)}
                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                    title="Add Payment"
                                >
                                    <CreditCard className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleOpenPopup('upload', selectedJob)}
                                    className="p-2 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors"
                                    title="Upload Document"
                                >
                                    <UploadCloud className="w-5 h-5" />
                                </button>
                            </div>

                            <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-tight">
                                {selectedJob.customer || 'Customer Name'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 font-medium">
                                Registered on {new Date(selectedJob.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(selectedJob.status || 'New')}`}>
                                {selectedJob.status || 'New'}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-8 text-sm font-bold tracking-wide">
                        {['Details', 'Documents', 'Payments', 'History'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">

                    {/* Job Summary Section (3.1) */}
                    <div className="flex justify-between items-end mb-8">
                        <div className="flex gap-12">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Job Number</p>
                                <p className="font-bold text-xl text-gray-900">{selectedJob.id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mode</p>
                                <p className="font-bold text-xl text-gray-900">{selectedJob.transport_mode || 'SEA'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Service</p>
                                <p className="font-bold text-xl text-gray-900">{selectedJob.service || 'Clearance'}</p>
                            </div>

                        </div>
                        <div>
                            {/* Action Button Logic */}
                            {!isClearanceComplete ? (
                                <button
                                    onClick={() => handleOpenPopup('schedule', selectedJob)}
                                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                >
                                    <Calendar className="w-4 h-4" /> Schedule Clearance
                                </button>
                            ) : !isAccountsComplete ? (
                                <button
                                    onClick={() => setActiveTab('Payments')}
                                    className="px-5 py-2.5 bg-black text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 animate-pulse"
                                >
                                    Go to Payments <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : !isJobCompleted ? (
                                <button
                                    onClick={handleMarkCompleted}
                                    className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                                >
                                    <Check className="w-4 h-4" /> Mark Completed
                                </button>
                            ) : (
                                <span className="px-5 py-2.5 bg-gray-100 text-gray-400 text-sm font-bold rounded-lg flex items-center gap-2 cursor-default border border-gray-200">
                                    <Lock className="w-4 h-4" /> Job Closed
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar (3.1) */}
                    <div className="mb-10">
                        <div className="flex justify-between text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                            <span className={activeStage >= 1 ? "text-indigo-600" : ""}>Document (25%)</span>
                            <span className={activeStage >= 2 ? "text-indigo-600" : ""}>Clearance (50%)</span>
                            <span className={activeStage >= 3 ? "text-indigo-600" : ""}>Accounts (75%)</span>
                            <span className={activeStage >= 4 ? "text-indigo-600" : ""}>Completed (100%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden relative">
                            {/* Background markers for 25, 50, 75 */}
                            <div className="absolute top-0 bottom-0 left-1/4 w-0.5 bg-white/50 z-10"></div>
                            <div className="absolute top-0 bottom-0 left-2/4 w-0.5 bg-white/50 z-10"></div>
                            <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-white/50 z-10"></div>

                            <div className="h-full bg-indigo-600 transition-all duration-700 ease-in-out" style={{ width: `${(activeStage / 4) * 100}%` }}></div>
                        </div>
                    </div>

                    {activeTab === 'Details' && (<>

                        {/* Exporter / Consignee Block - Dark Card */}
                        <div className="bg-slate-900 text-white rounded-xl p-8 mb-6 shadow-xl relative group">
                            {isEditingJobDetails ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Exporter</label>
                                            <input
                                                type="text"
                                                value={jobDetailsForm.exporter}
                                                onChange={e => setJobDetailsForm({ ...jobDetailsForm, exporter: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Consignee</label>
                                            <input
                                                type="text"
                                                value={jobDetailsForm.consignee}
                                                onChange={e => setJobDetailsForm({ ...jobDetailsForm, consignee: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
                                            <select
                                                value={jobDetailsForm.shipment_type}
                                                onChange={e => setJobDetailsForm({ ...jobDetailsForm, shipment_type: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="IMP">IMP</option>
                                                <option value="EXP">EXP</option>
                                                <option value="CROSS">CROSS</option>
                                                <option value="DOMESTIC">DOMESTIC</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Billing Contact</label>
                                            <input
                                                type="text"
                                                value={jobDetailsForm.billing_contact}
                                                onChange={e => setJobDetailsForm({ ...jobDetailsForm, billing_contact: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Registered Date</label>
                                            <p className="font-medium text-slate-200 py-2">{new Date(selectedJob.created_at || Date.now()).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 block">Job Invoice No.</label>
                                            <input
                                                type="text"
                                                value={jobDetailsForm.job_invoice_no}
                                                onChange={e => setJobDetailsForm({ ...jobDetailsForm, job_invoice_no: e.target.value })}
                                                placeholder="Enter Invoice No"
                                                className="w-full bg-slate-800 border border-indigo-500/50 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-800">
                                        <button
                                            onClick={() => setIsEditingJobDetails(false)}
                                            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveJobDetails}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="absolute top-6 right-6">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'jobDetails' ? null : 'jobDetails'); }}
                                            className="text-slate-400 hover:text-white transition-colors"
                                            title="Options"
                                        >
                                            <MoreHorizontal className="w-6 h-6" />
                                        </button>
                                        {openMenu === 'jobDetails' && (
                                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-100 py-1 animate-fade-in-down">
                                                <button
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium flex items-center gap-2"
                                                    onClick={handleEditJobDetails}
                                                >
                                                    <Pencil className="w-4 h-4" /> Edit Details
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Exporter</p>
                                            <p className="font-bold text-lg text-slate-100">{selectedJob.exporter || selectedJob.sender_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consignee</p>
                                            <p className="font-bold text-lg text-slate-100">{selectedJob.consignee || selectedJob.receiver_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</p>
                                            <p className="font-bold text-lg text-slate-100">{selectedJob.shipment_type || 'IMP'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Contact</p>
                                            <p className="font-medium text-slate-200">{selectedJob.billing_contact || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Registered Date</p>
                                            <p className="font-medium text-slate-200">{new Date(selectedJob.created_at || Date.now()).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Job Invoice</p>
                                            <p className="font-medium text-slate-200">{selectedJob.job_invoice_no || selectedJob.invoice_id || selectedJob.invoice?.invoice_no || <span className="opacity-50 italic">Not Generated</span>}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Shipment Invoice Section (4) */}
                        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-200 relative">
                            <div className="absolute top-6 right-6 flex gap-2">
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'invoice' ? null : 'invoice'); }}
                                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                        title="Options"
                                    >
                                        <MoreHorizontal className="w-6 h-6" />
                                    </button>
                                    {openMenu === 'invoice' && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-100 py-1 animate-fade-in-down">
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium flex items-center gap-2"
                                                onClick={() => { handleOpenPopup('invoice', selectedJob); setOpenMenu(null); }}
                                            >
                                                <Pencil className="w-4 h-4" /> Edit
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                Shipment Invoice
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice No.</p>
                                    <p className="font-bold text-gray-900">{selectedJob.invoice_no || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cargo Type</p>
                                    <p className="font-bold text-gray-900 uppercase">{selectedJob.cargo_type || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">No. Items</p>
                                    <p className="font-bold text-gray-900">{selectedJob.no_of_pkgs || '0'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customs Form No.</p>
                                    <p className="font-bold text-gray-900">{selectedJob.customs_r_form || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Registered Date</p>
                                    <p className="font-bold text-gray-900">{new Date(selectedJob.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Office</p>
                                    <p className="font-bold text-gray-900 uppercase">{selectedJob.office || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* BL/AWB Details Section (5) */}
                        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-200 relative">
                            <div className="absolute top-6 right-6 flex gap-2">
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'bl' ? null : 'bl'); }}
                                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                        title="Manage BL/AWB"
                                    >
                                        <MoreHorizontal className="w-6 h-6" />
                                    </button>
                                    {openMenu === 'bl' && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-100 py-1 animate-fade-in-down">
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium flex items-center gap-2"
                                                onClick={() => {
                                                    if (selectedJob.bls && selectedJob.bls.length > 0) {
                                                        setNewBL(selectedJob.bls[0]);
                                                    } else {
                                                        setNewBL({ master_bl: '', house_bl: '', loading_port: '', vessel: '', etd: '', eta: '', delivery_agent: '' });
                                                    }
                                                    setIsBLDrawerOpen(true);
                                                    setOpenMenu(null);
                                                }}
                                            >
                                                <Pencil className="w-4 h-4" /> Edit
                                            </button>
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium flex items-center gap-2"
                                                onClick={() => {
                                                    setNewBL({ master_bl: '', house_bl: '', loading_port: '', vessel: '', etd: '', eta: '', delivery_agent: '' });
                                                    setIsBLDrawerOpen(true);
                                                    setOpenMenu(null);
                                                }}
                                            >
                                                <Plus className="w-4 h-4" /> Add
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                BL/AWB Details
                            </h3>

                            {/* Displaying Single BL or First BL for summary view as per design implies singular card fields */}
                            {/* If multiple BLs, we might list them. But requirement 5 lists single fields. */}
                            {/* I will display the first BL if available, or dashes. */}
                            {selectedJob.bls && selectedJob.bls.length > 0 ? (
                                selectedJob.bls.map((bl: any, index: number) => (
                                    <div key={index} className={index > 0 ? "mt-8 pt-8 border-t-2 border-dashed border-gray-100 relative" : "relative"}>
                                        {/* Edit Action per BL for convenience */}
                                        <div className="absolute top-0 right-0 flex gap-1">
                                            <button
                                                onClick={() => { setNewBL(bl); setIsBLDrawerOpen(true); }}
                                                className="text-gray-300 hover:text-indigo-600 p-1"
                                                title="Edit this BL"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBLItem(bl.id)}
                                                className="text-gray-300 hover:text-red-600 p-1"
                                                title="Delete this BL"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Master No.</p>
                                                <p className="font-bold text-gray-900 break-all">{bl.master_bl || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">House No.</p>
                                                <p className="font-bold text-gray-900 break-all">{bl.house_bl || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ETD</p>
                                                <p className="font-bold text-gray-900">{bl.etd ? new Date(bl.etd).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ETA</p>
                                                <p className="font-bold text-gray-900">{bl.eta ? new Date(bl.eta).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Loading Port</p>
                                                <p className="font-bold text-gray-900">{bl.loading_port || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Vessel</p>
                                                <p className="font-bold text-gray-900">{bl.vessel || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Agent</p>
                                                <p className="font-bold text-gray-900">{bl.delivery_agent || '-'}</p>
                                            </div>
                                        </div>

                                        {/* Packages List */}
                                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Packages Breakdown</h4>
                                            {(() => {
                                                let displayPackages = bl.packages || [];
                                                // Check for nested container structure
                                                if (displayPackages.length > 0 && displayPackages[0].container_no) {
                                                    displayPackages = displayPackages.flatMap((c: any) =>
                                                        typeof c.packages === 'string' ? JSON.parse(c.packages) : (c.packages || [])
                                                    );
                                                }

                                                if (displayPackages.length > 0) {
                                                    return (
                                                        <div className="space-y-3">
                                                            {/* Header Row */}
                                                            <div className="grid grid-cols-3 gap-4 pb-2 border-b border-gray-200">
                                                                <div className="text-xs font-bold text-gray-500 uppercase">Count</div>
                                                                <div className="text-xs font-bold text-gray-500 uppercase">CBM</div>
                                                                <div className="text-xs font-bold text-gray-500 uppercase">Type</div>
                                                            </div>
                                                            {/* Items */}
                                                            {displayPackages.map((pkg: any, idx: number) => (
                                                                <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                                                                    <div className="font-bold text-gray-900 text-sm">{pkg.pkg_count || 0}</div>
                                                                    <div className="font-medium text-gray-700 text-sm">{pkg.cbm || (pkg.weight ? `${pkg.weight} KG` : '-')}</div>
                                                                    <div className="font-bold text-gray-900 text-sm uppercase">{pkg.pkg_type || 'PKG'}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                } else {
                                                    return <p className="text-sm text-gray-400 italic">No package details specified</p>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 italic">
                                    No BL/AWB details available. Click 'Add' to register one.
                                </div>
                            )}
                        </div>

                        {/* Containers Section (6) - Only for SEA */}

                        <div className={`bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-200 ${selectedJob.transport_mode !== 'SEA' ? 'hidden' : ''}`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    <Package className="w-5 h-5 text-orange-600" />
                                    Containers
                                </h3>
                                <button
                                    onClick={() => setAddingContainer(true)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-bold flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Container
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="py-3 px-4 font-bold">Number</th>
                                            <th className="py-3 px-4 font-bold">Size</th>
                                            <th className="py-3 px-4 font-bold">Unloaded Date</th>
                                            <th className="py-3 px-4 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {/* Add Container Row */}
                                        {addingContainer && (
                                            <tr className="bg-indigo-50/30">
                                                <td className="p-2">
                                                    <input value={newContainer.container_no} onChange={e => setNewContainer({ ...newContainer, container_no: e.target.value })} className="input-field w-full py-1 px-2 border rounded" placeholder="No." autoFocus />
                                                </td>
                                                <td className="p-2">
                                                    <select value={newContainer.container_type} onChange={e => setNewContainer({ ...newContainer, container_type: e.target.value })} className="input-field w-full py-1 px-2 border rounded bg-white">
                                                        <option value="FCL 20">FCL 20</option>
                                                        <option value="FCL 40">FCL 40</option>
                                                        <option value="LCL 20">LCL 20</option>
                                                        <option value="LCL 40">LCL 40</option>
                                                        <option value="OT 20">OT 20</option>
                                                        <option value="OT 40">OT 40</option>
                                                        <option value="FR 20">FR 20</option>
                                                        <option value="FR 40">FR 40</option>
                                                        <option value="DR">D/R</option>
                                                        <option value="RF 20">Reefer 20 ft</option>
                                                        <option value="RF 40">Reefer 40 ft</option>
                                                        <option value="LO">Loose Cargo</option>
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input type="date" value={newContainer.unloaded_date} onChange={e => setNewContainer({ ...newContainer, unloaded_date: e.target.value })} className="input-field w-full py-1 px-2 border rounded" />
                                                </td>
                                                <td className="p-2 text-right">
                                                    <button onClick={handleSaveNewContainer} className="text-green-600 hover:bg-green-100 p-1 rounded mr-2"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setAddingContainer(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><X className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        )}
                                        {selectedJob.containers && selectedJob.containers.length > 0 ? (
                                            selectedJob.containers.map((c: any) => {
                                                const isEditing = c.id === editingContainerId;
                                                return isEditing ? (
                                                    <tr key={c.id} className="bg-indigo-50/30">
                                                        <td className="p-2">
                                                            <input
                                                                value={newContainer.container_no}
                                                                onChange={e => setNewContainer({ ...newContainer, container_no: e.target.value })}
                                                                className="input-field w-full py-1 px-2 border rounded"
                                                                placeholder="No."
                                                                autoFocus
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <select
                                                                value={newContainer.container_type}
                                                                onChange={e => setNewContainer({ ...newContainer, container_type: e.target.value })}
                                                                className="input-field w-full py-1 px-2 border rounded bg-white"
                                                            >
                                                                <option value="FCL 20">FCL 20</option>
                                                                <option value="FCL 40">FCL 40</option>
                                                                <option value="LCL 20">LCL 20</option>
                                                                <option value="LCL 40">LCL 40</option>
                                                                <option value="OT 20">OT 20</option>
                                                                <option value="OT 40">OT 40</option>
                                                                <option value="FR 20">FR 20</option>
                                                                <option value="FR 40">FR 40</option>
                                                                <option value="DR">D/R</option>
                                                                <option value="RF 20">Reefer 20 ft</option>
                                                                <option value="RF 40">Reefer 40 ft</option>
                                                                <option value="LO">Loose Cargo</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="date"
                                                                value={newContainer.unloaded_date || ''}
                                                                onChange={e => setNewContainer({ ...newContainer, unloaded_date: e.target.value })}
                                                                className="input-field w-full py-1 px-2 border rounded"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            <button onClick={handleSaveNewContainer} className="text-green-600 hover:bg-green-100 p-1 rounded mr-2"><Check className="w-4 h-4" /></button>
                                                            <button onClick={() => { setEditingContainerId(null); setNewContainer({ container_no: '', container_type: 'FCL 20', unloaded_date: '' }); }} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><X className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="py-3 px-4 font-bold text-gray-900">{c.container_no}</td>
                                                        <td className="py-3 px-4 text-gray-600">{c.container_type}</td>
                                                        <td className="py-3 px-4 text-gray-600">{c.unloaded_date ? new Date(c.unloaded_date).toLocaleDateString() : '-'}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setPopupJob(selectedJob);
                                                                        setPopupData({
                                                                            container_no: c.container_no,
                                                                            container_type: c.container_type,
                                                                            container_details: `${c.container_type} - ${c.container_no}`,
                                                                            // Fallback to job details if needed, but container specific is key
                                                                            packages: selectedJob.packages ? selectedJob.packages.map((p: any) => `${p.count} ${p.type}`).join(', ') : (selectedJob.no_of_pkgs || ''),
                                                                            transport_mode: selectedJob.transport_mode
                                                                        });
                                                                        setPopupType('schedule');
                                                                    }}
                                                                    className="text-gray-400 hover:text-orange-600 p-1.5 rounded hover:bg-orange-50"
                                                                    title="Schedule Clearance"
                                                                >
                                                                    <Calendar className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingContainerId(c.id);
                                                                        setNewContainer({
                                                                            ...c,
                                                                            unloaded_date: c.unloaded_date ? new Date(c.unloaded_date).toISOString().split('T')[0] : ''
                                                                        });
                                                                        setAddingContainer(false);
                                                                    }}
                                                                    className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeleteContainerItem(c.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            !addingContainer && (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-gray-400 italic">No containers listed</td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </>)}

                    {activeTab === 'Documents' && renderDocumentsTab()}
                    {activeTab === 'Payments' && renderPaymentsTab()}
                    {activeTab === 'History' && renderHistoryTab()}

                </div>
            </div >
        );
    };

    const renderPaymentsTab = () => {
        const totalCompany = jobPayments.filter(p => p.paid_by === 'Company').reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalCustomer = jobPayments.filter(p => p.paid_by === 'Customer').reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const isJobCleared = selectedJob.status === 'Cleared' || (selectedJob.progress && parseInt(selectedJob.progress) === 100);

        return (
            <div className="p-8 font-sans">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Payments</h3>
                    {jobPayments.some((p: any) => p.status === 'Draft') && (
                        <div className="relative group/btn">
                            <button
                                onClick={handleSendToAccounts}
                                disabled={!isJobCleared}
                                className={`px-4 py-2 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2 ${isJobCleared
                                    ? 'bg-indigo-600 hover:bg-indigo-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isJobCleared && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-200 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-100"></span>
                                    </span>
                                )}
                                Send to Accounts ({jobPayments.filter((p: any) => p.status === 'Draft').length})
                            </button>
                            {!isJobCleared && (
                                <div className="absolute bottom-full mb-2 hidden group-hover/btn:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 text-center left-1/2 -translate-x-1/2">
                                    Delivery Note must be issued for all BLs to complete clearance before sending to accounts.
                                </div>
                            )}
                        </div>
                    )}
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
                                                {payment.status === 'Paid' ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                        Paid
                                                    </span>
                                                ) : payment.status === 'Approved' ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                        Approved
                                                    </span>
                                                ) : payment.status === 'Draft' ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                        Draft
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">

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

    const renderHistoryTab = () => {
        return (
            <div className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Activity</h3>
                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                    {historyLogs.map((log) => {
                        let Icon = FileText;
                        let colorClass = "text-gray-400 bg-gray-50";
                        // Mapping Action to Icons/Colors
                        if (log.action.includes('CREATE_SHIPMENT')) { Icon = FileText; colorClass = "text-green-600 bg-green-50"; }
                        else if (log.action.includes('DOC')) { Icon = UploadCloud; colorClass = "text-blue-600 bg-blue-50"; }
                        else if (log.action.includes('INVOICE')) { Icon = FileText; colorClass = "text-purple-600 bg-purple-50"; }
                        else if (log.action.includes('BL')) { Icon = FileSpreadsheet; colorClass = "text-indigo-600 bg-indigo-50"; }
                        else if (log.action.includes('CLEARANCE')) { Icon = Check; colorClass = "text-emerald-600 bg-emerald-50"; }
                        else if (log.action.includes('PAYMENT')) { Icon = CreditCard; colorClass = "text-amber-600 bg-amber-50"; }
                        else if (log.action.includes('COMPLETED')) { Icon = Check; colorClass = "text-green-600 bg-green-100"; }

                        return (
                            <div key={log.id} className="relative pl-8">
                                <span className={`absolute -left-[11px] top-0 p-1 rounded-full border border-white ring-2 ring-white ${colorClass}`}>
                                    <Icon className="w-3 h-3" />
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {formatAction(log.action)} <span className="font-normal text-gray-500">by {log.performed_by}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                                    {log.details && <p className="text-xs text-gray-500 mt-1">{log.details}</p>}
                                </div>
                            </div>
                        );
                    })}
                    {historyLogs.length === 0 && (
                        <p className="text-sm text-gray-400 pl-8">No activity recorded yet.</p>
                    )}
                </div>
            </div>
        );
    };

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };

    const handlePopupSave = async (data: any = {}) => {
        if (!popupJob) return;
        try {
            setLoading(true);

            if (popupType === 'schedule') {
                await clearanceAPI.create({
                    job_id: popupJob.id,
                    ...data // Use data passed from drawer
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
                                {popupType === 'payment' && <CreditCard className="w-6 h-6 text-emerald-600" />}
                                {popupType === 'upload' && <UploadCloud className="w-6 h-6 text-violet-600" />}
                                {popupType === 'payment' ? 'Payment Details' : 'Upload Document'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Job: {popupJob.id} - {popupJob.customer}</p>
                        </div>
                        <button onClick={() => { setPopupType(null); setPopupJob(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">

                        {popupType === 'payment' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type *</label>
                                    <SearchableSelect
                                        options={paymentTypesList.map((p: any) => ({ id: p.id, label: p.name, value: p.name }))}
                                        value={editFormData.payment_type || ''}
                                        onChange={(val) => {
                                            setEditFormData((prev: any) => {
                                                const updates: any = { payment_type: val };
                                                const selectedItem = paymentTypesList.find((p: any) => p.name === val);
                                                if (selectedItem?.vendor_id) {
                                                    const assignedVendor = vendorsList.find((v: any) => v.id === selectedItem.vendor_id);
                                                    if (assignedVendor) {
                                                        updates.vendor = assignedVendor.name;
                                                    }
                                                }
                                                return { ...prev, ...updates };
                                            });
                                        }}
                                        placeholder="Select Payment Type"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor *</label>
                                    <SearchableSelect
                                        options={vendorsList.map((v: any) => ({ id: v.id, label: v.name, value: v.name }))}
                                        value={editFormData.vendor || ''}
                                        onChange={(val) => setEditFormData((prev: any) => ({ ...prev, vendor: val }))}
                                        placeholder="Select Vendor"
                                        required
                                    />
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
                    onClose={() => { setPopupType(null); setPopupJob(null); setPopupData(null); }}
                    onSave={handlePopupSave}
                    job={popupJob}
                    initialData={popupData}
                    title="Schedule Clearance"
                />
            )}


            {renderPopup()}

            <ShipmentInvoiceDrawer
                isOpen={isInvoiceDrawerOpen}
                onClose={() => setIsInvoiceDrawerOpen(false)}
                onSave={handleInvoiceDrawerSave}
                initialData={selectedJob}
            />
            <BLDrawer
                isOpen={isBLDrawerOpen}
                onClose={() => { setIsBLDrawerOpen(false); setNewBL({ master_bl: '', house_bl: '', loading_port: '', vessel: '', etd: '', eta: '', delivery_agent: '' }); }}
                onSave={handleBLDrawerSave}
                initialData={{
                    ...newBL,
                    // If packages col has container structure, map to containers prop
                    containers: (newBL.packages && newBL.packages.length > 0 && newBL.packages[0].container_no)
                        ? newBL.packages
                        : [],
                    // If packages col has flat structure, map to packages prop. Else fallback to Job packages
                    packages: (newBL.packages && newBL.packages.length > 0 && !newBL.packages[0].container_no)
                        ? newBL.packages
                        : (selectedJob?.packages?.map((p: any) => ({
                            pkg_count: p.count,
                            pkg_type: p.type,
                            cbm: p.cbm
                        })) || [])
                }}
                deliveryAgents={deliveryAgentsList}
                job={selectedJob}
            />
        </Layout>
    );
};

export default ShipmentRegistry;
