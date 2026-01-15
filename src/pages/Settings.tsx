import React, { useState } from 'react';
import Layout from '../components/Layout';
import {
    Users, Briefcase, CreditCard,
    Zap
} from 'lucide-react';

import ConsigneesSettings from './settings/ConsigneesSettings';
import CustomersSettings from './settings/CustomersSettings';
import ExportersSettings from './settings/ExportersSettings';
import VehiclesSettings from './settings/VehiclesSettings';
import DeliveryAgentsSettings from './settings/DeliveryAgentsSettings';
import VendorsSettings from './settings/VendorsSettings';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Consignees');

    const menuItems = [
        { id: 'Consignees', label: 'Consignees', icon: Users },
        { id: 'Customers', label: 'Customers', icon: Users },
        { id: 'Exporters', label: 'Exporters', icon: Briefcase },
        { id: 'Vehicles', label: 'Vehicles', icon: Briefcase },
        { id: 'Delivery Agents', label: 'Delivery Agents', icon: Users },
        { id: 'Vendors', label: 'Vendors', icon: Briefcase },
        { id: 'Payment Items', label: 'Payment Items', icon: CreditCard },
        { id: 'Integrations', label: 'Integrations', icon: Zap },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Consignees':
                return <ConsigneesSettings />;
            case 'Customers':
                return <CustomersSettings />;
            case 'Exporters':
                return <ExportersSettings />;
            case 'Vehicles':
                return <VehiclesSettings />;
            case 'Delivery Agents':
                return <DeliveryAgentsSettings />;
            case 'Vendors':
                return <VendorsSettings />;
            // ... Add other cases as needed
            default:
                return (
                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{activeTab}</h2>
                        <p className="text-gray-500 mt-2">This module is under development.</p>
                    </div>
                );
        }
    };

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
                                        ? 'bg-black text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                {renderContent()}
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
            `}</style>
        </Layout>
    );
};

export default Settings;
