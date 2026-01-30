import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { analyticsAPI, shipmentsAPI, notificationsAPI } from '../services/api';
import {

    Clock,

    CheckCircle,
    AlertCircle,
    Loader2,
    Users,
    ScrollText,
    User,
    Bell,
    UserSearch,
    CreditCard,
    Calendar,
    FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    // const [originalData, setOriginalData] = useState<any>(null);
    const [viewingAll, setViewingAll] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await analyticsAPI.getDashboard();
                setData(response.data);
                // setOriginalData(response.data);

                const notifResponse = await notificationsAPI.getAll();
                setNotifications(notifResponse.data);
                setUnreadCount(notifResponse.data.filter((n: any) => !n.is_read).length);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewToggle = async () => {
        setLoading(true);
        try {
            // Always fetch fresh data to ensure we have the latest
            const response = await shipmentsAPI.getAll();
            let allShipments = response.data || [];

            // Normalize fields
            const normalized = allShipments.map((s: any) => ({
                id: s.id,
                customer: s.customer || s.receiver_name || s.sender_name,
                destination: s.destination || s.receiver_address || 'N/A',
                status: s.status || 'Processing',
                date: s.created_at || s.date // Ensure we pick the right date field
            }));

            // Sort by date descending (newest first)
            normalized.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // If currently viewing all, switch to view less (10) using the FRESH data
            if (viewingAll) {
                setData((prev: any) => ({ ...prev, recentShipments: normalized.slice(0, 10) }));
                setViewingAll(false);
            } else {
                // Switch to view all
                setData((prev: any) => ({ ...prev, recentShipments: normalized }));
                setViewingAll(true);
            }

        } catch (error) {
            console.error('Failed to update shipment view', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </Layout>
        );
    }



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
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-15 h-15 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md flex-shrink-0">
                            {user?.photo_url ? (
                                <img
                                    src={user.photo_url.startsWith('http') ? user.photo_url : `${import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001'}${user.photo_url}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white text-lg font-bold">
                                    {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-6 h-6 text-white" />}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-600 mt-1">Welcome back <span className="font-semibold text-indigo-600">{user?.username}</span>! Here's what's happening today.</p>
                        </div>
                    </div>
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all relative group"
                        >
                            <Bell className={`w-6 h-6 transition-colors ${showNotifications ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-gray-50"></span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await notificationsAPI.markAllRead();
                                                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                                                setUnreadCount(0);
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-700"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                            <p className="text-sm">No notifications</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {notifications.map((notif: any) => (
                                                <div
                                                    key={notif.id}
                                                    className={`p-4 hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                                            <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="text-xs text-gray-400">
                                                                    {new Date(notif.created_at).toLocaleDateString()}
                                                                </span>
                                                                {notif.link && (
                                                                    <Link to={notif.link} className="text-xs text-indigo-600 hover:underline">
                                                                        View Details
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
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
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.overdueClearances || 0}</p>
                                <p className="text-xs text-red-500 mt-1 font-semibold">Requires attention</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-blue-500">
                                <p className="text-sm text-gray-500 font-medium">Scheduled Today</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.scheduledToday || 0}</p>
                                <p className="text-xs text-blue-500 mt-1">Created within 24h</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-orange-500">
                                <p className="text-sm text-gray-500 font-medium">Awaiting Delivery Notes</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.awaitingDeliveryNotes || 0}</p>
                                <p className="text-xs text-orange-500 mt-1">Pending documentation</p>
                            </div>
                            <div className="glass-card p-6 border-l-4 border-green-500">
                                <p className="text-sm text-gray-500 font-medium">Documents Received</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.teamSnapshot?.documentsReceived || 0}</p>
                                <p className="text-xs text-green-500 mt-1">Shared today</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(['Administrator', 'All', 'Accountant', 'Clearance'].includes(user?.role || '') && (
                                <Link to="/registry" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ScrollText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Shipment Registry</h3>
                                    <p className="text-xs text-gray-500 mt-1">Manage shipments and jobs</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All', 'Clearance'].includes(user?.role || '') && (
                                <Link to="/schedule" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Clearance Schedule</h3>
                                    <p className="text-xs text-gray-500 mt-1">Track clearance timelines</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All', 'Accountant', 'Clearance'].includes(user?.role || '') && (
                                <Link to="/delivery-notes" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Delivery Notes</h3>
                                    <p className="text-xs text-gray-500 mt-1">Approve documentation</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All', 'Accountant'].includes(user?.role || '') && (
                                <Link to="/payments" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Payments</h3>
                                    <p className="text-xs text-gray-500 mt-1">Track financial records</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All'].includes(user?.role || '') && (
                                <Link to="/users" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">User Management</h3>
                                    <p className="text-xs text-gray-500 mt-1">Manage system users</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All'].includes(user?.role || '') && (
                                <Link to="/reports" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Reports</h3>
                                    <p className="text-xs text-gray-500 mt-1">View business analytics</p>
                                </Link>
                            ))}

                            {(['Administrator', 'All'].includes(user?.role || '') && (
                                <Link to="/logs" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                        <ScrollText className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Audit Logs</h3>
                                    <p className="text-xs text-gray-500 mt-1">Monitor system activity</p>
                                </Link>
                            ))}

                            <Link to="/settings" className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <UserSearch className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-900">Information Updates</h3>
                                <p className="text-xs text-gray-500 mt-1">Manage Information</p>
                            </Link>
                        </div>
                    </div>
                </div>






                {/* Recent Shipments */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Shipments</h3>
                        <button
                            onClick={handleViewToggle}
                            className="btn-secondary text-sm"
                        >
                            {viewingAll ? 'View Less' : 'View All'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Shipment ID</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>

                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date & Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.recentShipments?.map((shipment: any, index: number) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-100 hover:bg-primary-50/50 transition-colors cursor-pointer"
                                        onClick={() => navigate('/registry', { state: { selectedJobId: shipment.id } })}
                                    >
                                        <td className="py-4 px-4">
                                            <span className="font-mono text-sm font-semibold text-primary-700">{shipment.id}</span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-900">{shipment.customer}</td>

                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(shipment.status)}`}>
                                                {getStatusIcon(shipment.status)}
                                                {shipment.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {new Date(shipment.created_at || shipment.date).toLocaleString(undefined, {
                                                year: 'numeric',
                                                month: 'numeric',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
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
