
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Search, X, Edit2, FileUp } from 'lucide-react';
import { paymentItemsAPI, vendorsAPI } from '../../services/api';

const PaymentItemsSettings: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [importing, setImporting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        vendor_id: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [itemsRes, vendorsRes] = await Promise.all([
                paymentItemsAPI.getAll(),
                vendorsAPI.getAll()
            ]);
            setItems(itemsRes.data);
            setVendors(vendorsRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchPaymentItems = async () => {
        try {
            const res = await paymentItemsAPI.getAll();
            setItems(res.data);
        } catch (error) {
            console.error('Failed to fetch payment items', error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                vendor_id: formData.vendor_id ? formData.vendor_id : null // Handle 'unassigned' logic if empty
            };

            if (editingId) {
                await paymentItemsAPI.update(editingId, payload);
            } else {
                await paymentItemsAPI.create(payload);
            }
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', vendor_id: '' });
            fetchPaymentItems();
        } catch (error) {
            console.error('Failed to save payment item', error);
            alert('Failed to save payment item');
        }
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setFormData({
            name: item.name || '',
            vendor_id: item.vendor_id || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this payment item?')) return;
        try {
            await paymentItemsAPI.delete(id);
            fetchPaymentItems();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', vendor_id: '' });
    };

    const filteredItems = items.filter(item =>
        item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getVendorName = (vendorId: string | number) => {
        if (!vendorId) return 'Unassigned';
        const vendor = vendors.find(v => v.id == vendorId); // loose comparison for string/number id differences
        return vendor ? vendor.name : 'Unassigned';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            setImporting(true);
            const res = await paymentItemsAPI.import(formData);
            alert(res.data.message || 'Import successful');
            if (res.data.errors) {
                console.warn('Import warnings:', res.data.errors);
                alert(`Import completed with errors:\n${res.data.errors.join('\n')}`);
            }
            fetchPaymentItems();
        } catch (error: any) {
            console.error('Import failed', error);
            alert('Import failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setImporting(false);
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            <div className="px-8 py-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payment Items</h1>
                    <p className="text-gray-500 mt-1">Manage payment types and default vendors</p>
                </div>
            </div>

            <div className="px-8 mb-6 flex justify-between items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search payment items..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-black/5"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                </div>
                <div className="flex gap-3">
                    <label className={`px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50 cursor-wait' : ''}`}>
                        <FileUp className="w-4 h-4" />
                        {importing ? 'Importing...' : 'Import Excel'}
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={importing} />
                    </label>
                    <button
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to DELETE ALL payment items? This action cannot be undone.')) {
                                try {
                                    await paymentItemsAPI.deleteAll();
                                    fetchPaymentItems();
                                    alert('All payment items deleted successfully');
                                } catch (error) {
                                    console.error('Failed to delete all', error);
                                    alert('Failed to delete all items');
                                }
                            }
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-lg shadow-sm hover:bg-red-100 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete All
                    </button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', vendor_id: '' });
                            setShowModal(true);
                        }}
                        className="px-4 py-2 bg-[#FCD34D] text-black font-semibold rounded-lg shadow-sm hover:bg-[#FBBF24] transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Manually
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading items...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <CreditCard className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No payment items found</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Get started by adding a new payment item.
                        </p>
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-semibold">Payment Item Name</th>
                                    <th className="py-3 px-4 font-semibold">Vendor</th>
                                    <th className="py-3 px-4 font-semibold w-24 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors text-sm">
                                        <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                                        <td className="py-3 px-4 text-gray-600">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.vendor_id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {getVendorName(item.vendor_id)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-gray-300 hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-gray-300 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Payment Item</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 pt-2">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                        value={formData.vendor_id}
                                        onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                                    >
                                        <option value="">Select a vendor</option>
                                        {vendors.map(vendor => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.name} {vendor.company_name ? `(${vendor.company_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Item Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Advance 2400"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-full transition-colors border border-gray-200 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-[#0284c7] text-white font-medium rounded-full hover:bg-[#0369a1] transition-colors shadow-sm text-sm"
                                >
                                    {editingId ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentItemsSettings;
