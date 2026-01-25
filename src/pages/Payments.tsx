import React, { useState, useEffect } from 'react';
import { Search, X, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import { paymentsAPI } from '../services/api';
import PaymentDetailsDrawer from '../components/PaymentDetailsDrawer';

const Payments = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [page, setPage] = useState(1);
    const limit = 50;

    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Batch Selection State
    const [selectedPayments, setSelectedPayments] = useState<any[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

    useEffect(() => {
        fetchPayments();
    }, [page, limit, searchTerm, activeTab]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'pending' ? 'Pending' : 'Paid';
            const response = await paymentsAPI.getListing({
                search: searchTerm,
                page,
                limit,
                status: statusFilter
            });
            setPayments(response.data.data);
            // Clear selection on refresh/tab switch to avoid inconsistencies
            setSelectedPayments([]);
            setSelectedVendor(null);
        } catch (error) {
            console.error('Failed to fetch payments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this payment?')) return;
        try {
            await paymentsAPI.updateStatus(id, 'Paid');
            fetchPayments();
        } catch (error) {
            console.error('Failed to approve payment', error);
            alert('Failed to approve payment');
        }
    };

    const handleToggleSelect = (e: React.MouseEvent | React.ChangeEvent, payment: any) => {
        e.stopPropagation();

        const isSelected = selectedPayments.some(p => p.id === payment.id);

        if (isSelected) {
            // Deselect
            const updated = selectedPayments.filter(p => p.id !== payment.id);
            setSelectedPayments(updated);
            if (updated.length === 0) {
                setSelectedVendor(null);
            }
        } else {
            // Select
            if (selectedPayments.length === 0) {
                setSelectedPayments([payment]);
                setSelectedVendor(payment.vendor);
            } else {
                // Check Vendor
                if (payment.vendor !== selectedVendor) {
                    alert('Only payments from the same vendor can be settled at a time.');
                    return;
                }
                setSelectedPayments([...selectedPayments, payment]);
            }
        }
    };

    const handleRemoveFromBucket = (id: string) => {
        const updated = selectedPayments.filter(p => p.id !== id);
        setSelectedPayments(updated);
        if (updated.length === 0) {
            setSelectedVendor(null);
        }
    };

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-MV', { style: 'currency', currency: 'MVR' }).format(Number(amount));
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const handleRowClick = (payment: any) => {
        setSelectedPayment(payment);
        setIsDrawerOpen(true);
    };

    const totalPayable = selectedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return (
        <Layout>
            <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden relative">
                {/* Header */}
                <div className="px-8 pt-8 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900">Payment Request</h1>

                    {/* Tabs */}
                    <div className="flex gap-8 mt-6 border-b border-gray-200">
                        <button
                            onClick={() => { setActiveTab('pending'); setPage(1); }}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'pending'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Pending Approvals
                        </button>
                        <button
                            onClick={() => { setActiveTab('history'); setPage(1); }}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'history'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Payments
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar relative">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold text-gray-500 border-b border-gray-100">
                                {activeTab === 'pending' ? (
                                    <>
                                        <th className="pb-3 px-2 w-[4%]"></th>
                                        <th className="pb-3 px-2 w-[10%]">Job</th>
                                        <th className="pb-3 px-2 w-[30%]">Pay to</th>
                                        <th className="pb-3 px-2 w-[20%]">Requested By</th>
                                        <th className="pb-3 px-2 w-[15%] text-right">Amount (MVR)</th>
                                        <th className="pb-3 px-2 w-[10%]">Action</th>
                                    </>
                                ) : (
                                    // Payments Tab Headers
                                    <>
                                        <th className="pb-3 px-2">Voucher#</th>
                                        <th className="pb-3 px-2">Vendor</th>
                                        <th className="pb-3 px-2">Payment Reference</th>
                                        <th className="pb-3 px-2">Payment Date</th>
                                        <th className="pb-3 px-2">Paid By</th>
                                        <th className="pb-3 px-2 text-right">Total Amount</th>
                                        <th className="pb-3 px-2 w-[5%]"></th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-gray-500">No records found.</td>
                                </tr>
                            ) : (
                                payments.map((item, index) => {
                                    const isSelected = selectedPayments.some(p => p.id === item.id);
                                    // Highlight if selected or if part of the same vendor group (optional UX, keeping simple for now)
                                    const isSameVendor = selectedVendor && item.vendor === selectedVendor;
                                    const bgClass = isSelected ? 'bg-indigo-50 hover:bg-indigo-100' :
                                        (selectedVendor && !isSameVendor && activeTab === 'pending') ? 'opacity-50 hover:bg-white' :
                                            (isSameVendor && activeTab === 'pending') ? 'bg-green-50/50 hover:bg-green-50' :
                                                'hover:bg-gray-50';

                                    return (
                                        <tr
                                            key={index}
                                            className={`group transition-colors cursor-pointer ${bgClass}`}
                                            onClick={() => handleRowClick(item)}
                                        >
                                            {activeTab === 'pending' ? (
                                                <>
                                                    <td className="py-4 px-2 align-top" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            checked={isSelected}
                                                            onChange={(e) => handleToggleSelect(e, item)}
                                                        />
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <span className="text-sm text-gray-600">{item.job_id}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900">{item.payment_type}</span>
                                                            <span className="text-xs text-gray-500 uppercase">{item.vendor}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                                                                {item.requested_by_name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-sm text-gray-600">{item.requested_by_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2 align-top text-right">
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                                                            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Payments Row */}
                                                    <td className="py-4 px-2 align-top">
                                                        <span className="text-sm font-bold text-blue-900">VC.{new Date(item.created_at).getFullYear()}.{String(item.id).padStart(4, '0')}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <span className="text-sm text-gray-900">{item.vendor}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <span className="text-sm text-gray-600">{item.bill_ref_no || '-'}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <span className="text-sm text-gray-600">
                                                            {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top">
                                                        <span className="text-sm text-gray-600">{item.paid_by || 'Admin'}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top text-right">
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                                                    </td>
                                                    <td className="py-4 px-2 align-top text-right">
                                                        <button className="text-gray-400 hover:text-gray-600">
                                                            <span className="text-lg leading-none">...</span>
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Payment Bucket - Floating Panel */}
                {selectedPayments.length > 0 && (
                    <div className="absolute top-4 right-4 bottom-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-20 animate-slide-in-right">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="font-bold text-gray-900">Payment Bucket</h3>
                                <p className="text-xs text-gray-500">{selectedPayments.length} items selected</p>
                            </div>
                            <button
                                onClick={() => { setSelectedPayments([]); setSelectedVendor(null); }}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {selectedPayments.map(p => (
                                <div key={p.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm group relative">
                                    <div className="flex gap-3">
                                        <div className="mt-1">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-medium text-gray-500">{p.job_id}</span>
                                                <span className="text-xs font-bold text-gray-900">{formatCurrency(p.amount)}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800 mt-1">{p.payment_type}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{p.vendor}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveFromBucket(p.id)}
                                        className="absolute -top-2 -right-2 bg-white border border-gray-200 shadow-sm rounded-full p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-medium text-gray-600">Total Payable</span>
                                <span className="text-xl font-bold text-gray-900">{formatCurrency(totalPayable)}</span>
                            </div>
                            <button
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-200"
                                onClick={() => alert('Proceed to Payment Gateway / Voucher Creation (Coming Soon)')}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                <PaymentDetailsDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    payment={selectedPayment}
                />
            </div>
        </Layout>
    );
};

export default Payments;
