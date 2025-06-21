import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
// IMPORTANT: style.css is linked directly in public/index.html to avoid import issues.
// Do NOT uncomment the line below:
// import './style.css'; 

// --- Context for Authentication ---
const AuthContext = createContext(null); 

// NEW: Toast Notification System
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);
        
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium max-w-sm transform transition-all duration-300 ${
                            toast.type === 'success' ? 'bg-green-500' :
                            toast.type === 'error' ? 'bg-red-500' :
                            toast.type === 'warning' ? 'bg-yellow-500' :
                            'bg-blue-500'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span>{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ml-3 text-white hover:text-gray-200"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const AuthContextProvider = ({ children }) => { 
    const [token, setTokenInternal] = useState(localStorage.getItem('jwtToken'));
    const [userDetails, setUserDetails] = useState(null); 
    const [isAuthLoading, setIsAuthLoading] = useState(true); 

    const setToken = (newToken) => {
        if (newToken) {
            localStorage.setItem('jwtToken', newToken);
        } else {
            localStorage.removeItem('jwtToken');
        }
        setTokenInternal(newToken);
    };

    const removeToken = () => {
        setToken(null);
        setUserDetails(null);
        setIsAuthLoading(false); 
    };

    const createAuthHeaders = (contentType = 'application/json') => {
        return token ? {
            'Content-Type': contentType,
            'Authorization': `Bearer ${token}`
        } : {
            'Content-Type': contentType
        };
    };

    const createFileUploadAuthHeaders = () => {
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    const fetchUserDetails = useCallback(async (setCurrentPageCallback) => {
        setIsAuthLoading(true); 
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/user/details`, {
                    method: 'GET',
                    headers: createAuthHeaders(),
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log('AuthContext - Fetched User Details:', data);
                    console.log('AuthContext - User Roll Number from details:', data.user?.roll_number); 
                    setUserDetails(data.user); 
                } else {
                    console.error('AuthContext - Failed to fetch user details:', response.status, response.statusText);
                    if (response.status === 401 || response.status === 403) {
                        removeToken();
                        alert('Your session has expired or is invalid. Please log in again.');
                        if (setCurrentPageCallback) setCurrentPageCallback('login'); 
                    }
                }
            } catch (error) {
                console.error('AuthContext - Error fetching user details:', error);
                alert('An error occurred while fetching user details.');
            } finally {
                setIsAuthLoading(false); 
            }
        } else {
            setIsAuthLoading(false); 
        }
    }, [token]); 

    useEffect(() => {
        fetchUserDetails(); 
    }, [fetchUserDetails]);

    return (
        <AuthContext.Provider value={{ token, setToken, removeToken, createAuthHeaders, createFileUploadAuthHeaders, userDetails, setUserDetails, fetchUserDetails, isAuthLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Global API Base URL (will be replaced by render/deployment) ---
// IMPORTANT: Replace this placeholder with your actual backend API URL.
// Example: 'https://your-backend-url.onrender.com'
const API_BASE_URL = 'https://plote.onrender.com'; // REMEMBER TO UPDATE THIS FOR YOUR DEPLOYED BACKEND!

// --- Reusable Modal Components ---

const CustomConfirmModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5">
            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
                <p className="mb-6 text-gray-800 text-lg font-medium">{message}</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onConfirm}
                        className="bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                    >
                        Yes
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-200 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75"
                    >
                        No
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditTitleModal = ({ projectId, currentTitle, onClose, onSave }) => {
    const { createAuthHeaders } = useContext(AuthContext);
    const { showToast } = useToast();
    const [newTitle, setNewTitle] = useState(currentTitle);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!newTitle.trim()) {
            setError('Project title cannot be empty.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: createAuthHeaders(),
                body: JSON.stringify({ name: newTitle })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showToast(data.message || 'Project title updated successfully!', 'success');
                onSave(newTitle);
            } else {
                setError(data.message || 'Error updating project title.');
                showToast(data.message || 'Error updating project title.', 'error');
            }
        } catch (err) {
            setError('An error occurred while updating the project title.');
            showToast('An error occurred while updating the project title.', 'error');
        }
    };
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5">
            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-2xl max-w-md w-full">
                <h3 className="text-xl font-bold mb-2 text-center text-gray-800">Edit Project Title</h3>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="newProjectTitle" className="font-semibold text-gray-700">New Project Title:</label>
                    <input
                        type="text"
                        id="newProjectTitle"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white shadow-sm"
                        required
                    />
                    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ReplaceFileModal = ({ fileId, currentFileName, onClose, onReplace }) => {
    const { createFileUploadAuthHeaders } = useContext(AuthContext);
    const { showToast } = useToast();
    const [newFileName, setNewFileName] = useState(currentFileName);
    const [newFile, setNewFile] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!newFileName.trim()) {
            setError('File name cannot be empty.');
            return;
        }
        if (!newFile) {
            setError('Please select a new file to upload.');
            return;
        }
        const formData = new FormData();
        formData.append('fileName', newFileName);
        formData.append('newFile', newFile);
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/replace-file/${fileId}`, {
                method: 'POST',
                headers: createFileUploadAuthHeaders(),
                body: formData
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showToast(data.message || 'File replaced successfully!', 'success');
                onReplace();
            } else {
                setError(data.message || 'Error replacing file.');
                showToast(data.message || 'Error replacing file.', 'error');
            }
        } catch (err) {
            setError('An error occurred while replacing the file.');
            showToast('An error occurred while replacing the file.', 'error');
        }
    };
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5">
            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-2xl max-w-md w-full">
                <h3 className="text-xl font-bold mb-2 text-center text-gray-800">Replace File</h3>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="newFileName" className="font-semibold text-gray-700">New File Name:</label>
                    <input
                        type="text"
                        id="newFileName"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white shadow-sm"
                        required
                    />
                    <label htmlFor="newFileInput" className="font-semibold text-gray-700">Upload New File:</label>
                    <input
                        type="file"
                        id="newFileInput"
                        onChange={(e) => setNewFile(e.target.files[0])}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white shadow-sm"
                        required
                    />
                    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// NEW: Code Viewer Modal Component
const CodeViewerModal = ({ content, language, onClose }) => {
    const codeRef = useRef(null);
    useEffect(() => {
        const loadScript = (url, callback) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = callback;
            script.onerror = () => console.error(`Failed to load script: ${url}`);
            document.head.appendChild(script);
        };
        const loadStylesheet = (url) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onerror = () => console.error(`Failed to load stylesheet: ${url}`);
            document.head.appendChild(link);
        };
        const highlightCode = () => {
            if (window.hljs && codeRef.current) {
                codeRef.current.className = '';
                if (language) {
                    codeRef.current.classList.add(`language-${language}`);
                }
                window.hljs.highlightElement(codeRef.current);
            }
        };
        if (window.hljs) {
            highlightCode();
        } else {
            loadStylesheet('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css');
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', () => {
                highlightCode();
            });
        }
    }, [content, language]);
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5">
            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-2xl max-w-3xl w-full h-4/5 flex flex-col">
                <h3 className="text-xl font-bold mb-2 text-center text-gray-800">Code Viewer</h3>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <div className="flex-grow overflow-auto rounded-lg bg-gray-100 p-4 text-sm">
                    <pre>
                        <code ref={codeRef} className={`language-${language || 'plaintext'}`}>{content}</code>
                    </pre>
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-75"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// NEW: ProjectCard Component
const ProjectCard = ({ project, onSelectProject, searchTerm = '' }) => {
    const isHighlighted = searchTerm && 
        (project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         project.description?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div
            className={`bg-gray-100 p-4 rounded-xl shadow-lg hover:bg-gray-200 transition duration-200 cursor-pointer ${
                isHighlighted ? 'ring-2 ring-blue-400 bg-blue-50' : ''
            }`}
            onClick={() => onSelectProject(project.id, project.name)}
        >
            <h4 className="text-xl font-bold text-gray-800 mb-2">{project.name}</h4>
            <p className="text-gray-600 text-sm mb-3">{project.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                <span>{project.fileCount || 0} files</span>
            </div>
        </div>
    );
};


// --- Page Components ---

// LoginPage
const LoginPage = ({ onLoginSuccess, onNavigateToRegister, onNavigateToForgotPassword }) => {
    const { setToken } = useContext(AuthContext); 
    const { showToast } = useToast();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowForgotPassword(false); 
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success && data.token) {
                setToken(data.token);
                showToast('Login successful!', 'success');
                onLoginSuccess();
            } else {
                setError(data.message || 'Login failed. Please check your credentials.');
                showToast(data.message || 'Login failed. Please check your credentials.', 'error');
                setShowForgotPassword(true);
            }
        } catch (err) {
            console.error('Error during login:', err);
            setError('An error occurred. Please try again.');
            showToast('An error occurred. Please try again.', 'error');
        }
    };

    return (
        <div className="flex items-center justify-center w-full min-h-[80vh] animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl w-full max-w-md p-8 flex flex-col items-center relative">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Login</h2>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                    <label htmlFor="loginUsername" className="font-semibold text-gray-700 text-base">Username</label> 
                    <input
                        type="text"
                        id="loginUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-base bg-white shadow-sm"
                        required
                    />

                    <label htmlFor="loginPassword" className="font-semibold text-gray-700 text-base">Password</label> 
                    <PasswordInput
                        id="loginPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && <p className="text-red-500 text-base text-center mt-2 animate-fade-in">{error}</p>}

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 mt-2 shadow-md"
                    >
                        Login
                    </button>
                </form>
                {showForgotPassword && (
                    <p className="mt-4 text-gray-700">
                        <a href="#" onClick={onNavigateToForgotPassword} className="text-blue-500 font-semibold hover:underline hover:text-blue-700 transition-colors">
                            Forgot Password?
                        </a>
                    </p>
                )}
                <div className="mt-8 w-full flex justify-center">
                    <p className="text-gray-700 text-base text-center">
                        Don't have an account?{' '}
                        <a href="#" onClick={onNavigateToRegister} className="text-blue-500 font-semibold hover:underline hover:text-blue-700 transition-colors">
                            Register here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

// RegisterPage
const RegisterPage = ({ onRegisterSuccess, onNavigateToLogin }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        reEnterPassword: '',
        collegeName: '',
        branch: '',
        rollNumber: '',
        mobileNumber: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const validateMobileNumber = (number) => {
        const regex = /^[0-9]{10}$/;
        return regex.test(number);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.reEnterPassword) {
            setError('Passwords do not match!');
            showToast('Passwords do not match!', 'error');
            return;
        }

        if (!validateMobileNumber(formData.mobileNumber)) {
            setError('Please enter a valid 10-digit mobile number.');
            showToast('Please enter a valid 10-digit mobile number.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                    college: formData.collegeName,
                    branch: formData.branch,
                    rollNumber: formData.rollNumber,
                    mobileNumber: formData.mobileNumber
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Registration successful! You can now log in.', 'success');
                onRegisterSuccess();
            } else {
                setError(data.message || 'Registration failed. Please try again.');
                showToast(data.message || 'Registration failed. Please try again.', 'error');
            }
        } catch (err) {
            console.error('Error during registration:', err);
            setError('An error occurred during registration. Please try again.');
            showToast('An error occurred during registration. Please try again.', 'error');
        }
    };

    return (
        <div className="flex items-center justify-center w-full min-h-[80vh] animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl w-full max-w-lg p-8 flex flex-col items-center relative">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Register</h2>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="email" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Email</label>
                        <input type="email" id="email" value={formData.email} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow text-base bg-white shadow-sm" required />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="username" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Username</label>
                        <input type="text" id="username" value={formData.username} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow text-base bg-white shadow-sm" required />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="password" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Password</label>
                        <div className="flex-grow">
                            <PasswordInput
                                id="password"
                                value={formData.password}
                                onChange={(e) => handleChange(e)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="reEnterPassword" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Re-enter Password</label>
                        <div className="flex-grow">
                            <PasswordInput
                                id="reEnterPassword"
                                value={formData.reEnterPassword}
                                onChange={(e) => handleChange(e)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="collegeName" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">College Name</label>
                        <input type="text" id="collegeName" value={formData.collegeName} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow text-base bg-white shadow-sm" required />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="branch" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Branch</label>
                        <input type="text" id="branch" value={formData.branch} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow text-base bg-white shadow-sm" required />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="rollNumber" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Roll Number</label>
                        <input type="text" id="rollNumber" value={formData.rollNumber} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow text-base bg-white shadow-sm" required />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 w-full">
                        <label htmlFor="mobileNumber" className="font-semibold text-gray-700 text-base sm:w-1/4 flex-shrink-0">Mobile Number</label>
                        <input
                            type="tel"
                            id="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            placeholder="Enter 10-digit mobile number"
                            pattern="[0-9]{10}"
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow text-base bg-white shadow-sm"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-base text-center mt-2 animate-fade-in">{error}</p>}
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 mt-2 shadow-md"
                    >
                        Register
                    </button>
                </form>
                <p className="mt-8 text-gray-700 text-base">
                    Already have an account?{' '}
                    <a href="#" onClick={onNavigateToLogin} className="text-blue-500 font-semibold hover:underline hover:text-blue-700 transition-colors">
                        Login here
                    </a>
                </p>
            </div>
        </div>
    );
};

// NEW: Forgot Password Request Page
const ForgotPasswordPage = ({ onNavigateToLogin, onNavigateToResetPasswordWithToken }) => {
    const { showToast } = useToast();
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [resetTokenInfo, setResetTokenInfo] = useState(null); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setResetTokenInfo(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setMessage(data.message);
                if (data.token && data.resetLink) {
                    setResetTokenInfo({ token: data.token, resetLink: data.resetLink });
                }
            } else {
                setError(data.message || 'Error requesting password reset.');
            }
        } catch (err) {
            console.error('Error requesting password reset:', err);
            setError('An error occurred. Please try again.');
        }
    };

    const handleCopyToken = () => {
        if (resetTokenInfo?.token) {
            const tempInput = document.createElement('textarea');
            tempInput.value = resetTokenInfo.token;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showToast('Token copied to clipboard!', 'success');
        }
    };

    return (
        <div className="flex items-center justify-center w-full min-h-[80vh] animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl w-full max-w-md p-8 flex flex-col items-center relative">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Forgot Password</h2>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                    <p className="text-center text-gray-700 mb-2">Enter your username to receive a password reset token.</p>
                    <label htmlFor="username" className="font-semibold text-gray-700 text-base">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-base bg-white shadow-sm"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 mt-2 shadow-md"
                    >
                        Request Reset Token
                    </button>
                </form>
                {error && <p className="text-red-500 text-base text-center mt-4">{error}</p>}
                {message && <p className="text-green-500 text-base text-center mt-4">{message}</p>}
                {resetTokenInfo && (
                    <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg w-full max-w-xs mx-auto text-center">
                        <p className="font-bold text-yellow-800 mb-2">FOR DEMO PURPOSES ONLY:</p>
                        <p className="text-sm text-yellow-700 mb-2">
                            Token: <span id="resetTokenDisplay" className="font-mono break-all">{resetTokenInfo.token}</span>
                            <button
                                onClick={handleCopyToken}
                                className="ml-2 bg-blue-200 text-blue-800 text-xs py-1 px-2 rounded-md hover:bg-blue-300 transition duration-200"
                            >
                                Copy
                            </button>
                        </p>
                        <p className="text-sm text-yellow-700">
                            Use this link to proceed: <a href="#" onClick={() => onNavigateToResetPasswordWithToken(resetTokenInfo.token)} className="text-blue-500 font-semibold hover:underline break-all">Reset Password Link</a>
                        </p>
                    </div>
                )}
                <p className="mt-8 text-gray-700 text-base">
                    Remembered your password?{' '}
                    <a href="#" onClick={onNavigateToLogin} className="text-blue-500 font-semibold hover:underline hover:text-blue-700 transition-colors">
                        Back to Login
                    </a>
                </p>
            </div>
        </div>
    );
};

