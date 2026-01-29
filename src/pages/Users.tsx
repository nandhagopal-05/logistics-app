import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { usersAPI } from '../services/api';
import { Trash2, Edit, Plus, X, User as UserIcon, Shield, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface User {
    id: string;
    username: string;
    email?: string;
    role: string;
    created_at: string;
    last_active?: string;
    is_logged_in?: boolean;
}

const formatLastActive = (dateStr?: string) => {
    if (!dateStr) return 'Inactive (Never logged in)';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    // We handle "Active" via is_logged_in now, but keep logic for recency just in case
    if (diff < 300) return 'Active';

    return `Inactive (${date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`;
};

const getUserStatusText = (user: User) => {
    if (user.is_logged_in) return 'Active';
    return formatLastActive(user.last_active);
};

const getStatusColor = (text: string) => {
    if (text === 'Active') return 'text-green-600 bg-green-100 border border-green-200';
    return 'text-gray-500 bg-gray-100 border border-gray-200';
};

const ROLES = [
    'Administrator',
    'Administrator Assistant',
    'Accountant',
    'Accountant Assistant',
    'Clearance Manager',
    'Clearance Manager Assistant'
];

const Users: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: ROLES[0]
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const [newUserCredentials, setNewUserCredentials] = useState<{ username: string, password: string, email: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (editingUser) {
                const data: any = { role: formData.role };
                if (formData.username && formData.username !== editingUser.username) {
                    data.username = formData.username;
                }
                if (formData.email && formData.email !== editingUser.email) {
                    data.email = formData.email;
                }
                if (formData.password) {
                    data.password = formData.password;
                }
                const response = await usersAPI.update(editingUser.id, data);

                // Update local state immediately
                setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...response.data } : u));
                setSuccess('User updated successfully');
            } else {
                const response = await usersAPI.create(formData);
                const newUser = response.data;

                // Update local state immediately (add to top)
                setUsers([newUser, ...users]);
                setSuccess('User created successfully');

                // Show credentials modal
                setNewUserCredentials({
                    username: newUser.username,
                    password: newUser.temporaryPassword,
                    email: newUser.email
                });
            }
            setIsModalOpen(false);
            // No need to fetchUsers() since we updated state locally
            resetForm();
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await usersAPI.delete(id);
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email || '',
            password: '',
            role: user.role
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            role: ROLES[0]
        });
        setError('');
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">Loading...</div>
            </Layout>
        );
    }

    if (currentUser?.role !== 'Administrator') {
        return (
            <Layout>
                <div className="p-6 text-center text-red-600">
                    Access Denied. You must be an Administrator to view this page.
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-600 mt-1">Manage system users and their roles.</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add New User
                    </button>
                </div>

                <div className="glass-card overflow-hidden">
                    {success && (
                        <div className="bg-green-50 text-green-700 p-4 border-b border-green-100 flex items-center justify-between animate-fade-in">
                            <span className="font-medium">{success}</span>
                            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">User</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Role</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Created At</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div className="font-medium text-gray-900">{user.username}</div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-fit">
                                            <Shield className="w-4 h-4" />
                                            {user.role}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getUserStatusText(user))}`}>
                                            {getUserStatusText(user)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            {user.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Created User Credentials Modal */}
                {newUserCredentials && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in p-6 border-2 border-green-500">
                            <div className="text-center mb-6">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <Shield className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">User Created Successfully</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    Please copy these credentials and share them with the user securely.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6 border border-gray-200">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</label>
                                    <div className="flex items-center justify-between mt-1">
                                        <code className="text-sm font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded border overflow-hidden text-ellipsis">{newUserCredentials.username}</code>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(newUserCredentials.username);
                                                // Could add toast here
                                            }}
                                            className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                            title="Copy Username"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Temporary Password</label>
                                    <div className="flex items-center justify-between mt-1">
                                        <code className="text-lg font-mono font-bold text-primary-600 bg-white px-2 py-1 rounded border overflow-hidden text-ellipsis">{newUserCredentials.password}</code>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(newUserCredentials.password);
                                                // Could add toast here
                                            }}
                                            className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                            title="Copy Password"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                                    <div className="text-sm text-gray-900 mt-1">{newUserCredentials.email}</div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700">
                                            The user will be required to change this password upon their first login.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setNewUserCredentials(null)}
                                className="btn-primary w-full justify-center"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingUser ? 'Edit User' : 'Create New User'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                                    </label>
                                    {!editingUser ? (
                                        <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-100">
                                            Password will be auto-generated and sent to the user's email.
                                        </div>
                                    ) : (
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="input-field"
                                            placeholder="Enter new password to reset"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <div className="relative">
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="input-field appearance-none"
                                        >
                                            {ROLES.map((role) => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary py-2 px-6"
                                    >
                                        {editingUser ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Users;
