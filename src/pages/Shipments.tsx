import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    Package,
    Search,
    Filter,
    MapPin,
    CheckCircle,
    Clock,
    AlertCircle,
    Eye,
    Loader2,
    Trash,
    Upload
} from 'lucide-react';

const Shipments: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [shipmentToDelete, setShipmentToDelete] = useState<any>(null);


    const handleDeleteClick = (shipment: any) => {
        setShipmentToDelete(shipment);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!shipmentToDelete) return;

        const itemToDelete = shipmentToDelete;
        // Optimistically remove from list
        setShipments(prev => prev.filter(s => s.id !== itemToDelete.id));
        setDeleteModalOpen(false);
        setShipmentToDelete(null);

        try {
            await shipmentsAPI.delete(itemToDelete.id);
            // Success - no further action needed as item is already removed from UI
        } catch (error) {
            console.error('Failed to delete shipment', error);
            alert('Failed to delete shipment. Please try again.');
            // Revert optimistic update
            setShipments(prev => [...prev, itemToDelete]);
        }
    };

    // Removed handleUndo as we are deleting immediately now



    useEffect(() => {
        const fetchShipments = async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const response = await shipmentsAPI.getAll({
                    search: searchTerm,
                    status: filterStatus
                });

                setShipments(response.data);
            } catch (error) {
                console.error('Error fetching shipments:', error);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        // Initial fetch and debounce search
        const timeoutId = setTimeout(() => {
            fetchShipments();
        }, 500);

        // Poll for updates every 5 seconds
        const intervalId = setInterval(() => {
            fetchShipments(true); // silent = true
        }, 5000);

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [searchTerm, filterStatus]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'In Transit':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Processing':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Delayed':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Delivered':
                return <CheckCircle className="w-4 h-4" />;
            case 'Delayed':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getProgressColor = (status: string) => {
        switch (status) {
            case 'Delivered':
                return 'bg-green-500';
            case 'In Transit':
                return 'bg-blue-500';
            case 'Processing':
                return 'bg-yellow-500';
            case 'Delayed':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Shipment Tracking</h1>
                        <p className="text-gray-600 mt-1">Monitor and manage all shipments</p>
                    </div>
                    <button
                        onClick={() => navigate('/shipments/new')}
                        className="btn-primary"
                    >
                        <Package className="w-5 h-5 inline mr-2" />
                        New Shipment
                    </button>
                    <label className="btn-secondary cursor-pointer relative">
                        {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"><Loader2 className="w-4 h-4 animate-spin text-primary-600" /></div>}
                        <span className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Import Excel
                        </span>
                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={async (e) => {
                            if (e.target.files?.[0]) {
                                const file = e.target.files[0];
                                const formData = new FormData();
                                formData.append('file', file);

                                try {
                                    setLoading(true);
                                    const res = await shipmentsAPI.import(formData);
                                    alert(`Import successful: ${res.data.success} added.`);
                                    // Refresh list
                                    const response = await shipmentsAPI.getAll({
                                        search: searchTerm,
                                        status: filterStatus
                                    });
                                    setShipments(response.data);
                                } catch (error) {
                                    console.error('Import failed', error);
                                    alert('Failed to import shipments. Please check the file format.');
                                } finally {
                                    setLoading(false);
                                    e.target.value = '';
                                }
                            }
                        }} />
                    </label>
                </div>

                {/* Filters */}
                <div className="glass-card p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by ID or customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input-field pl-10 pr-8 appearance-none cursor-pointer"
                            >
                                <option>All</option>
                                <option>New</option>
                                <option>Processing</option>
                                <option>In Transit</option>
                                <option>Delivered</option>
                                <option>Delayed</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Shipments Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {shipments.map((shipment, index) => (
                            <div key={shipment.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-slide-in" style={{ animationDelay: `${index * 0.01}s` }}>
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{shipment.id}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{shipment.customer}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(shipment.status)}`}>
                                        {getStatusIcon(shipment.status)}
                                        {shipment.status}
                                    </span>
                                </div>

                                {/* Route */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Origin</p>
                                            <p className="text-sm font-semibold text-gray-900">{shipment.origin}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-accent-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Destination</p>
                                            <p className="text-sm font-semibold text-gray-900">{shipment.destination}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Progress</span>
                                        <span className="text-xs font-bold text-gray-900">{shipment.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(shipment.status)}`}
                                            style={{ width: `${shipment.progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-xs text-gray-500">Weight</p>
                                        <p className="text-sm font-semibold text-gray-900">{shipment.weight}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Date</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(shipment.date).toLocaleDateString()}
                                        </p>
                                    </div>

                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/shipments/${shipment.id}`)}
                                        className="btn-secondary flex-1"
                                    >
                                        <Eye className="w-4 h-4 inline mr-2" />
                                        View Details
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(shipment);
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                                        title="Delete Shipment"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && shipments.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No shipments found</h3>
                        <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                    </div>
                )}
                {/* Delete Confirmation Modal */}
                {deleteModalOpen && shipmentToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete Shipment?</h3>
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete shipment <span className="font-mono font-bold text-gray-800">{shipmentToDelete.id}</span>?
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setDeleteModalOpen(false); setShipmentToDelete(null); }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-lg hover:shadow-red-200 transition-all flex items-center gap-2"
                                >
                                    <Trash className="w-4 h-4" />
                                    Delete Shipment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default Shipments;