// NEW: Reset Password Page
const ResetPasswordPage = ({ onNavigateToLogin, initialToken }) => {
    const { showToast } = useToast();
    const [username, setUsername] = useState('');
    const [token, setToken] = useState(initialToken || '');
    const [newPassword, setNewPassword] = useState('');
    const [reEnterNewPassword, setReEnterNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (initialToken) {
            setToken(initialToken);
        }
    }, [initialToken]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== reEnterNewPassword) {
            setError('New passwords do not match!');
            showToast('New passwords do not match!', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, token, newPassword })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setMessage(data.message || 'Password reset successfully!');
                showToast(data.message || 'Password reset successfully! You can now log in.', 'success');
                onNavigateToLogin();
            } else {
                setError(data.message || 'Error resetting password.');
                showToast(data.message || 'Error resetting password.', 'error');
            }
        } catch (err) {
            console.error('Error resetting password:', err);
            setError('An error occurred. Please try again.');
            showToast('An error occurred. Please try again.', 'error');
        }
    };

    return (
        <div className="flex items-center justify-center w-full min-h-[80vh] animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl w-full max-w-md p-8 flex flex-col items-center relative">
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Reset Password</h2>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                    <label htmlFor="resetUsername" className="font-semibold text-gray-700 text-base">Username</label>
                    <input
                        type="text"
                        id="resetUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-base bg-white shadow-sm"
                        required
                    />
                    <label htmlFor="resetToken" className="font-semibold text-gray-700 text-base">Reset Token</label>
                    <input
                        type="text"
                        id="resetToken"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-base bg-white shadow-sm"
                        required
                    />
                    <label htmlFor="newPassword" className="font-semibold text-gray-700 text-base">New Password</label>
                    <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <label htmlFor="reEnterNewPassword" className="font-semibold text-gray-700 text-base">Re-enter New Password</label>
                    <PasswordInput
                        id="reEnterNewPassword"
                        value={reEnterNewPassword}
                        onChange={(e) => setReEnterNewPassword(e.target.value)}
                    />
                    {error && <p className="text-red-500 text-base text-center mt-2">{error}</p>}
                    {message && <p className="text-green-500 text-base text-center mt-2">{message}</p>}
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 mt-2 shadow-md"
                    >
                        Reset Password
                    </button>
                </form>
                <p className="mt-8 text-gray-700 text-base">
                    <a href="#" onClick={onNavigateToLogin} className="text-blue-500 font-semibold hover:underline hover:text-blue-700 transition-colors">
                        Back to Login
                    </a>
                </p>
            </div>
        </div>
    );
};

