import React, { useState } from 'react';
import Layout from '../components/Layout';
import {
    Search,
    Users, Truck, Briefcase, CreditCard,
    Shield, Zap, FileUp, Plus
} from 'lucide-react';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Consignees');
    const [searchTerm, setSearchTerm] = useState('');

    const menuItems = [
        { id: 'Consignees', label: 'Consignees', icon: Users },
        { id: 'Customers', label: 'Customers', icon: Users },
        { id: 'Exporters', label: 'Exporters', icon: Briefcase },
        { id: 'Vehicles', label: 'Vehicles', icon: Truck },
        { id: 'Delivery Agents', label: 'Delivery Agents', icon: Users },
        { id: 'Users', label: 'Users', icon: Shield },
        { id: 'Vendors', label: 'Vendors', icon: Briefcase },
        { id: 'Payment Items', label: 'Payment Items', icon: CreditCard },
        { id: 'Integrations', label: 'Integrations', icon: Zap },
    ];

    // Mock Data for Consignees - Cleared as per requirement
    const consignees: any[] = [];

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
        <Layout>
            <div className="flex h-[calc(100vh-100px)] animate-fade-in overflow-hidden">
                {/* Left Sidebar - Settings Menu */}
                <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 px-3">Settings</h2>
                        <nav className="space-y-1">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                                        ? 'bg-black text-white'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {/* <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} /> */}
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                    {/* Header */}
                    <div className="px-8 py-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{activeTab}</h1>
                            <p className="text-gray-500 mt-1">Manage your consignee directory</p>
                        </div>
                        <button className="px-4 py-2 bg-[#FCD34D] text-black font-semibold rounded-lg shadow-sm hover:bg-[#FBBF24] transition-colors flex items-center gap-2 text-sm">
                            Create Consignee
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="px-8 mb-6">
                        <div className="p-1 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-between gap-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, consignee number, email or phone"
                                    className="w-full pl-10 pr-4 py-2.5 outline-none text-sm text-gray-700 placeholder:text-gray-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="hidden xl:flex items-center gap-1 pr-2">
                                <span className="text-xs font-bold text-gray-400 mr-2 tracking-wide">FILTER BY INITIAL</span>
                                {alphabet.map((letter) => (
                                    <button
                                        key={letter}
                                        className="w-6 h-6 flex items-center justify-center text-[10px] font-medium text-gray-500 rounded hover:bg-gray-100 transition-colors"
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                        <div className="flex justify-end gap-3 mb-4">
                            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
                                <FileUp className="w-4 h-4" />
                                Import Excel
                            </button>
                            <button className="px-4 py-2 bg-[#FCD34D] text-black font-semibold rounded-lg shadow-sm hover:bg-[#FBBF24] transition-colors flex items-center gap-2 text-sm">
                                <Plus className="w-4 h-4" />
                                Add Manually
                            </button>
                        </div>

                        {consignees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Users className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No consignees found</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                                    Get started by importing an Excel sheet or adding consignees manually.
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 mb-2">Showing {consignees.length} of {consignees.length} consignees</p>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black text-white text-xs uppercase tracking-wider">
                                                <th className="py-3 px-4 font-semibold w-1/3">Name</th>
                                                <th className="py-3 px-4 font-semibold">Consignee #</th>
                                                <th className="py-3 px-4 font-semibold">Email</th>
                                                <th className="py-3 px-4 font-semibold">Phone</th>
                                                <th className="py-3 px-4 font-semibold w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {consignees.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50 transition-colors group text-sm">
                                                    <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                                                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{item.id}</td>
                                                    <td className="py-3 px-4 text-gray-600">{item.email}</td>
                                                    <td className="py-3 px-4 text-gray-600 font-mono">{item.phone}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button className="text-gray-300 hover:text-gray-600">
                                                            <div className="w-6 h-6 border border-gray-200 rounded-full flex items-center justify-center">
                                                                <span className="text-[10px]">{item.name.charAt(0)}</span>
                                                            </div>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(229, 231, 235, 0.5);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(209, 213, 219, 0.8);
                }
            `}</style>
        </Layout>
    );
};

export default Settings;
