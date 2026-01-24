import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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

    useEffect(() => {
        fetchPayments();
    }, [page, limit, searchTerm, activeTab]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            // If tab is 'pending', we fetch pending status. 
            // If tab is 'history', we want everything else (Paid, Approved) or just 'Paid'.
            // For now, let's assume history means Paid/Approved. Or we can filter !Pending in backend.
            // But strict status filtering is easier: 'pending' vs 'Paid'.
            // Let's assume Approve action makes it 'Paid'.
            const statusFilter = activeTab === 'pending' ? 'Pending' : 'Paid';
            const response = await paymentsAPI.getListing({
                search: searchTerm,
                page,
                limit,
                status: statusFilter
            });
            setPayments(response.data.data);
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

    return (
        <Layout>
            <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden">
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
                        {activeTab === 'pending' && (
                            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled>
                                MAKE PAYMENT
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold text-gray-500 border-b border-gray-100">
                                {activeTab === 'pending' ? (
                                    <>
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
                                payments.map((item, index) => (
                                    <tr
                                        key={index}
                                        className="group hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => handleRowClick(item)}
                                    >
                                        {activeTab === 'pending' ? (
                                            <>
                                                {/* Pending Row */}
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

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
