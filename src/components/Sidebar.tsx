import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    X,
    PackageCheck,
    Users,
    ScrollText,
    FileText,
    Calendar,
    UserCircle,
    Settings,
    Container,
    ClipboardList
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const userRole = user?.role || '';
    const isAdministrator = userRole === 'Administrator';
    const isClearance = ['Clearance Manager', 'Clearance Manager Assistant', 'Clearance Agent', 'Accountant', 'Accountant Assistant'].includes(userRole);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ];

    // Shared Access
    if (isAdministrator || isClearance) {
        menuItems.push({ icon: Package, label: 'Shipments', path: '/shipments' });
    }

    // Registry Access
    if (isClearance || isAdministrator) {
        menuItems.push(
            { icon: FileText, label: 'Shipment Registry', path: '/registry' }
        );
    }

    // Clearance Tools
    if (isClearance) {
        menuItems.push(
            { icon: Calendar, label: 'Clearance Schedule', path: '/schedule' },
            { icon: ClipboardList, label: 'Delivery Notes', path: '/delivery-notes' },
            { icon: Container, label: 'Containers', path: '/containers' },
            { icon: FileText, label: 'Reports', path: '/reports' }
        );
    }

    // Administrator Access
    if (isAdministrator) {
        menuItems.push(
            { icon: Users, label: 'User Management', path: '/users' }
        );
    }

    // System Access (All authenticated)
    menuItems.push(
        { icon: ScrollText, label: 'Audit Logs', path: '/logs' }
    );

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
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                                <PackageCheck className="w-6 h-6 text-white" />
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
                            <span className="font-medium">Settings</span>
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
