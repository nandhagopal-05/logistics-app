
import React, { useState, useEffect } from 'react';
import { Briefcase, FileUp, Plus, Trash2, Search, X, Edit2 } from 'lucide-react';
import { vendorsAPI } from '../../services/api';

const VendorsSettings: React.FC = () => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        region: '',
        country: '',
        postal_code: '',
        bank_name: '',
        account_number: ''
    });

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const response = await vendorsAPI.getAll();
            setVendors(response.data);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await vendorsAPI.update(editingId, formData);
            } else {
                await vendorsAPI.create(formData);
            }
            setShowAddModal(false);
            setEditingId(null);
            setFormData({
                name: '', email: '', phone: '', address: '',
                city: '', region: '', country: '', postal_code: '',
                bank_name: '', account_number: ''
            });
            fetchVendors();
        } catch (error) {
            console.error('Failed to save vendor', error);
            alert('Failed to save vendor');
        }
    };

    const handleEdit = (vendor: any) => {
        setEditingId(vendor.id);
        setFormData({
            name: vendor.name || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            city: vendor.city || '',
            region: vendor.region || '',
            country: vendor.country || '',
            postal_code: vendor.postal_code || '',
            bank_name: vendor.bank_name || '',
            account_number: vendor.account_number || ''
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({
            name: '', email: '', phone: '', address: '',
            city: '', region: '', country: '', postal_code: '',
            bank_name: '', account_number: ''
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            setImporting(true);
            const res = await vendorsAPI.import(formData);
            alert(res.data.message || 'Import successful');
            if (res.data.errors) {
                console.warn('Import warnings:', res.data.errors);
                alert(`Import completed with errors:\n${res.data.errors.join('\n')}`);
            }
            fetchVendors();
        } catch (error: any) {
            console.error('Import failed', error);
            alert('Import failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setImporting(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await vendorsAPI.delete(id);
            fetchVendors();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const filteredVendors = vendors.filter(v =>
        (v.name && v.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            <div className="px-8 py-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
                    <p className="text-gray-500 mt-1">Manage your vendors and suppliers</p>
                </div>
            </div>

            <div className="px-8 mb-6 flex justify-between items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
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
                            if (window.confirm('Are you sure you want to DELETE ALL vendors? This action cannot be undone.')) {
                                try {
                                    await vendorsAPI.deleteAll();
                                    fetchVendors();
                                    alert('All vendors deleted successfully');
                                } catch (error) {
                                    console.error('Failed to delete all', error);
                                    alert('Failed to delete all vendors');
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
                            setFormData({
                                name: '', email: '', phone: '', address: '',
                                city: '', region: '', country: '', postal_code: '',
                                bank_name: '', account_number: ''
                            });
                            setShowAddModal(true);
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
                    <div className="text-center py-10 text-gray-500">Loading vendors...</div>
                ) : filteredVendors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Briefcase className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No vendors found</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            {(searchTerm) ? 'Try adjusting your search terms.' : 'Get started by importing an Excel sheet or adding vendors manually.'}
                        </p>
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-semibold">Vendor Name</th>
                                    <th className="py-3 px-4 font-semibold">Email</th>
                                    <th className="py-3 px-4 font-semibold">Phone</th>
                                    <th className="py-3 px-4 font-semibold">Address</th>
                                    <th className="py-3 px-4 font-semibold">Bank Name</th>
                                    <th className="py-3 px-4 font-semibold">Account No.</th>
                                    <th className="py-3 px-4 font-semibold w-24 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredVendors.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group text-sm">
                                        <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                                        <td className="py-3 px-4 text-gray-600">{item.email || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono">{item.phone || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate">
                                            {[item.address, item.city, item.country].filter(Boolean).join(', ')}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{item.bank_name || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">{item.account_number || '-'}</td>
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

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-gray-900">{editingId ? 'Edit Vendor' : 'New Vendor'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Company or Individual Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Address Details</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Building, Street, etc."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Region / State</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.region}
                                                onChange={e => setFormData({ ...formData, region: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.country}
                                                onChange={e => setFormData({ ...formData, country: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                                value={formData.postal_code}
                                                onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Bank Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                            value={formData.bank_name}
                                            onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                            value={formData.account_number}
                                            onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    {editingId ? 'Save Changes' : 'Create Vendor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorsSettings;
