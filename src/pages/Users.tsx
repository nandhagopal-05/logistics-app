import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { usersAPI } from '../services/api';
import { Trash2, Edit, Plus, X, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface User {
    id: string;
    username: string;
    email?: string;
    role: string;
    created_at: string;
}

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
                await usersAPI.update(editingUser.id, data);
                setSuccess('User updated successfully');
            } else {
                await usersAPI.create(formData);
                setSuccess('User created and role assigned successfully');
            }
            setIsModalOpen(false);
            fetchUsers();
            resetForm();
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
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
