import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { analyticsAPI } from '../services/api';
import {
    Package,
    Truck,
    TrendingUp,
    Clock,

    CheckCircle,
    AlertCircle,
    ArrowUpRight,
    Loader2,
    Users,
    ScrollText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await analyticsAPI.getDashboard();
                setData(response.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </Layout>
        );
    }

    const stats = [
        {
            label: 'Total Shipments',
            value: data?.stats.totalShipments || '0',
            change: '+12.5%',
            icon: Package,
            color: 'from-blue-600 to-blue-400',
            bgColor: 'bg-blue-50'
        },
        {
            label: 'Active Deliveries',
            value: data?.stats.activeDeliveries || '0',
            change: '+8.2%',
            icon: Truck,
            color: 'from-green-600 to-green-400',
            bgColor: 'bg-green-50'
        },

        {
            label: 'On-Time Rate',
            value: `${data?.stats.onTimeRate}%` || '0%',
            change: '+3.1%',
            icon: TrendingUp,
            color: 'from-orange-600 to-orange-400',
            bgColor: 'bg-orange-50'
        },
    ];

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

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
                </div>

                {/* Stats Grid */}
                {user?.role === 'Clearance Agent' ? (
                    /* Clearance Agent Dashboard View */
                    <div className="space-y-8">
                        {/* Team Snapshot */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Team Snapshot</h2>
                                <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="glass-card p-6 border-l-4 border-red-500">
                                    <p className="text-sm text-gray-500 font-medium">Overdue Clearances</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    <p className="text-xs text-red-500 mt-1 font-semibold">Requires attention</p>
                                </div>
                                <div className="glass-card p-6 border-l-4 border-blue-500">
                                    <p className="text-sm text-gray-500 font-medium">Scheduled Today</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    <p className="text-xs text-blue-500 mt-1">Due within 24h</p>
                                </div>
                                <div className="glass-card p-6 border-l-4 border-orange-500">
                                    <p className="text-sm text-gray-500 font-medium">Awaiting Delivery Notes</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    <p className="text-xs text-orange-500 mt-1">Pending documentation</p>
                                </div>
                                <div className="glass-card p-6 border-l-4 border-green-500">
                                    <p className="text-sm text-gray-500 font-medium">Documents Received</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                                    <p className="text-xs text-green-500 mt-1">Shared today</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Link to="/registry" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ScrollText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Clearance Board</h3>
                                    <p className="text-xs text-gray-500 mt-1">Assign teams & reschedule</p>
                                </Link>
                                <div className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Delivery Notes</h3>
                                    <p className="text-xs text-gray-500 mt-1">Approve documentation</p>
                                </div>
                                <div className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Container Tracking</h3>
                                    <p className="text-xs text-gray-500 mt-1">Monitor port status</p>
                                </div>
                                <div className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Client Updates</h3>
                                    <p className="text-xs text-gray-500 mt-1">Send status pings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Default Dashboard for Admin/Other */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-card animate-slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                        <div className="flex items-center gap-1 mt-2">
                                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-green-600 font-semibold">{stat.change}</span>
                                            <span className="text-sm text-gray-500">vs last month</span>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Admin Management Section */}
                {user?.role === 'Administrator' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link to="/users" className="glass-card p-6 flex items-center justify-between hover:shadow-xl transition-all cursor-pointer group">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">User Management</h3>
                                <p className="text-sm text-gray-600">Create, edit, and manage system users</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                <Users className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                            </div>
                        </Link>
                        <Link to="/logs" className="glass-card p-6 flex items-center justify-between hover:shadow-xl transition-all cursor-pointer group">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Audit Logs</h3>
                                <p className="text-sm text-gray-600">View system activities and security logs</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                                <ScrollText className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
                            </div>
                        </Link>
                    </div>
                )}

                {/* Clearance Agent Actions */}
                {(user?.role === 'Clearance Agent' || user?.role === 'Administrator') && (
                    <div className="glass-card p-6 hover:shadow-xl transition-all cursor-pointer group mb-6">
                        <Link to="/shipments/new" className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Shipment</h3>
                                <p className="text-sm text-gray-600">Register a new shipment, upload documents, and assign details</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                                <Package className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
                            </div>
                        </Link>
                    </div>
                )}

                {/* Legacy Charts (Hide for Clearance Agent to reduce clutter or Keep? Prompt says "Team Insights" header present for future) */}
                {user?.role !== 'Clearance Agent' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Performance */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Performance</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data?.weeklyData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="day" stroke="#6b7280" />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(229, 231, 235, 0.5)'
                                        }}
                                    />
                                    <Line type="monotone" dataKey="shipments" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                                    <Line type="monotone" dataKey="deliveries" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Shipment Status Distribution */}

                    </div>
                )}

                {/* Recent Shipments */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Shipments</h3>
                        <button className="btn-secondary text-sm">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Shipment ID</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Destination</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.recentShipments?.map((shipment: any, index: number) => (
                                    <tr key={index} className="border-b border-gray-100 hover:bg-primary-50/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <span className="font-mono text-sm font-semibold text-primary-700">{shipment.id}</span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-900">{shipment.customer}</td>
                                        <td className="py-4 px-4 text-sm text-gray-600">{shipment.destination}</td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(shipment.status)}`}>
                                                {getStatusIcon(shipment.status)}
                                                {shipment.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {new Date(shipment.date).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