// NEW: Privacy Policy Page
const PrivacyPolicyPage = ({ onNavigateToLogin }) => {
    return (
        <div className="flex items-start justify-end p-5 w-full h-full mt-8">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col items-end animate-fade-in-up">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h2>
                <div className="w-full max-w-3xl text-right space-y-6">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <h3 className="text-2xl font-bold text-blue-800 mb-4">Project Portfolio & Selling Platform</h3>
                        <p className="text-gray-700 leading-relaxed">
                            Kroxnest is a comprehensive platform designed for students to showcase their academic projects, 
                            collaborate with peers, and potentially monetize their innovative work. Our platform serves as 
                            a bridge between talented students and potential buyers, investors, or collaborators.
                        </p>
                    </div>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Information We Collect</h3>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li><strong>Personal Information:</strong> Name, email, college details, roll number, and contact information</li>
                            <li><strong>Project Data:</strong> Project files, descriptions, and associated metadata</li>
                            <li><strong>Usage Analytics:</strong> Platform interaction data to improve user experience</li>
                            <li><strong>Communication Data:</strong> Messages and interactions between users</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">How We Use Your Information</h3>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Facilitate project showcasing and portfolio building</li>
                            <li>Enable project discovery by potential buyers and investors</li>
                            <li>Provide collaboration tools for team projects</li>
                            <li>Send notifications about project inquiries and opportunities</li>
                            <li>Improve platform functionality and user experience</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Project Selling & Monetization</h3>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-gray-700 leading-relaxed">
                                Our platform enables students to monetize their projects through various channels:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1">
                                <li><strong>Direct Sales:</strong> Sell completed projects to interested buyers</li>
                                <li><strong>Licensing:</strong> License your project code or design to companies</li>
                                <li><strong>Consulting:</strong> Offer implementation services for your projects</li>
                                <li><strong>Collaboration:</strong> Partner with other students on commercial ventures</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Data Protection</h3>
                        <p className="text-gray-700 leading-relaxed">
                            We implement industry-standard security measures to protect your personal information and project data. 
                            All file uploads are encrypted, and access is restricted to authorized personnel only.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Third-Party Services</h3>
                        <p className="text-gray-700 leading-relaxed">
                            We may integrate with third-party services for payment processing, analytics, and communication. 
                            These services have their own privacy policies, and we recommend reviewing them.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Your Rights</h3>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Access and download your personal data</li>
                            <li>Request deletion of your account and associated data</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Control visibility of your projects and profile</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Contact Information</h3>
                        <p className="text-gray-700 leading-relaxed">
                            For privacy-related inquiries, please contact us at: <br/>
                            <strong>Email:</strong> privacy@kroxnest.com<br/>
                            <strong>Phone:</strong> +1 234 567 890
                        </p>
                    </section>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-sm text-gray-600">
                            <strong>Last Updated:</strong> January 2025<br/>
                            This privacy policy is subject to change. Please review periodically.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onNavigateToLogin}
                    className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg mt-8 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
};

