import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    X,
    Users,
    ScrollText,
    FileText,
    Calendar,
    UserCircle,
    Settings,

    ClipboardList,
    CreditCard,
    LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import seaflowLogo from '../assets/seaflow-logo.jpg';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    const userRole = user?.role || '';

    // Role definitions matches the new simple roles: Admin, Accountant, Clearance, All
    const hasFullAccess = ['Administrator', 'All'].includes(userRole);
    const isClearanceMember = ['Clearance'].includes(userRole);
    const isAccountantMember = ['Accountant'].includes(userRole);

    // Computed Permissions
    const showRegistry = hasFullAccess || isClearanceMember || isAccountantMember; // Everyone needs registry? Previously isClearance included Accountant. 
    // Accountants need registry to click Payment icons usually.

    const showClearanceSchedule = hasFullAccess || isClearanceMember; // NOT Accountant

    const showDeliveryNotes = hasFullAccess || isClearanceMember || isAccountantMember; // Keeping previous behavior (Accountant had access via isClearance)

    const showPayments = hasFullAccess || isAccountantMember;

    // Admin Only
    const showAdminToolsExpanded = hasFullAccess;

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ];

    if (showRegistry) {
        menuItems.push(
            { icon: FileText, label: 'Shipment Registry', path: '/registry' }
        );
    }

    if (showClearanceSchedule) {
        menuItems.push(
            { icon: Calendar, label: 'Clearance Schedule', path: '/schedule' }
        );
    }

    if (showDeliveryNotes) {
        menuItems.push(
            { icon: ClipboardList, label: 'Delivery Notes', path: '/delivery-notes' }
        );
    }

    if (showPayments) {
        menuItems.push(
            { icon: CreditCard, label: 'Payments', path: '/payments' }
        );
    }

    if (showAdminToolsExpanded) {
        menuItems.push(
            { icon: Users, label: 'User Management', path: '/users' },
            { icon: FileText, label: 'Reports', path: '/reports' },
            { icon: ScrollText, label: 'Audit Logs', path: '/logs' }
        );
    }



    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                ></div>
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 glass-card border-r border-white/20 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center">
                                <img src={seaflowLogo} alt="Seaflow Logistics" className="w-full h-full object-contain rounded-xl" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-primary-700 to-accent-700 bg-clip-text text-transparent">
                                Seaflow Logistics
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose()}
                                className={({ isActive }) =>
                                    isActive ? 'nav-link-active' : 'nav-link'
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/20">
                        <NavLink
                            to="/settings"
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                isActive ? 'nav-link-active mb-1' : 'nav-link mb-1'
                            }
                        >
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Data Entry</span>
                        </NavLink>
                        <NavLink
                            to="/profile"
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                isActive ? 'nav-link-active mb-4' : 'nav-link mb-4'
                            }
                        >
                            <UserCircle className="w-5 h-5" />
                            <span className="font-medium">Profile</span>
                        </NavLink>

                        {/* User Info & Logout */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-3 mb-3 px-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{user?.username}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>

                        <div className="glass-card p-4">
                            <p className="text-xs text-gray-600 mb-1">Version 1.0.0</p>
                            <p className="text-xs text-gray-500">© 2026 Seaflow Logistics</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
