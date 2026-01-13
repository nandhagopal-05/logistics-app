import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Monitor, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, authAPI } from '../services/api';

const Profile: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile State
    const [profile, setProfile] = useState({
        name: user?.username || '',
        email: user?.email || '',
    });

    // Password State
    const [password, setPassword] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // 2FA State
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [twoFactorToken, setTwoFactorToken] = useState('');

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (user) {
            setProfile({
                name: user.username,
                email: user.email || ''
            });
        }
    }, [user]);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword({ ...password, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setLoading(true);
        setMessage(null);
        try {
            await usersAPI.update(user.id, {
                username: profile.name,
                email: profile.email
            });
            await refreshUser();
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        } catch (error: any) {
            console.error('Profile update error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSavePassword = async () => {
        if (password.new !== password.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (!password.current || !password.new) {
            setMessage({ type: 'error', text: 'Please fill in all password fields.' });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            await authAPI.changePassword({
                oldPassword: password.current,
                newPassword: password.new
            });
            setMessage({ type: 'success', text: 'Password changed successfully.' });
            setPassword({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            console.error('Password change error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password.' });
        } finally {
            setLoading(false);
        }
    };

    // Photo Upload
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !user) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('photo', file);

        setLoading(true);
        setMessage(null);

        try {
            await usersAPI.uploadPhoto(user.id, formData);
            await refreshUser();
            setMessage({ type: 'success', text: 'Photo updated successfully.' });
        } catch (error: any) {
            console.error('Photo upload error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to upload photo.' });
        } finally {
            setLoading(false);
        }
    };

    // 2FA Functions
    const handleEnable2FA = async () => {
        setLoading(true);
        try {
            const response = await authAPI.generate2FA();
            setQrCodeUrl(response.data.qrCodeUrl);
            setShow2FAModal(true);
        } catch (error: any) {
            console.error('2FA Generate error:', error);
            setMessage({ type: 'error', text: 'Failed to generate 2FA secret.' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async () => {
        if (!twoFactorToken) return;
        setLoading(true);
        try {
            await authAPI.verify2FA(twoFactorToken);
            await refreshUser();
            setShow2FAModal(false);
            setTwoFactorToken('');
            setMessage({ type: 'success', text: 'Two-factor authentication enabled successfully.' });
        } catch (error: any) {
            console.error('2FA Verify error:', error);
            // Don't close modal, show error inside or via toast
            alert('Invalid Token. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable two-factor authentication?')) return;
        setLoading(true);
        try {
            await authAPI.disable2FA();
            await refreshUser();
            setMessage({ type: 'success', text: 'Two-factor authentication disabled.' });
        } catch (error: any) {
            console.error('2FA Disable error:', error);
            setMessage({ type: 'error', text: 'Failed to disable 2FA.' });
        } finally {
            setLoading(false);
        }
    };

    const getPhotoUrl = (path?: string) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.MODE === 'production' ? '' : 'http://localhost:5001';
        return `${baseUrl}${path}`;
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-12">

                {/* Check user context availability */}
                {!user && (
                    <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800">
                        Loading user profile...
                    </div>
                )}

                {/* Page Title & Feedback */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                    {message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Section 1: Profile Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Update your account's profile information and email address.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 space-y-6">
                            {/* Photo Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-4 border-white shadow-sm relative">
                                        {user?.photo_url ? (
                                            <img src={getPhotoUrl(user.photo_url)!} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-2xl font-bold">
                                                {profile.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            onClick={handleFileSelect}
                                            className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded shadow-sm hover:bg-purple-700 transition-colors uppercase tracking-wide"
                                        >
                                            Select A New Photo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profile.name}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profile.email}
                                        onChange={handleProfileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={handleSaveProfile}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200" />

                {/* Section 2: Update Password */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Update Password</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Ensure your account is using a long, random password to stay secure.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    name="current"
                                    value={password.current}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    name="new"
                                    value={password.new}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirm"
                                    value={password.confirm}
                                    onChange={handlePasswordChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black outline-none transition-all text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={handleSavePassword}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200" />

                {/* Section 3: Two Factor Authentication */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Two Factor Authentication</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Add additional security to your account using two factor authentication.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6">
                            {user?.two_factor_enabled ? (
                                <div>
                                    <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Two factor authentication is enabled.
                                    </h4>
                                    <p className="text-sm text-gray-500 mb-4 max-w-xl">
                                        Your account is secure. You will be prompted for a secure random token during authentication.
                                    </p>
                                    <button
                                        onClick={handleDisable2FA}
                                        className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded shadow-sm hover:bg-red-700 transition-colors uppercase tracking-wide"
                                    >
                                        Disable
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-2">You have not enabled two factor authentication.</h4>
                                    <p className="text-sm text-gray-500 mb-4 max-w-xl">
                                        When two factor authentication is enabled, you will be prompted for a secure, random token during authentication. You may retrieve this token from your phone's Google Authenticator application.
                                    </p>
                                    <button
                                        onClick={handleEnable2FA}
                                        className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide"
                                    >
                                        Enable
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200" />

                {/* Section 4: Browser Sessions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium text-gray-900">Browser Sessions</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage and log out your active sessions on other browsers and devices.
                        </p>
                    </div>

                    <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-6 max-w-xl">
                                If necessary, you may log out of all of your other browser sessions across all of your devices. Some of your recent sessions are listed below; however, this list may not be exhaustive. If you feel your account has been compromised, you should also update your password.
                            </p>

                            {/* Current Session */}
                            <div className="flex items-center gap-4 mb-6">
                                <Monitor className="w-8 h-8 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">OS X - Chrome</p>
                                    <p className="text-xs text-gray-500">
                                        127.0.0.1, <span className="text-green-600 font-medium">This device</span>
                                    </p>
                                </div>
                            </div>

                            <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded shadow-sm hover:bg-black transition-colors uppercase tracking-wide">
                                Log Out Other Browser Sessions
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2FA Setup Modal */}
                {show2FAModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Setup Two-Factor Authentication</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Configured using Google Authenticator, Authy, or 1Password. Scan the QR code below.
                            </p>

                            <div className="flex justify-center mb-6">
                                <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 border border-gray-200 rounded" />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Verify Code
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Enter the 6-digit code from your authenticator app to verify setup.
                                </p>
                                <input
                                    type="text"
                                    value={twoFactorToken}
                                    onChange={(e) => setTwoFactorToken(e.target.value)}
                                    placeholder="000 000"
                                    className="input-field text-center text-xl tracking-widest"
                                    maxLength={6}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShow2FAModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerify2FA}
                                    disabled={twoFactorToken.length < 6}
                                    className="btn-primary"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default Profile;