// NEW: Navigation Bar Component
const NavigationBar = ({ currentPage, onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { name: 'Home', icon: 'fa-solid fa-home', page: 'home' },
        { name: 'Process', icon: 'fa-solid fa-gears', page: 'howToUse' },
        { name: 'About Us', icon: 'fa-solid fa-info-circle', page: 'about' },
        { name: 'Contact Us', icon: 'fa-solid fa-phone', page: 'contact' },
        { name: 'Privacy Policy', icon: 'fa-solid fa-shield-halved', page: 'privacyPolicy' }
    ];

    const handleNavClick = (page) => {
        setIsMenuOpen(false);
        if (page === 'home') {
            // Home should go to login page for non-authenticated users, or welcome page for authenticated users
            if (token && userDetails) {
                onNavigate('welcome');
            } else {
                onNavigate('login');
            }
        } else if (page === 'howToUse') {
            // Scroll to the "How to use" section
            const howToUseSection = document.querySelector('[data-section="how-to-use"]');
            if (howToUseSection) {
                howToUseSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (page === 'about') {
            // Scroll to the "What we do" section
            const whatWeDoSection = document.querySelector('[data-section="what-we-do"]');
            if (whatWeDoSection) {
                whatWeDoSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (page === 'contact') {
            // Scroll to the footer
            const footer = document.querySelector('footer');
            if (footer) {
                footer.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            onNavigate(page);
        }
    };

    return (
        <nav className="sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-0">
                <div className="flex justify-end items-center h-10">
                    {/* Desktop Navigation - All items on the right with no padding */}
                    <div className="hidden md:flex items-center">
                        {navItems.slice(0, -1).map((item) => (
                            <button
                                key={item.name}
                                onClick={() => handleNavClick(item.page)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/20 hover:text-white group mr-8 ${
                                    (currentPage === item.page || (item.page === 'home' && (currentPage === 'login' || currentPage === 'welcome'))) ? 'text-white bg-white/20' : 'text-gray-200'
                                }`}
                            >
                                <span>{item.name}</span>
                            </button>
                        ))}
                        {/* Privacy Policy - No margin to stick to right corner */}
                        <button
                            onClick={() => handleNavClick(navItems[navItems.length - 1].page)}
                            className={`py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/20 hover:text-white group ${
                                currentPage === navItems[navItems.length - 1].page ? 'text-white bg-white/20' : 'text-gray-200'
                            }`}
                        >
                            <span>{navItems[navItems.length - 1].name}</span>
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-white hover:text-gray-200 focus:outline-none focus:text-gray-200"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 bg-black/30 backdrop-blur-md rounded-lg border border-white/20">
                            {navItems.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => handleNavClick(item.page)}
                                    className={`flex items-center space-x-3 w-full text-left px-3 py-2 rounded-lg text-base font-medium transition-all duration-300 hover:bg-white/20 hover:text-white group ${
                                        (currentPage === item.page || (item.page === 'home' && (currentPage === 'login' || currentPage === 'welcome'))) ? 'text-white bg-white/20' : 'text-gray-200'
                                    }`}
                                >
                                    <i className={`${item.icon} text-lg group-hover:scale-110 transition-transform duration-300`}></i>
                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

const WelcomePage = ({ onNavigateToCreateProject, onNavigateToViewProjects, onNavigateToSuggestions }) => {
    const { userDetails, removeToken, fetchUserDetails, isAuthLoading } = useContext(AuthContext);
    const { showToast } = useToast();

    useEffect(() => {
        if (!userDetails && !isAuthLoading) {
            fetchUserDetails();
        }
    }, [userDetails, fetchUserDetails, isAuthLoading]);

    const handleLogout = () => {
        removeToken();
        showToast('Logged out successfully!', 'success');
    };

    return (
        <div className="flex items-center justify-center w-full min-h-[80vh] animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl w-full max-w-2xl p-8 flex flex-col items-center relative">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Welcome{userDetails?.username ? `, ${userDetails.username}` : ''}!</h1>
                <div className="w-16 h-1 bg-blue-500 rounded-full mb-6 mx-auto" />
                {isAuthLoading ? (
                    <p className="text-gray-600 mb-6">Loading user details...</p>
                ) : userDetails ? (
                    <div className="user-details-box text-left w-full max-w-md mx-auto mb-6 p-4 border border-blue-100 rounded-xl bg-blue-50 shadow-sm">
                        <p className="text-gray-700 text-base mb-2">College: <span className="font-medium">{userDetails.college || 'N/A'}</span></p>
                        <p className="text-gray-700 text-base mb-2">Branch: <span className="font-medium">{userDetails.branch || 'N/A'}</span></p>
                        <p className="text-gray-700 text-base">Roll Number: <span className="font-medium">{userDetails.roll_number || 'N/A'}</span></p>
                    </div>
                ) : (
                    <p className="text-red-500 mb-6">Could not load user details. Please try logging in again.</p>
                )}
                <button
                    onClick={onNavigateToSuggestions}
                    className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 shadow-md mb-4"
                >
                    Project Suggestions
                </button>
                <div className="flex flex-col sm:flex-row gap-6 mt-2 w-full justify-center">
                    <button
                        onClick={onNavigateToCreateProject}
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 shadow-md"
                    >
                        Create New Project
                    </button>
                    <button
                        onClick={onNavigateToViewProjects}
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 shadow-md"
                    >
                        View All Projects
                    </button>
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-gray-200 text-gray-800 py-2 px-5 rounded-lg font-bold text-base transition duration-200 hover:bg-gray-300 shadow-md mt-6 w-full max-w-[150px] mx-auto"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

// Suggestions Page
const SuggestionsPage = ({ onNavigateToWelcome }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);

    const categories = [
        { id: 'ai', name: 'AI', icon: 'fa-solid fa-brain' },
        { id: 'aiml', name: 'AIML', icon: 'fa-solid fa-robot' },
        { id: 'cse', name: 'CSE', icon: 'fa-solid fa-laptop-code' },
        { id: 'ece', name: 'ECE', icon: 'fa-solid fa-microchip' },
        { id: 'eee', name: 'EEE', icon: 'fa-solid fa-bolt' },
        { id: 'iot', name: 'IOT', icon: 'fa-solid fa-wifi' },
        { id: 'it', name: 'IT', icon: 'fa-solid fa-server' },
        { id: 'bs', name: 'BS', icon: 'fa-solid fa-chart-line' },
        { id: 'ds', name: 'DS', icon: 'fa-solid fa-database' }
    ];

    const projectSuggestions = {
        ai: [
            'AI-Powered Attendance System',
            'Smart Chatbot for Customer Service',
            'Image Recognition System',
            'Natural Language Processing Tool',
            'AI-Based Recommendation System',
            'Voice Recognition Application',
            'AI-Powered Medical Diagnosis',
            'Autonomous Vehicle Simulation'
        ],
        aiml: [
            'Machine Learning Stock Predictor',
            'Sentiment Analysis Tool',
            'Facial Recognition System',
            'Predictive Analytics Dashboard',
            'ML-Based Fraud Detection',
            'Recommendation Engine',
            'Pattern Recognition System',
            'Deep Learning Image Classifier'
        ],
        cse: [
            'E-Learning Platform',
            'Social Media Clone',
            'E-Commerce Website',
            'Task Management System',
            'File Sharing Application',
            'Online Quiz Platform',
            'Blog Management System',
            'Real-time Chat Application'
        ],
        ece: [
            'Smart Home Automation',
            'Digital Signal Processing Tool',
            'RFID-Based Attendance System',
            'Audio Processing Application',
            'Circuit Design Simulator',
            'Wireless Communication System',
            'Embedded System Controller',
            'Digital Clock with Alarms'
        ],
        eee: [
            'Power System Monitoring',
            'Energy Consumption Tracker',
            'Smart Grid Management',
            'Electrical Load Calculator',
            'Circuit Breaker Simulator',
            'Power Factor Correction',
            'Renewable Energy Monitor',
            'Electrical Safety System'
        ],
        iot: [
            'Smart Agriculture System',
            'IoT-Based Health Monitor',
            'Smart Parking System',
            'Environmental Monitoring',
            'Home Security System',
            'Smart Traffic Light Control',
            'Industrial IoT Dashboard',
            'Weather Station with Sensors'
        ],
        it: [
            'Network Monitoring Tool',
            'Cybersecurity Dashboard',
            'Database Management System',
            'Cloud Storage Application',
            'API Management Platform',
            'DevOps Automation Tool',
            'IT Asset Tracker',
            'System Performance Monitor'
        ],
        bs: [
            'Business Analytics Dashboard',
            'Customer Relationship Management',
            'Inventory Management System',
            'Financial Planning Tool',
            'Market Analysis Platform',
            'Sales Forecasting System',
            'Business Intelligence Tool',
            'Project Management Application'
        ],
        ds: [
            'Data Visualization Dashboard',
            'Big Data Processing Tool',
            'Statistical Analysis Platform',
            'Data Mining Application',
            'Predictive Modeling System',
            'Data Quality Assessment Tool',
            'Real-time Data Analytics',
            'Data Pipeline Management'
        ]
    };

    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId);
    };

    const handleBackToCategories = () => {
        setSelectedCategory(null);
    };

    return (
        <div className="flex items-start justify-center p-5 w-full h-full mt-8">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col items-center animate-fade-in-up">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Project Suggestions</h2>
                
                {!selectedCategory ? (
                    <>
                        <p className="text-gray-600 text-lg mb-8 text-center max-w-2xl">
                            Choose your branch to discover exciting project ideas tailored to your field of study
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 w-full max-w-4xl">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category.id)}
                                    className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-blue-200 hover:border-blue-400 group"
                                >
                                    <i className={`${category.icon} text-3xl text-blue-600 mb-3 group-hover:scale-110 transition-transform duration-300`}></i>
                                    <span className="text-lg font-bold text-gray-800">{category.name}</span>
                                    <span className="text-sm text-gray-600 mt-1">Click to explore</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="w-full max-w-4xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">
                                {categories.find(cat => cat.id === selectedCategory)?.name} Projects
                            </h3>
                            <button
                                onClick={handleBackToCategories}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                                <span>Back to Categories</span>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projectSuggestions[selectedCategory].map((project, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-gradient-to-br from-white to-blue-50 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-semibold text-gray-800 mb-2">{project}</h4>
                                            <p className="text-gray-600 text-sm">
                                                A comprehensive project idea perfect for {categories.find(cat => cat.id === selectedCategory)?.name} students.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <h4 className="text-lg font-semibold text-blue-800 mb-2">💡 Project Tips</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Choose a project that aligns with your interests and career goals</li>
                                <li>• Consider the complexity and time required for implementation</li>
                                <li>• Think about real-world applications and market potential</li>
                                <li>• Collaborate with peers to enhance your project portfolio</li>
                            </ul>
                        </div>
                    </div>
                )}
                
                <button
                    onClick={onNavigateToWelcome}
                    className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold text-base transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg mt-8 w-full max-w-[200px] mx-auto focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                >
                    Back to Welcome
                </button>
            </div>
        </div>
    );
};

// Updated FileItem component to ensure title and buttons are on the same line, never overflow, and look good on all screens
const FileItem = ({ file, projectOwnerRollNumber, loggedInUserRollNumber, onReplace, onDelete, onViewFile }) => {
    const isOwner = loggedInUserRollNumber && projectOwnerRollNumber === loggedInUserRollNumber;
    return (
        <div className="flex flex-row flex-wrap items-center gap-2 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-lg animate-fade-in-up w-full">
            <span className="font-semibold text-gray-700 text-sm flex-shrink-0">Title:</span>
            <span className="font-bold text-gray-800 flex-grow min-w-0 truncate">{file.file_name} ({file.original_name})</span>
            <div className="flex flex-row gap-2 flex-shrink-0">
                <button
                    onClick={() => onViewFile(file.file_path, file.original_name)}
                    className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-bold transition duration-200 hover:bg-gray-300 text-center"
                >
                    View
                </button>
                {isOwner && (
                    <>
                        <button
                            onClick={() => onReplace(file.id, file.file_name)}
                            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-bold transition duration-200 hover:bg-gray-300"
                        >
                            Replace
                        </button>
                        <button
                            onClick={() => onDelete(file.id)}
                            className="bg-red-500 text-white py-2 px-4 rounded-lg font-bold transition duration-200 hover:bg-red-600"
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};


const ViewProjectsPage = ({ onNavigateToWelcome }) => {
    const { createAuthHeaders, createFileUploadAuthHeaders, removeToken, userDetails } = useContext(AuthContext);
    const { showToast } = useToast();
    const loggedInUserRollNumber = userDetails?.roll_number; 
    console.log('ViewProjectsPage - loggedInUserRollNumber (from AuthContext):', loggedInUserRollNumber); 

    const [rollNumber, setRollNumber] = useState('');
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectFiles, setProjectFiles] = useState([]);
    const [addFiles, setAddFiles] = useState([{ file: null, title: '', id: 1 }]);
    const [nextAddFileId, setNextAddFileId] = useState(2);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); 
    const [showEditTitleModal, setShowEditTitleModal] = useState(false);
    const [showReplaceFileModal, setShowReplaceFileModal] = useState(false);
    const [fileToReplace, setFileToReplace] = useState(null);
    const [hasSearched, setHasSearched] = useState(false); 

    const [showCodeViewer, setShowCodeViewer] = useState(false);
    const [codeViewerContent, setCodeViewerContent] = useState('');
    const [codeViewerLanguage, setCodeViewerLanguage] = useState(''); 

    const [isProjectsLoading, setIsProjectsLoading] = useState(false);

    const fetchProjects = useCallback(async () => {
        setError('');
        if (!rollNumber) {
            setProjects([]);
            setHasSearched(false);
            return;
        }
        setIsProjectsLoading(true);
        setHasSearched(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/public-projects/view-by-roll?rollNumber=${encodeURIComponent(rollNumber)}`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) {
                    removeToken();
                    showToast('Your session has expired or is invalid. Please log in again.', 'error');
                    setIsProjectsLoading(false);
                    return;
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProjects(data);
            setSelectedProject(null);
            setProjectFiles([]);
            setAddFiles([{ file: null, title: '', id: 1 }]);
            setNextAddFileId(2);
        } catch (err) {
            setError(`An error occurred while fetching projects: ${err.message}`);
            setProjects([]);
            setSelectedProject(null);
        } finally {
            setIsProjectsLoading(false);
        }
    }, [rollNumber, createAuthHeaders, removeToken, showToast]);

    const fetchProjectDetails = useCallback(async (projectId) => {
        console.log('fetchProjectDetails called for projectId:', projectId);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/public-projects/${projectId}`);
            console.log('fetchProjectDetails - Response from public-projects:', response);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('fetchProjectDetails - Error data from public-projects:', errorData);
                if (response.status === 404) {
                    throw new Error('Project not found.');
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const { project, files } = await response.json();
            console.log('fetchProjectDetails - Project details fetched:', project, 'Files:', files);
            console.log('fetchProjectDetails - Fetched project.roll_number (actual owner):', project.roll_number); 
            setSelectedProject(project); 
            setProjectFiles(files);
            setAddFiles([{ file: null, title: '', id: 1 }]); 
            setNextAddFileId(2);
        } catch (err) {
            console.error('fetchProjectDetails - Error in fetchProjectDetails:', err);
            setError(`An error occurred while fetching project details: ${err.message}`);
            setSelectedProject(null); 
            setProjectFiles([]);
            if (err.message === 'Project not found.') {
                showToast('Project not found. It might have been deleted or never existed.', 'error');
                setProjects([]); 
                setHasSearched(false); 
            }
            if (err.message.includes('401') || err.message.includes('403')) {
                removeToken();
                showToast('Your session has expired or is invalid. Please log in again.', 'error');
            }
        }
    }, [removeToken, showToast]);

    const handleSelectProject = (projectId, projectName) => {
        console.log('handleSelectProject called:', projectId, projectName);
        setSelectedProject({ id: projectId, name: projectName, description: 'Loading...', roll_number: null });
        fetchProjectDetails(projectId);
    };

    const handleBackToProjectsList = () => {
        console.log('handleBackToProjectsList called.');
        setSelectedProject(null); 
        setProjectFiles([]);
        setAddFiles([{ file: null, title: '', id: 1 }]);
        setNextAddFileId(2);
        setProjects([]); 
        setHasSearched(false); 
        setRollNumber(''); 
    };

    // --- File Management Handlers ---
    const handleAddFileChange = (id, field, value) => {
        setAddFiles(prevFiles =>
            prevFiles.map(f => (f.id === id ? { ...f, [field]: value } : f))
        );
    };

    const addAddFileField = () => {
        setAddFiles(prevFiles => [...prevFiles, { file: null, title: '', id: nextAddFileId }]);
        setNextAddFileId(prevId => prevId + 1);
    };

    const removeAddFileField = (idToRemove) => {
        setAddFiles(prevFiles => prevFiles.filter(f => f.id !== idToRemove));
    };

    const handleAddFilesSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (addFiles.some(f => f.file === null || !f.title.trim())) { 
            setError('All new file fields must have a file selected and a title.');
            return;
        }
        if (!selectedProject?.id) {
            setError('No project selected to add files to.');
            return;
        }

        const formData = new FormData();
        addFiles.forEach((fileEntry) => {
            formData.append(`newProjectFiles`, fileEntry.file);
            formData.append(`fileTitle_newProjectFiles`, fileEntry.title);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/add-files/${selectedProject.id}`, {
                method: 'POST',
                headers: createFileUploadAuthHeaders(),
                body: formData
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showToast('Files added successfully!', 'success');
                fetchProjectDetails(selectedProject.id); 
            } else {
                setError(data.message || 'Error adding new files.');
                showToast(data.message || 'Error adding new files.', 'error');
            }
        } catch (err) {
            console.error('Error adding new files:', err);
            setError('An error occurred while adding new files.');
            showToast('An error occurred while adding new files.', 'error');
        }
    };

    const handleDeleteFile = (fileId) => {
        setConfirmAction({
            type: 'deleteFile',
            fileId: fileId,
            message: 'Are you sure you want to delete this file?'
        });
        setShowConfirmModal(true);
    };

    const handleReplaceFile = (fileId, fileName) => {
        setFileToReplace({ id: fileId, name: fileName });
        setShowReplaceFileModal(true);
    };

    const handleDeleteProject = () => {
        if (!selectedProject) return;
        setConfirmAction({
            type: 'deleteProject',
            projectId: selectedProject.id,
            message: `Are you sure you want to delete the project "${selectedProject.name}" and all its files? This action cannot be undone.`
        });
        setShowConfirmModal(true);
    };

    const handleEditProjectTitle = () => {
        if (!selectedProject) return;
        setShowEditTitleModal(true);
    };

    const onModalConfirm = async () => {
        setShowConfirmModal(false);
        if (confirmAction.type === 'deleteFile') {
            try {
                const response = await fetch(`${API_BASE_URL}/api/projects/delete-file/${confirmAction.fileId}`, {
                    method: 'DELETE',
                    headers: createAuthHeaders(),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    showToast(data.message || 'File deleted successfully!', 'success');
                    fetchProjectDetails(selectedProject.id); 
                } else {
                    setError(data.message || 'Error deleting file.');
                    showToast(data.message || 'Error deleting file.', 'error');
                }
            } catch (err) {
                console.error('Error deleting file:', err);
                setError('An error occurred while deleting the file.');
                showToast('An error occurred while deleting the file.', 'error');
            }
        } else if (confirmAction.type === 'deleteProject') {
            try {
                const response = await fetch(`${API_BASE_URL}/api/projects/${confirmAction.projectId}`, {
                    method: 'DELETE',
                    headers: createAuthHeaders(),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    showToast(data.message || 'Project deleted successfully!', 'success');
                    handleBackToProjectsList(); 
                } else {
                    setError(data.message || 'Error deleting project.');
                    showToast(data.message || 'Error deleting project.', 'error');
                }
            } catch (err) {
                console.error('Error deleting project:', err);
                setError('An error occurred while deleting the project.');
                showToast('An error occurred while deleting the project.', 'error');
            }
        }
        setConfirmAction(null);
    };

    const onModalCancel = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
    };

    const onEditTitleSave = (newTitle) => {
        setSelectedProject(prev => ({ ...prev, name: newTitle }));
        setShowEditTitleModal(false);
    };

    const onReplaceFileComplete = () => {
        setShowReplaceFileModal(false);
        setFileToReplace(null);
        fetchProjectDetails(selectedProject.id); 
    };

    const handleViewFile = async (filePath, originalFileName) => {
        const fileExtension = originalFileName.split('.').pop().toLowerCase();
        const codeExtensions = ['js', 'json', 'css', 'html', 'txt', 'py', 'java', 'c', 'cpp', 'sh', 'md', 'xml']; 

        if (codeExtensions.includes(fileExtension)) {
            try {
                const response = await fetch(`${API_BASE_URL}${filePath}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        showToast('File Not Found (404): Render free tier files are temporary and deleted on server restart. Please re-upload.', 'warning');
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return;
                }
                const textContent = await response.text();
                setCodeViewerContent(textContent);
                setCodeViewerLanguage(fileExtension); 
                setShowCodeViewer(true);
            } catch (error) {
                console.error('Error fetching file content for viewer:', error);
                showToast(`Error fetching file content: ${error.message}`, 'error');
            }
        } else {
            window.open(`${API_BASE_URL}${filePath}`, '_blank');
        }
    };

    const showSearchAndList = selectedProject === null;
    console.log('ViewProjectsPage - Rendering. showSearchAndList:', showSearchAndList);

    return (
        <div className="flex items-start justify-center p-5 w-full h-full mt-8">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col items-start animate-fade-in-up">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 self-center">View Projects</h1>

                {showSearchAndList ? (
                    <>
                        <form onSubmit={(e) => { e.preventDefault(); fetchProjects(); }} className="flex flex-col gap-5 w-full max-w-xs mx-auto mb-6"> 
                            <label htmlFor="viewRollNumber" className="font-semibold text-gray-700 mb-1">Enter Student Roll Number:</label>
                            <input
                                type="text"
                                id="viewRollNumber"
                                value={rollNumber}
                                onChange={(e) => setRollNumber(e.target.value)}
                                placeholder="e.g., 12345"
                                className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition mb-2"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-200 hover:bg-blue-600 mt-4"
                            >
                                View Projects
                            </button>
                        </form>

                        <div className="projects-list w-full max-w-md mt-4 self-start">
                            <h3 className="text-2xl font-bold mb-4 text-gray-800">Projects:</h3>
                            {error && <p className="text-red-500 text-base mb-4">{error}</p>}
                            {isProjectsLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                                </div>
                            ) : hasSearched && projects.length === 0 && !error ? (
                                <p className="text-gray-600">No projects found for this roll number.</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {projects.map(project => (
                                        <ProjectCard key={project.id} project={project} onSelectProject={handleSelectProject} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="project-details-section w-full animate-fade-in-up">
                            <h3 className="text-3xl font-bold mb-4 text-gray-800">{selectedProject?.name}</h3> 
                            <p className="text-gray-700 text-lg mb-6">{selectedProject?.description || ''}</p>

                            {loggedInUserRollNumber && selectedProject?.roll_number === loggedInUserRollNumber && (
                                <div className="flex flex-wrap gap-4 mb-6 justify-start">
                                    <button
                                        onClick={handleEditProjectTitle}
                                        className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                                    >
                                        Edit Title
                                    </button>
                                    <button
                                        onClick={handleDeleteProject}
                                        className="bg-red-500 text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-red-600 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            )}

                            <h4 className="text-2xl font-bold mb-4 text-gray-800">Associated Files:</h4>
                            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                            {projectFiles.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {projectFiles.map(file => (
                                        <FileItem
                                            key={file.id}
                                            file={file}
                                            projectOwnerRollNumber={selectedProject.roll_number} 
                                            loggedInUserRollNumber={loggedInUserRollNumber} 
                                            onReplace={handleReplaceFile}
                                            onDelete={handleDeleteFile}
                                            onViewFile={handleViewFile}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600">No files associated with this project.</p>
                            )}

                            {loggedInUserRollNumber && selectedProject?.roll_number === loggedInUserRollNumber && (
                                <form onSubmit={handleAddFilesSubmit} className="flex flex-col gap-5 mt-8 w-full">
                                    <h4 className="text-2xl font-bold mb-2 text-gray-800">Add New Files to this Project:</h4>
                                    <div className="flex flex-col gap-4 w-full">
                                        {addFiles.map(fileEntry => (
                                            <div key={fileEntry.id} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm w-full max-w-2xl mx-auto">
                                                <label htmlFor={`addFile${fileEntry.id}`} className="font-semibold text-gray-700 mb-1">File {fileEntry.id}:</label>
                                                <input
                                                    type="file"
                                                    id={`addFile${fileEntry.id}`}
                                                    onChange={(e) => handleAddFileChange(fileEntry.id, 'file', e.target.files[0])}
                                                    className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition w-full bg-white shadow-sm min-w-0"
                                                    required
                                                />
                                                <label htmlFor={`addFileTitle${fileEntry.id}`} className="font-semibold text-gray-700 mb-1">Title:</label>
                                                <input
                                                    type="text"
                                                    id={`addFileTitle${fileEntry.id}`}
                                                    value={fileEntry.title}
                                                    onChange={(e) => handleAddFileChange(fileEntry.id, 'title', e.target.value)}
                                                    placeholder="Enter title for this new file"
                                                    className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition w-full bg-white shadow-sm min-w-0"
                                                    required
                                                />
                                                {addFiles.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAddFileField(fileEntry.id)}
                                                        className="bg-red-500 text-white py-2 px-4 rounded-lg font-bold transition duration-200 hover:bg-red-600 mt-2 w-full md:w-auto"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addAddFileField}
                                        className="bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-bold transition duration-200 hover:bg-gray-300 self-start mt-4 mb-2"
                                    >
                                        Add New File Input
                                    </button>
                                    {error && <p className="text-red-500 text-base text-center mt-2">{error}</p>}
                                    <button
                                        type="submit"
                                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition duration-200 hover:bg-blue-600 mt-5"
                                    >
                                        Done (Add Files)
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                )}

                <div className="flex flex-wrap gap-4 mt-8 w-full justify-end">
                    {!showSearchAndList && (
                        <button
                            onClick={handleBackToProjectsList}
                            className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                        >
                            &larr; Back to Projects List
                        </button>
                    )}
                    <button
                        onClick={onNavigateToWelcome}
                        className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                    >
                        Back to Welcome
                    </button>
                </div>
            </div>

            {showConfirmModal && (
                <CustomConfirmModal
                    message={confirmAction?.message}
                    onConfirm={onModalConfirm}
                    onCancel={onModalCancel}
                />
            )}
            {showEditTitleModal && selectedProject && (
                <EditTitleModal
                    projectId={selectedProject.id}
                    currentTitle={selectedProject.name}
                    onClose={() => setShowEditTitleModal(false)}
                    onSave={onEditTitleSave}
                />
            )}
            {showReplaceFileModal && fileToReplace && (
                <ReplaceFileModal
                    fileId={fileToReplace.id}
                    currentFileName={fileToReplace.name}
                    onClose={() => setShowReplaceFileModal(false)}
                    onReplace={onReplaceFileComplete}
                />
            )}
            {showCodeViewer && (
                <CodeViewerModal
                    content={codeViewerContent}
                    language={codeViewerLanguage}
                    onClose={() => setShowCodeViewer(false)}
                />
            )}
        </div>
    );
};


const CreateProjectPage = ({ onNavigateToWelcome }) => {
    const { createAuthHeaders, createFileUploadAuthHeaders, userDetails, isAuthLoading } = useContext(AuthContext);
    const { showToast } = useToast();

    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [files, setFiles] = useState([{ file: null, title: '', id: 1 }]);
    const [nextFileId, setNextFileId] = useState(2);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && !userDetails) {
            showToast('User details not loaded. Please log in again.', 'error');
            onNavigateToWelcome(); 
        }
    }, [userDetails, isAuthLoading, onNavigateToWelcome, showToast]);


    const handleFileChange = (id, field, value) => {
        setFiles(prevFiles =>
            prevFiles.map(f => (f.id === id ? { ...f, [field]: value } : f))
        );
    };

    const addFileField = () => {
        setFiles(prevFiles => [...prevFiles, { file: null, title: '', id: nextFileId }]);
        setNextFileId(prevId => prevId + 1);
    };

    const removeFileField = (idToRemove) => {
        setFiles(prevFiles => prevFiles.filter(f => f.id !== idToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!projectName.trim()) {
            setError('Project name is required.');
            setIsLoading(false);
            return;
        }

        const hasValidFile = files.some(f => f.file !== null && f.title.trim() !== '');
        if (!hasValidFile) {
            setError('At least one file with a title must be uploaded.');
            setIsLoading(false);
            return;
        }
        if (files.some(f => (f.file === null && f.title.trim() !== '') || (f.file !== null && f.title.trim() === ''))) {
            setError('All file inputs must have both a file and a title.');
            setIsLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('name', projectName);
        formData.append('description', projectDescription);

        files.forEach((fileEntry) => {
            if (fileEntry.file && fileEntry.title.trim()) { 
                formData.append(`projectFiles`, fileEntry.file); 
                formData.append(`fileTitle_projectFiles`, fileEntry.title); 
            }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/create`, {
                method: 'POST',
                headers: createFileUploadAuthHeaders(), 
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('Project created successfully!', 'success');
                onNavigateToWelcome();
            } else {
                setError(data.message || 'Project creation failed.');
                showToast(data.message || 'Project creation failed.', 'error');
            }
        } catch (err) {
            console.error('Error creating project:', err);
            setError('An error occurred during project creation.');
            showToast('An error occurred during project creation.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-start justify-center p-5 w-full h-full mt-8">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col items-center animate-fade-in-up">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Create New Project</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-lg mx-auto"> 
                    <label htmlFor="projectName" className="font-semibold text-gray-700 mb-1">Project Name:</label>
                    <input
                        type="text"
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        required
                    />

                    <label htmlFor="projectDescription" className="font-semibold text-gray-700 mb-1">Project Description (Optional):</label>
                    <textarea
                        id="projectDescription"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        rows="4"
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-y"
                    ></textarea>

                    <h3 className="text-2xl font-bold mb-4 text-gray-800">Files:</h3> 
                    <div className="flex flex-col gap-4 w-full">
                        {files.map(fileEntry => (
                            <div key={fileEntry.id} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm w-full max-w-2xl mx-auto">
                                <label htmlFor={`file${fileEntry.id}`} className="font-semibold text-gray-700 mb-1">File {fileEntry.id}:</label>
                                <input
                                    type="file"
                                    id={`file${fileEntry.id}`}
                                    onChange={(e) => handleFileChange(fileEntry.id, 'file', e.target.files[0])}
                                    className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition w-full bg-white shadow-sm min-w-0"
                                    required
                                />
                                <label htmlFor={`fileTitle${fileEntry.id}`} className="font-semibold text-gray-700 mb-1">Title:</label>
                                <input
                                    type="text"
                                    id={`fileTitle${fileEntry.id}`}
                                    value={fileEntry.title}
                                    onChange={(e) => handleFileChange(fileEntry.id, 'title', e.target.value)}
                                    placeholder="Enter title for this file"
                                    className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition w-full bg-white shadow-sm min-w-0"
                                    required
                                />
                                {files.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeFileField(fileEntry.id)}
                                        className="bg-red-500 text-white py-2 px-4 rounded-lg font-bold transition duration-200 hover:bg-red-600 mt-2 w-full md:w-auto"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addFileField}
                        className="bg-gray-400 text-gray-800 py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-gray-500 shadow-xl hover:shadow-2xl self-start mt-4 mb-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                    >
                        Add Another File Input
                    </button>

                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl mt-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Project...' : 'Create Project'}
                    </button>
                </form>
                <button
                    onClick={onNavigateToWelcome}
                    className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg mt-6 w-full max-w-[150px] mx-auto focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                >
                    Back to Welcome
                </button>
            </div>
        </div>
    );
};


// NEW: Splash Video Component
const SplashVideo = ({ onVideoEnd }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        const timer = setTimeout(() => {
            onVideoEnd();
        }, 4000);
        const handleVideoEnded = () => {
            clearTimeout(timer);
            onVideoEnd();
        };
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener('ended', handleVideoEnded);
            videoElement.play().catch(() => {});
        }
        return () => {
            if (videoElement) {
                videoElement.removeEventListener('ended', handleVideoEnded);
            }
            clearTimeout(timer);
        };
    }, [onVideoEnd]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#E1E1E1' }}>
            <video
                ref={videoRef}
                src="/video.mp4"
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain sm:object-cover" // object-contain for mobile, object-cover for desktop
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

// NEW: Password Input Component with Eye Toggle
const PasswordInput = ({ id, value, onChange, placeholder, required = true }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative w-full">
            <input
                type={showPassword ? "text" : "password"}
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="p-3 pr-10 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition w-full"
                required={required}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 focus:outline-none"
                tabIndex={-1}
                style={{ padding: 0 }}
            >
                {showPassword ? (
                    // Eye Off (Heroicons outline, 20x20)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                ) : (
                    // Eye (Heroicons outline, 20x20)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

// NEW: Skeleton Loading Components
const SkeletonCard = () => (
    <div className="bg-gray-100 p-4 rounded-xl shadow-lg animate-pulse">
        <div className="h-6 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
    </div>
);

const SkeletonFileItem = () => (
    <div className="flex flex-row flex-wrap items-center gap-2 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-lg w-full animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-16"></div>
        <div className="h-4 bg-gray-300 rounded flex-grow"></div>
        <div className="flex gap-2">
            <div className="h-8 bg-gray-300 rounded w-16"></div>
            <div className="h-8 bg-gray-300 rounded w-20"></div>
            <div className="h-8 bg-gray-300 rounded w-16"></div>
        </div>
    </div>
);

// NEW: Loading Spinner Component
const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => (
    <div className="flex flex-col items-center justify-center py-8">
        <svg className={`animate-spin text-blue-500 ${size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        {text && <p className="mt-2 text-gray-600">{text}</p>}
    </div>
);

// NEW: Enhanced Form Validation Hook
const useFormValidation = (initialState, validationRules) => {
    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateField = useCallback((name, value) => {
        const rules = validationRules[name];
        if (!rules) return '';

        for (const rule of rules) {
            if (rule.required && !value) {
                return rule.message || `${name} is required`;
            }
            if (rule.pattern && !rule.pattern.test(value)) {
                return rule.message || `${name} format is invalid`;
            }
            if (rule.minLength && value.length < rule.minLength) {
                return rule.message || `${name} must be at least ${rule.minLength} characters`;
            }
            if (rule.maxLength && value.length > rule.maxLength) {
                return rule.message || `${name} must be less than ${rule.maxLength} characters`;
            }
            if (rule.custom) {
                const customError = rule.custom(value, formData);
                if (customError) return customError;
            }
        }
        return '';
    }, [validationRules, formData]);

    const handleChange = useCallback((name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }, [touched, validateField]);

    const handleBlur = useCallback((name) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, formData[name]);
        setErrors(prev => ({ ...prev, [name]: error }));
    }, [validateField, formData]);

    const validateForm = useCallback(() => {
        const newErrors = {};
        Object.keys(validationRules).forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) newErrors[field] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [validationRules, validateField, formData]);

    return {
        formData,
        errors,
        touched,
        handleChange,
        handleBlur,
        validateForm,
        setFormData
    };
};

// NEW: Enhanced Input Component with Validation
const ValidatedInput = ({ 
    id, 
    label, 
    type = 'text', 
    value, 
    onChange, 
    onBlur, 
    error, 
    touched, 
    required = false,
    placeholder,
    className = ''
}) => {
    const inputClass = `p-3 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white shadow-sm ${className} ${
        error && touched ? 'border-red-500' : 'border-gray-300'
    }`;

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="font-semibold text-gray-700 text-base">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {type === 'password' ? (
                <PasswordInput
                    id={id}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    required={required}
                    className={inputClass}
                />
            ) : (
                <input
                    type={type}
                    id={id}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={inputClass}
                    required={required}
                />
            )}
            {error && touched && (
                <p className="text-red-500 text-sm animate-fade-in">{error}</p>
            )}
        </div>
    );
};

// NEW: Search and Filter Components
const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
    <div className="relative w-full">
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white shadow-sm"
        />
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    </div>
);

const FilterDropdown = ({ value, onChange, options, placeholder = "Filter by..." }) => (
    <select
        value={value}
        onChange={onChange}
        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white shadow-sm"
    >
        <option value="">{placeholder}</option>
        {options.map(option => (
            <option key={option.value} value={option.value}>
                {option.label}
            </option>
        ))}
    </select>
);

// NEW: File Upload Components with Progress
const FileUploadArea = ({ onFileSelect, multiple = false, accept = "*", children }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        onFileSelect(multiple ? files : files[0]);
    };

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-gray-600 mb-2">
                Drag and drop files here, or{' '}
                <label className="text-blue-500 hover:text-blue-700 cursor-pointer">
                    browse
                    <input
                        type="file"
                        multiple={multiple}
                        accept={accept}
                        onChange={(e) => onFileSelect(multiple ? Array.from(e.target.files) : e.target.files[0])}
                        className="hidden"
                    />
                </label>
            </p>
            {children}
        </div>
    );
};

const UploadProgress = ({ progress, fileName }) => (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
        ></div>
    </div>
);

// NEW: Enhanced File Management
const FileManager = ({ files, onFileSelect, onFileRemove, maxFiles = 10 }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleFileSelect = (newFiles) => {
        const fileArray = Array.isArray(newFiles) ? newFiles : [newFiles];
        const validFiles = fileArray.filter(file => {
            const isValid = file && file.size > 0;
            const isDuplicate = selectedFiles.some(existing => 
                existing.name === file.name && existing.size === file.size
            );
            return isValid && !isDuplicate;
        });

        if (selectedFiles.length + validFiles.length > maxFiles) {
            alert(`Maximum ${maxFiles} files allowed`);
            return;
        }

        const updatedFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(updatedFiles);
        onFileSelect(updatedFiles);
    };

    const handleFileRemove = (index) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
        onFileSelect(updatedFiles);
    };

    return (
        <div className="space-y-4">
            <FileUploadArea onFileSelect={handleFileSelect} multiple={true}>
                <p className="text-sm text-gray-500">
                    Maximum {maxFiles} files allowed
                </p>
            </FileUploadArea>
            
            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold text-gray-700">Selected Files:</h4>
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleFileRemove(index)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// NEW: Dark Mode Context and Hook
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => !prev);
    }, []);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// NEW: Theme Toggle Button
const ThemeToggle = () => {
    const { isDarkMode, toggleDarkMode } = useTheme();

    return (
        <button
            onClick={toggleDarkMode}
            className="fixed top-4 left-4 z-40 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-600"
            aria-label="Toggle dark mode"
        >
            {isDarkMode ? (
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
            )}
        </button>
    );
};

// NEW: Dynamic Advertisement Component
const DynamicAdContainer = ({ adConfig, currentPage }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageAspectRatio, setImageAspectRatio] = useState(1.41); // Default aspect ratio
    const currentAd = adConfig[currentPage] || adConfig.login;

    // Preload image for faster loading
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            setImageAspectRatio(aspectRatio);
            setImageLoaded(true);
        };
        img.src = currentAd.src;
    }, [currentAd.src]);

    const handleImageLoad = (event) => {
        const img = event.target;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        setImageAspectRatio(aspectRatio);
        setImageLoaded(true);
    };

    // Calculate container height based on aspect ratio
    const getContainerHeight = () => {
        const maxWidth = 672; // max-w-2xl
        const mobileMaxHeight = 128; // h-32
        const desktopMaxHeight = 480; // md:h-[480px]
        
        // Calculate ideal height based on image aspect ratio
        const idealHeight = maxWidth / imageAspectRatio;
        
        // For mobile: cap at mobileMaxHeight
        const mobileHeight = Math.min(idealHeight, mobileMaxHeight);
        // For desktop: cap at desktopMaxHeight
        const desktopHeight = Math.min(idealHeight, desktopMaxHeight);
        
        return {
            mobile: mobileHeight,
            desktop: desktopHeight
        };
    };

    const heights = getContainerHeight();

    return (
        <>
            {/* Mobile Version */}
            <div className="block md:hidden w-full">
                <div className="w-full flex justify-center p-0">
                    <div 
                        className="rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 w-full max-w-2xl overflow-hidden"
                        style={{ height: `${heights.mobile}px` }}
                    >
                        <a href={currentAd.href} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img
                                src={currentAd.src}
                                alt={currentAd.alt}
                                className="w-full h-full object-contain transition-all duration-300"
                                loading="eager"
                                onLoad={handleImageLoad}
                                style={{ objectPosition: 'center' }}
                                decoding="async"
                            />
                        </a>
                    </div>
                </div>
            </div>

            {/* Desktop Version */}
            <div className="hidden md:block w-full">
                <div className="w-full flex justify-center p-0">
                    <div 
                        className="rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 w-full max-w-2xl overflow-hidden"
                        style={{ height: `${heights.desktop}px` }}
                    >
                        <a href={currentAd.href} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img
                                src={currentAd.src}
                                alt={currentAd.alt}
                                className="w-full h-full object-contain transition-all duration-300"
                                loading="eager"
                                onLoad={handleImageLoad}
                                style={{ objectPosition: 'center' }}
                                decoding="async"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};

// Main App component
function App() { 
    const getInitialPage = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('state') === 'resetPassword' && params.get('token')) {
            return 'resetPassword';
        }
        return 'login';
    };

    const [currentPage, setCurrentPage] = useState(getInitialPage);
    const [resetTokenFromUrl, setResetTokenFromUrl] = useState('');
    const { token, fetchUserDetails, userDetails, isAuthLoading } = useContext(AuthContext); 

    // New state for splash screen
    const [showSplash, setShowSplash] = useState(true);

    // Effect to hide splash after 4 seconds, or when video ends
    const handleVideoEnd = useCallback(() => {
        setShowSplash(false);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tokenInUrl = params.get('token');
        if (tokenInUrl) {
            setResetTokenFromUrl(tokenInUrl);
        }

        // Only navigate to welcome if logged in AND splash screen is done
        if (token && !isAuthLoading && userDetails && !showSplash) {
            if (currentPage === 'login' || currentPage === 'register' || currentPage === 'forgotPassword' || currentPage === 'resetPassword') {
                setCurrentPage('welcome');
            }
        } else if (token && !userDetails && !isAuthLoading) {
            fetchUserDetails(); 
        } else if (!token && !showSplash) { // Only redirect to login if no token AND splash is done
            if (currentPage !== 'resetPassword' && currentPage !== 'register' && currentPage !== 'forgotPassword') {
                setCurrentPage('login');
            }
        }
    }, [token, fetchUserDetails, userDetails, isAuthLoading, currentPage, showSplash]); 


    const navigate = useCallback((page, token = null) => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('state');
        currentUrl.searchParams.delete('token');

        if (page === 'resetPassword' && token) {
            currentUrl.searchParams.set('state', 'resetPassword');
            currentUrl.searchParams.set('token', token);
            setResetTokenFromUrl(token);
        } else {
            setResetTokenFromUrl('');
        }
        window.history.pushState({}, '', currentUrl);
        setCurrentPage(page);
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'login':
                return (
                    <LoginPage onLoginSuccess={() => setCurrentPage('welcome')} onNavigateToRegister={() => navigate('register')} onNavigateToForgotPassword={() => navigate('forgotPassword')} />
                );
            case 'register':
                return <RegisterPage onRegisterSuccess={() => navigate('login')} onNavigateToLogin={() => navigate('login')} />;
            case 'forgotPassword':
                return <ForgotPasswordPage onNavigateToLogin={() => navigate('login')} onNavigateToResetPasswordWithToken={(token) => navigate('resetPassword', token)} />;
            case 'resetPassword':
                return <ResetPasswordPage onNavigateToLogin={() => navigate('login')} initialToken={resetTokenFromUrl} />;
            case 'welcome':
                return (
                    <WelcomePage
                        onNavigateToCreateProject={() => navigate('createProject')}
                        onNavigateToViewProjects={() => navigate('viewProjects')}
                        onNavigateToSuggestions={() => setCurrentPage('suggestions')}
                    />
                );
            case 'suggestions':
                return <SuggestionsPage onNavigateToWelcome={() => setCurrentPage('welcome')} />;
            case 'createProject':
                return <CreateProjectPage onNavigateToWelcome={() => navigate('welcome')} />; 
            case 'viewProjects':
                return <ViewProjectsPage onNavigateToWelcome={() => navigate('welcome')} />;
            case 'privacyPolicy':
                return <PrivacyPolicyPage onNavigateToLogin={() => navigate('login')} />;
            default:
                return <LoginPage onLoginSuccess={() => setCurrentPage('welcome')} onNavigateToRegister={() => navigate('register')} onNavigateToForgotPassword={() => navigate('forgotPassword')} />;
        }
    };

    // Ad configuration for each page
    const adConfig = {
        login: {
            href: 'https://ad-link-login.com',
            src: 'boy.pngg',
            alt: 'Login Advertisement',
        },
        welcome: {
            href: 'https://ad-link-welcome.com',
            src: 'girl.pngg',
            alt: 'Welcome Advertisement',
        },
        createProject: {
            href: 'https://ad-link-create.com',
            src: 'https://via.placeholder.com/600x600',
            alt: 'Create Project Advertisement',
        },
        viewProjects: {
            href: 'https://ad-link-view.com',
            src: 'https://via.placeholder.com/600x600',
            alt: 'View Projects Advertisement',
        },
    };

    // Pick ad config for current page, fallback to login ad
    const currentAd = adConfig[currentPage] || adConfig.login;

    // What we do section images and text
    const whatWeDoImages = [
        {
            src: 'what1.jpg',
            alt: 'Showcase Projects',
            desc: 'Showcase your best projects and get discovered by recruiters and peers.',
        },
        {
            src: 'what2.jpg',
            alt: 'Collaborate',
            desc: 'Collaborate with others, share files, and work as a team on innovative ideas.',
        },
        {
            src: 'what3.jpg',
            alt: 'Track Progress',
            desc: 'Track your project progress and keep your portfolio up to date easily.',
        },
    ];

    // How to use steps
    const howToUseSteps = [
        {
            step: 1,
            title: 'Register & Login',
            desc: 'Create your account, log in, and set up your profile to get started with your project portfolio.'
        },
        {
            step: 2,
            title: 'Create & Upload',
            desc: 'Create new projects, upload files, and describe your work. Collaborate with your team easily.'
        },
        {
            step: 3,
            title: 'Share & Track',
            desc: 'Share your portfolio rollnumber, get feedback, and track your project progress anytime, anywhere.'
        }
    ];

    // Data for new sections
    const testimonials = [
        {
            quote: "This platform transformed how I showcase my work. The interface is clean, and I've gotten great feedback from recruiters!",
            name: "Jane Doe",
            title: "Software Engineering Student",
            image: 'https://i.pravatar.cc/100?u=a042581f4e29026704d'
        },
        {
            quote: "A must-have for any student in tech. It's the easiest way to build a professional portfolio and get your projects seen.",
            name: "John Smith",
            title: "Computer Science Major",
            image: 'https://i.pravatar.cc/100?u=a042581f4e29026705d'
        },
        {
            quote: "I love how simple it is to upload and manage my projects. The collaboration features are a huge plus for team projects.",
            name: "Samantha Lee",
            title: "UX/UI Design Student",
            image: 'https://i.pravatar.cc/100?u=a042581f4e29026706d'
        },
    ];

    return (
        <ThemeProvider>
            <ToastProvider>
                <div className="bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] min-h-screen w-full">
                    {showSplash ? (
                        <SplashVideo onVideoEnd={handleVideoEnd} />
                    ) : (
                        <>
                            <NavigationBar currentPage={currentPage} onNavigate={navigate} />
                            <div className="min-h-screen w-full font-sans bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526]">

                                {/* Mobile: ad + login stacked; Desktop: split */}
                                <div className="block md:hidden w-full">
                                    {/* Ad at top */}
                                    <DynamicAdContainer adConfig={adConfig} currentPage={currentPage} />
                                    {/* Small gap */}
                                    <div className="w-full p-1"></div>
                                    {/* Login page (or currentPage) */}
                                    <div className="w-full max-w-sm mx-auto">
                                        {renderPage()}
                                    </div>
                                </div>
                                {/* Desktop: split layout as before */}
                                <div className="hidden md:flex min-h-screen flex-row w-full">
                                    {/* Left: title image, slogan and ad */}
                                    <div className="w-1/2 px-6 md:px-12 pt-[15px] pb-6 flex flex-col relative min-h-screen justify-between items-center md:items-start">
                                        <header className="flex flex-col items-center md:items-start mt-0 mb-0 sm:mt-2 sm:mb-8 w-full p-0">
                                            <img 
                                                src="/tite.png" 
                                                alt="kroxnest." 
                                                className="hidden sm:block h-16 sm:h-20 md:h-24 lg:h-28 w-auto max-w-full mb-4 drop-shadow-2xl filter invert transition-all duration-500 ease-in-out mx-auto md:mx-0"
                                                style={{ maxWidth: '100%', objectFit: 'contain' }}
                                                loading="eager"
                                            />
                                            <p className="hidden sm:block text-xs sm:text-sm md:text-base text-white italic pl-2 mt-2 text-center md:text-left font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg w-full max-w-3xl mx-auto md:mx-0" style={{ fontFamily: 'Inter, sans-serif' }}>
                                                Knowledge Repository Of eXhibits & Networked Educational Student Tracks
                                            </p>
                                        </header>
                                        <div className="mt-8 w-full flex justify-center p-0">
                                            <DynamicAdContainer adConfig={adConfig} currentPage={currentPage} />
                                        </div>
                                    </div>
                                    {/* Right: content (login, register, etc.) */}
                                    <div className="w-1/2 flex justify-center items-start pt-[60px] px-0">
                                        <div className={
                                            currentPage === 'login'
                                                ? 'w-full max-w-sm sm:max-w-md mx-auto'
                                                : 'w-full max-w-4xl flex flex-col items-center'
                                        }>
                                            <div className={currentPage === 'login' ? 'w-full flex flex-col items-center' : 'w-full'}>
                                                {renderPage()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* How to use section */}
                            <div className="w-full py-12 px-0" data-section="how-to-use">
                                <div className="w-full flex flex-col items-start px-2 sm:px-6 md:px-12 max-w-7xl mx-auto">
                                    <h2 className="text-4xl font-extrabold text-white mb-2 text-left drop-shadow-lg relative inline-block">
                                        How to Use
                                    </h2>
                                    <div className="w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full mb-8 animate-pulse"></div>
                                </div>
                                <div className="flex flex-row gap-4 w-full px-2 sm:px-6 md:px-12 max-w-7xl mx-auto overflow-x-auto snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-8 sm:overflow-x-visible">
                                    {howToUseSteps.map((step, idx) => (
                                        <div key={idx} className="flex flex-col items-center bg-gradient-to-br from-white via-blue-50 to-purple-100 rounded-3xl shadow-2xl p-6 md:p-10 min-w-[260px] sm:min-w-0 snap-center transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full mx-2 sm:mx-0 h-auto group">
                                            <div className="border-4 border-white rounded-2xl mb-6 flex flex-col items-center justify-center p-2 shadow-lg w-full max-w-[320px] mx-auto bg-gradient-to-tr from-blue-100 via-white to-purple-100 group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300">
                                                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-3xl font-bold mt-8 shadow-md mb-4 group-hover:scale-110 transition-transform duration-300">{step.step}</div>
                                                <h3 className="text-xl font-bold text-blue-600 mt-2 mb-2 text-center break-words w-full">{step.title}</h3>
                                                <p className="text-gray-600 text-lg text-center px-2 break-words w-full whitespace-pre-line">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* What we do section */}
                            <div className="w-full py-12 px-0" data-section="what-we-do">
                                <div className="w-full flex flex-col items-start px-2 sm:px-6 md:px-12 max-w-7xl mx-auto">
                                    <h2 className="text-4xl font-extrabold text-white mb-2 text-left drop-shadow-lg relative inline-block">
                                        What We Do
                                    </h2>
                                    <div className="w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full mb-8 animate-pulse"></div>
                                </div>
                                <div className="flex flex-row gap-4 w-full px-2 sm:px-6 md:px-12 max-w-7xl mx-auto overflow-x-auto snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-8 sm:overflow-x-visible">
                                    {whatWeDoImages.map((item, idx) => (
                                        <div key={idx} className="flex flex-col items-center bg-gradient-to-br from-white via-blue-50 to-purple-100 rounded-3xl shadow-2xl p-6 md:p-10 min-w-[260px] sm:min-w-0 snap-center transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full mx-2 sm:mx-0 h-auto group">
                                            <div className="border-4 border-white rounded-2xl mb-6 flex flex-col items-center justify-center p-2 shadow-lg w-full max-w-[320px] mx-auto bg-gradient-to-tr from-blue-100 via-white to-purple-100 group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300">
                                                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-3xl font-bold mt-8 shadow-md mb-4 group-hover:scale-110 transition-transform duration-300">{idx + 1}</div>
                                                <h3 className="text-xl font-bold text-blue-600 mt-2 mb-2 text-center break-words w-full">{item.alt}</h3>
                                                <p className="text-gray-600 text-lg text-center px-2 break-words w-full whitespace-pre-line font-normal">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer centered at the bottom of the entire page, not fixed */}
                            <footer className="w-full flex flex-col items-center justify-center py-8 px-2 gap-1 text-center mt-16">
                                <div>
                                    <span className="text-gray-300 text-lg mr-6">Contact: <a href="tel:+1234567890" className="underline hover:text-blue-400 transition-colors">+1 234 567 890</a> | <a href="mailto:dummy@email.com" className="underline hover:text-blue-400 transition-colors">info@kroxnest.com</a></span>
                                </div>
                                <div>
                                    <span className="block text-gray-300 text-xl font-semibold">© 2025 Kroxnest. All rights reserved.|Ashi</span>
                                </div>
                            </footer>
                        </>
                    )}
                </div>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
