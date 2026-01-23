import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Layout from '../components/Layout';
import { paymentsAPI } from '../services/api';

const Payments = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchPayments();
    }, [page, limit, searchTerm]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await paymentsAPI.getListing({ search: searchTerm, page, limit });
            setPayments(response.data.data);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Failed to fetch payments', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-MV', { style: 'currency', currency: 'MVR' }).format(Number(amount));
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    return (
        <Layout>
            <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500 mt-1">Manage and track all payment requests.</p>
                </div>

                {/* Controls */}
                <div className="px-8 mb-6 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 w-full relative">
                            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                                SEARCH PAYMENTS
                            </label>
                            <div className="relative">
                                <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Job ID, Vendor, Type or Reference"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>

                        {/* Records Per Page */}
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                                RECORDS PER PAGE
                            </label>
                            <select
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 min-w-[120px]"
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                            >
                                <option value={10}>10 records</option>
                                <option value={20}>20 records</option>
                                <option value={50}>50 records</option>
                                <option value={100}>100 records</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-400">
                            Showing {payments.length > 0 ? 1 : 0} - {payments.length} of {total} payments
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={payments.length < limit}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-white text-xs font-semibold tracking-wider">
                                    <th className="py-4 px-6">Date</th>
                                    <th className="py-4 px-6">Job ID</th>
                                    <th className="py-4 px-6">Payment Type</th>
                                    <th className="py-4 px-6">Vendor</th>
                                    <th className="py-4 px-6">Amount</th>
                                    <th className="py-4 px-6">Bill Ref</th>
                                    <th className="py-4 px-6">Paid By</th>
                                    <th className="py-4 px-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-gray-500">Loading payments...</td>
                                    </tr>
                                ) : payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-gray-500">No payments found.</td>
                                    </tr>
                                ) : (
                                    payments.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-sm text-gray-600">{formatDate(item.created_at)}</td>
                                            <td className="py-4 px-6 text-sm font-bold text-gray-900">{item.job_id}</td>
                                            <td className="py-4 px-6 text-sm text-gray-900 font-medium">{item.payment_type}</td>
                                            <td className="py-4 px-6 text-sm text-gray-600">{item.vendor}</td>
                                            <td className="py-4 px-6 text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                                            <td className="py-4 px-6 text-sm text-gray-600">{item.bill_ref_no || '-'}</td>
                                            <td className="py-4 px-6 text-sm text-gray-600">{item.paid_by}</td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${item.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Payments;
