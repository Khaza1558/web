import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
// IMPORTANT: style.css is linked directly in public/index.html to avoid import issues.
// Do NOT uncomment the line below:
// import './style.css'; 

// --- Context for Authentication ---
const AuthContext = createContext(null); 

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
    const modalRef = useRef(null);
    useEffect(() => {
        if (modalRef.current) {
            const computedStyle = window.getComputedStyle(modalRef.current);
            console.log('CustomConfirmModal - Initial Opacity:', computedStyle.opacity);
            console.log('CustomConfirmModal - Initial Display:', computedStyle.display);
            setTimeout(() => {
                const updatedStyle = window.getComputedStyle(modalRef.current);
                console.log('CustomConfirmModal - After 100ms Opacity:', updatedStyle.opacity);
                console.log('CustomConfirmModal - After 100ms Display:', updatedStyle.display);
            }, 100);
        }
    }, []);

    return (
        <div ref={modalRef} className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <p className="mb-6 text-gray-800 text-lg font-medium">{message}</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onConfirm}
                        className="bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-blue-600 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Yes
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-400 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-500 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
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
    const [newTitle, setNewTitle] = useState(currentTitle);
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (modalRef.current) {
            const computedStyle = window.getComputedStyle(modalRef.current);
            console.log('EditTitleModal - Initial Opacity:', computedStyle.opacity);
            console.log('EditTitleModal - Initial Display:', computedStyle.display);
            setTimeout(() => {
                const updatedStyle = window.getComputedStyle(modalRef.current);
                console.log('EditTitleModal - After 100ms Opacity:', updatedStyle.opacity);
                console.log('EditTitleModal - After 100ms Display:', updatedStyle.display);
            }, 100);
        }
    }, []);

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
                alert(data.message || 'Project title updated successfully!');
                onSave(newTitle); // Pass new title back to parent
            } else {
                setError(data.message || 'Error updating project title.');
                alert(data.message || 'Error updating project title.'); // Use alert for critical feedback
            }
        } catch (err) {
            console.error('Error updating project title:', err);
            setError('An error occurred while updating the project title.');
            alert('An error occurred while updating the project title.');
        }
    };

    return (
        <div ref={modalRef} className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Edit Project Title</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="newProjectTitle" className="font-semibold text-gray-700">New Project Title:</label>
                    <input
                        type="text"
                        id="newProjectTitle"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-blue-600 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-400 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-500 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
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
    const [newFileName, setNewFileName] = useState(currentFileName);
    const [newFile, setNewFile] = useState(null);
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (modalRef.current) {
            const computedStyle = window.getComputedStyle(modalRef.current);
            console.log('ReplaceFileModal - Initial Opacity:', computedStyle.opacity);
            console.log('ReplaceFileModal - Initial Display:', computedStyle.display);
            setTimeout(() => {
                const updatedStyle = window.getComputedStyle(modalRef.current);
                console.log('ReplaceFileModal - After 100ms Opacity:', updatedStyle.opacity);
                console.log('ReplaceFileModal - After 100ms Display:', updatedStyle.display);
            }, 100);
        }
    }, []);

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
                alert(data.message || 'File replaced successfully!');
                onReplace(); // Notify parent to refresh
            } else {
                setError(data.message || 'Error replacing file.');
                alert(data.message || 'Error replacing file.');
            }
        } catch (err) {
            console.error('Error replacing file:', err);
            setError('An error occurred while replacing the file.');
            alert('An error occurred while replacing the file.');
        }
    };

    return (
        <div ref={modalRef} className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Replace File</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="newFileName" className="font-semibold text-gray-700">New File Name:</label>
                    <input
                        type="text"
                        id="newFileName"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    <label htmlFor="newFileInput" className="font-semibold text-gray-700">Upload New File:</label>
                    <input
                        type="file"
                        id="newFileInput"
                        onChange={(e) => setNewFile(e.target.files[0])}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-blue-600 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-400 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-500 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
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
    const modalRef = useRef(null);

    useEffect(() => {
        if (modalRef.current) {
            const computedStyle = window.getComputedStyle(modalRef.current);
            console.log('CodeViewerModal - Initial Opacity:', computedStyle.opacity);
            console.log('CodeViewerModal - Initial Display:', computedStyle.display);
            setTimeout(() => {
                const updatedStyle = window.getComputedStyle(modalRef.current);
                console.log('CodeViewerModal - After 100ms Opacity:', updatedStyle.opacity);
                console.log('CodeViewerModal - After 100ms Display:', updatedStyle.display);
            }, 100);
        }
    }, []);

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
            loadStylesheet('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'); 
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', () => {
                highlightCode(); 
            });
        }
    }, [content, language]); 

    return (
        <div ref={modalRef} className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-4xl w-full h-4/5 flex flex-col transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <h3 className="text-xl font-bold mb-4 text-center text-gray-800">Code Viewer</h3>
                <div className="flex-grow overflow-auto rounded-lg bg-gray-800 p-4 text-sm scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                    <pre>
                        <code ref={codeRef} className={`language-${language || 'plaintext'}`}>
                            {content}
                        </code>
                    </pre>
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-400 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-500 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// NEW: ProjectCard Component
const ProjectCard = ({ project, onSelectProject }) => {
    return (
        <div
            className="bg-gray-100 p-4 rounded-xl shadow-lg hover:bg-gray-200 transition duration-200 cursor-pointer" 
            onClick={() => onSelectProject(project.id, project.name)}
        >
            <h4 className="text-xl font-bold text-gray-800 mb-2">{project.name}</h4>
            <p className="text-gray-600 text-sm">{project.description}</p>
        </div>
    );
};


// --- Page Components ---

const LoginPage = ({ onLoginSuccess, onNavigateToRegister, onNavigateToForgotPassword }) => {
    const { setToken } = useContext(AuthContext); 
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
                onLoginSuccess();
            } else {
                setError(data.message || 'Login failed. Please check your credentials.');
                alert(data.message || 'Login failed. Please check your credentials.');
                setShowForgotPassword(true);
            }
        } catch (err) {
            console.error('Error during login:', err);
            setError('An error occurred. Please try again.');
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center p-5 w-full h-full">
            <div
                className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center animate-fade-in-up relative"
                style={{ width: 450, height: 450, minWidth: 450, minHeight: 450 }}
            >
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Login</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xs flex-grow">
                    <label htmlFor="loginUsername" className="font-semibold text-gray-700 mb-1">Username:</label> 
                    <input
                        type="text"
                        id="loginUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        required
                    />

                    <label htmlFor="loginPassword" className="font-semibold text-gray-700 mb-1">Password:</label> 
                    <PasswordInput
                        id="loginPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 mt-4" 
                    >
                        Login
                    </button>
                </form>
                {showForgotPassword && ( 
                    <p className="mt-4 text-gray-700">
                        <a href="#" onClick={onNavigateToForgotPassword} className="text-blue-500 font-semibold hover:underline">
                            Forgot Password?
                        </a>
                    </p>
                )}
                {/* Register link always at the bottom, inside the card */}
                <div className="absolute bottom-6 left-0 w-full flex justify-center">
                    <p className="text-gray-700 text-base text-center">
                        Don't have an account?{' '}
                        <a href="#" onClick={onNavigateToRegister} className="text-blue-500 font-semibold hover:underline">
                            Register here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

const RegisterPage = ({ onRegisterSuccess, onNavigateToLogin }) => {
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
            alert('Passwords do not match!');
            return;
        }

        if (!validateMobileNumber(formData.mobileNumber)) {
            setError('Please enter a valid 10-digit mobile number.');
            alert('Please enter a valid 10-digit mobile number.');
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
                alert('Registration successful! You can now log in.');
                onRegisterSuccess();
            } else {
                setError(data.message || 'Registration failed. Please try again.');
                alert(data.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Error during registration:', err);
            setError('An error occurred during registration. Please try again.');
            alert('An error occurred during registration. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center p-5 w-full h-full">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col items-center animate-fade-in-up">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Register</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-lg mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2"> 
                        <label htmlFor="email" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Email:</label>
                        <input type="email" id="email" value={formData.email} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="username" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Username:</label>
                        <input type="text" id="username" value={formData.username} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="password" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Password:</label>
                        <div className="flex-grow">
                            <PasswordInput
                                id="password"
                                value={formData.password}
                                onChange={(e) => handleChange(e)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="reEnterPassword" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Re-enter Password:</label>
                        <div className="flex-grow">
                            <PasswordInput
                                id="reEnterPassword"
                                value={formData.reEnterPassword}
                                onChange={(e) => handleChange(e)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="collegeName" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">College Name:</label>
                        <input type="text" id="collegeName" value={formData.collegeName} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="branch" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Branch:</label>
                        <input type="text" id="branch" value={formData.branch} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="rollNumber" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Roll Number:</label>
                        <input type="text" id="rollNumber" value={formData.rollNumber} onChange={handleChange}
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow" required />
                    </div>

                    {/* Mobile Number Field */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <label htmlFor="mobileNumber" className="font-semibold text-gray-700 text-sm sm:w-1/4 flex-shrink-0">Mobile Number:</label>
                        <input
                            type="tel"
                            id="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            placeholder="Enter 10-digit mobile number"
                            pattern="[0-9]{10}"
                            className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl mt-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Register
                    </button>
                </form>
                <p className="mt-6 text-gray-700 text-base">
                    Already have an account?{' '}
                    <a href="#" onClick={onNavigateToLogin} className="text-blue-500 font-semibold hover:underline">
                        Login here
                    </a>
                </p>
            </div>
        </div>
    );
};

// NEW: Forgot Password Request Page
const ForgotPasswordPage = ({ onNavigateToLogin, onNavigateToResetPasswordWithToken }) => {
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
            alert('Token copied to clipboard!');
        }
    };

    return (
        <div className="flex items-center justify-center p-5 w-full h-full"> {/* Added h-full to help centering */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center animate-fade-in-up"> 
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Forgot Password</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xs"> 
                    <p className="text-center text-gray-700 mb-4">Enter your username to receive a password reset token.</p>
                    <label htmlFor="username" className="font-semibold text-gray-700 mb-1">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl mt-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Request Reset Token
                    </button>
                </form>

                {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
                {message && <p className="text-green-500 text-sm text-center mt-4">{message}</p>}

                {resetTokenInfo && (
                    <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg w-full max-w-xs mx-auto text-center animate-fade-in">
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

                <p className="mt-6 text-gray-700 text-base">
                    Remembered your password?{' '}
                    <a href="#" onClick={onNavigateToLogin} className="text-blue-500 font-semibold hover:underline">
                        Back to Login
                    </a>
                </p>
            </div>
        </div>
    );
};

// NEW: Reset Password Page
const ResetPasswordPage = ({ onNavigateToLogin, initialToken }) => {
    const [username, setUsername] = useState('');
    const [token, setToken] = useState(initialToken || '');
    const [newPassword, setNewPassword] = useState('');
    const [reEnterNewPassword, setReEnterNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (modalRef.current) {
            const computedStyle = window.getComputedStyle(modalRef.current);
            console.log('ResetPasswordPage Modal - Initial Opacity:', computedStyle.opacity);
            console.log('ResetPasswordPage Modal - Initial Display:', computedStyle.display);
            setTimeout(() => {
                const updatedStyle = window.getComputedStyle(modalRef.current);
                console.log('ResetPasswordPage Modal - After 100ms Opacity:', updatedStyle.opacity);
                console.log('ResetPasswordPage Modal - After 100ms Display:', updatedStyle.display);
            }, 100);
        }
    }, []);

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
            alert('New passwords do not match!');
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
                alert(data.message || 'Password reset successfully! You can now log in.');
                onNavigateToLogin();
            } else {
                setError(data.message || 'Error resetting password.');
                alert(data.message || 'Error resetting password.');
            }
        } catch (err) {
            console.error('Error resetting password:', err);
            setError('An error occurred. Please try again.');
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center p-5 w-full h-full"> {/* Added h-full to help centering */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center animate-fade-in-up"> 
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Reset Password</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xs"> 
                    <label htmlFor="resetUsername" className="font-semibold text-gray-700 mb-1">Username:</label>
                    <input
                        type="text"
                        id="resetUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        required
                    />

                    <label htmlFor="resetToken" className="font-semibold text-gray-700 mb-1">Reset Token:</label>
                    <input
                        type="text"
                        id="resetToken"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        required
                    />

                    <label htmlFor="newPassword" className="font-semibold text-gray-700 mb-1">New Password:</label>
                    <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <label htmlFor="reEnterNewPassword" className="font-semibold text-gray-700 mb-1">Re-enter New Password:</label>
                    <PasswordInput
                        id="reEnterNewPassword"
                        value={reEnterNewPassword}
                        onChange={(e) => setReEnterNewPassword(e.target.value)}
                    />

                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                    {message && <p className="text-green-500 text-sm text-center mt-2">{message}</p>}

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 mt-4"
                    >
                        Reset Password
                    </button>
                </form>
                <p className="mt-6 text-gray-700 text-base">
                    <a href="#" onClick={onNavigateToLogin} className="text-blue-500 font-semibold hover:underline">
                        Back to Login
                    </a>
                </p>
            </div>
        </div>
    );
};


const WelcomePage = ({ onNavigateToCreateProject, onNavigateToViewProjects, onNavigateToSuggestions }) => {
    const { userDetails, removeToken, fetchUserDetails, isAuthLoading } = useContext(AuthContext); 

    useEffect(() => {
        if (!userDetails && !isAuthLoading) { 
            fetchUserDetails();
        }
    }, [userDetails, fetchUserDetails, isAuthLoading]); 

    const handleLogout = () => {
        removeToken();
        alert('Logged out successfully!');
    };

    return (
        <div className="flex flex-col items-center justify-center p-5 w-full h-full">
            <div
                className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center animate-fade-in-up relative"
                style={{ width: 450, height: 450, minWidth: 450, minHeight: 450 }}
            >
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome, {userDetails?.username || 'User'}!</h1>

                {isAuthLoading ? (
                    <p className="text-gray-600 mb-6">Loading user details...</p>
                ) : userDetails ? (
                    <div className="user-details-box text-left w-full max-w-xs mx-auto mb-6 p-4 border border-blue-300 rounded-xl bg-blue-50 shadow-md"> 
                        <p className="text-gray-700 text-sm mb-2">College: <span className="font-medium">{userDetails.college || 'N/A'}</span></p> 
                        <p className="text-gray-700 text-sm mb-2">Branch: <span className="font-medium">{userDetails.branch || 'N/A'}</span></p> 
                        <p className="text-gray-700 text-sm">Roll Number: <span className="font-medium">{userDetails.roll_number || 'N/A'}</span></p>
                    </div>
                ) : (
                    <p className="text-red-500 mb-6">Could not load user details. Please try logging in again.</p>
                )}

                {/* Project Suggestions Button - blue with thunder icon */}
                <button
                    onClick={onNavigateToSuggestions}
                    className="flex items-center gap-2 bg-blue-500 text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 mb-4"
                    style={{ fontSize: '1.1rem' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Project Suggestions
                </button>

                <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-xs justify-center">
                    <button
                        onClick={onNavigateToCreateProject}
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Create New Project
                    </button>
                    <button
                        onClick={onNavigateToViewProjects}
                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        View All Projects
                    </button>
                </div>

                <button
                    onClick={handleLogout}
                    className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg mt-6 w-full max-w-[150px] mx-auto focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

// Suggestions Page
const SuggestionsPage = ({ onNavigateToWelcome }) => {
    const suggestions = [
        'AI-Powered Attendance System',
        'Smart Waste Management',
        'IoT Home Automation',
        'Blockchain Voting Platform',
        'Virtual Reality Learning App',
    ];
    return (
        <div className="flex flex-col items-center justify-center p-5 w-full h-full">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md flex flex-col items-center animate-fade-in-up" style={{ width: 450, minWidth: 450 }}>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13.5m0 0l-3.75-3.75m3.75 3.75l3.75-3.75M21 21H3" />
                    </svg>
                    Project Suggestions
                </h2>
                <ul className="w-full list-disc pl-6 text-gray-700 text-lg mb-6">
                    {suggestions.map((title, idx) => (
                        <li key={idx} className="mb-2">{title}</li>
                    ))}
                </ul>
                <button
                    onClick={onNavigateToWelcome}
                    className="bg-gray-300 text-gray-800 py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg w-full max-w-[150px] mx-auto focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
                >
                    Back to Welcome
                </button>
            </div>
        </div>
    );
};

// Updated FileItem component to include ownership logic and onViewFile prop
const FileItem = ({ file, projectOwnerRollNumber, loggedInUserRollNumber, onReplace, onDelete, onViewFile }) => {
    const isOwner = loggedInUserRollNumber && projectOwnerRollNumber === loggedInUserRollNumber;
    console.log(`FileItem - File ID: ${file.id}, LoggedInUserRollNumber: '${loggedInUserRollNumber}', ProjectOwnerRollNumber: '${projectOwnerRollNumber}', IsOwner: ${isOwner}`); 

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-lg animate-fade-in-up flex-wrap"> 
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-2/3">
                <span className="font-semibold text-gray-700 text-sm mb-1 sm:w-fit sm:min-w-[40px] flex-shrink-0">Title:</span>
                <span className="font-bold text-gray-800 flex-grow">{file.file_name} ({file.original_name})</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto justify-end w-full sm:w-1/3">
                <button
                    onClick={() => onViewFile(file.file_path, file.original_name)} 
                    className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg text-center flex-grow sm:flex-grow-0"
                >
                    View
                </button>
                {isOwner && (
                    <>
                        <button
                            onClick={() => onReplace(file.id, file.file_name)}
                            className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-gray-400 shadow-md hover:shadow-lg flex-grow sm:flex-grow-0"
                        >
                            Replace
                        </button>
                        <button
                            onClick={() => onDelete(file.id)}
                            className="bg-red-500 text-white py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-red-600 shadow-md hover:shadow-lg flex-grow sm:flex-grow-0"
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


    const fetchProjects = useCallback(async () => {
        console.log('fetchProjects called with rollNumber:', rollNumber);
        setError('');
        if (!rollNumber) {
            setProjects([]);
            setHasSearched(false); 
            console.log('Roll number is empty, not fetching projects.');
            return;
        }
        setHasSearched(true); 
        try {
            const response = await fetch(`${API_BASE_URL}/api/public-projects/view-by-roll?rollNumber=${encodeURIComponent(rollNumber)}`, {
                method: 'GET',
                headers: createAuthHeaders(),
            });
            console.log('fetchProjects - Response from view-by-roll:', response);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('fetchProjects - Error data from view-by-roll:', errorData);
                if (response.status === 401 || response.status === 403) {
                    removeToken();
                    alert('Your session has expired or is invalid. Please log in again.');
                    return;
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('fetchProjects - Projects fetched successfully:', data);
            setProjects(data);
            setSelectedProject(null); 
            setProjectFiles([]);
            setAddFiles([{ file: null, title: '', id: 1 }]); 
            setNextAddFileId(2);

        } catch (err) {
            console.error('fetchProjects - Error in fetchProjects:', err);
            setError(`An error occurred while fetching projects: ${err.message}`);
            setProjects([]);
            setSelectedProject(null); 
        }
    }, [rollNumber, createAuthHeaders, removeToken]);

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
                alert('Project not found. It might have been deleted or never existed.');
                setProjects([]); 
                setHasSearched(false); 
            }
            if (err.message.includes('401') || err.message.includes('403')) {
                removeToken();
                alert('Your session has expired or is invalid. Please log in again.');
            }
        }
    }, [removeToken]);

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
                alert('Files added successfully!');
                fetchProjectDetails(selectedProject.id); 
            } else {
                setError(data.message || 'Error adding new files.');
                alert(data.message || 'Error adding new files.');
            }
        } catch (err) {
            console.error('Error adding new files:', err);
            setError('An error occurred while adding new files.');
            alert('An error occurred while adding new files.');
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
                    alert(data.message || 'File deleted successfully!');
                    fetchProjectDetails(selectedProject.id); 
                } else {
                    setError(data.message || 'Error deleting file.');
                    alert(data.message || 'Error deleting file.');
                }
            } catch (err) {
                console.error('Error deleting file:', err);
                setError('An error occurred while deleting the file.');
                alert('An error occurred while deleting the file.');
            }
        } else if (confirmAction.type === 'deleteProject') {
            try {
                const response = await fetch(`${API_BASE_URL}/api/projects/${confirmAction.projectId}`, {
                    method: 'DELETE',
                    headers: createAuthHeaders(),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    alert(data.message || 'Project deleted successfully!');
                    handleBackToProjectsList(); 
                } else {
                    setError(data.message || 'Error deleting project.');
                    alert(data.message || 'Error deleting project.');
                }
            } catch (err) {
                console.error('Error deleting project:', err);
                setError('An error occurred while deleting the project.');
                alert('An error occurred while deleting the project.');
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
                        alert('File Not Found (404):\n\nFiles uploaded on Render\'s free tier are temporary. They are removed when the server restarts or deploys. Please upload a new file if you need it.');
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
                alert(`An error occurred while fetching file content: ${error.message}`);
            }
        } else {
            window.open(`${API_BASE_URL}${filePath}`, '_blank');
        }
    };

    const showSearchAndList = selectedProject === null;
    console.log('ViewProjectsPage - Rendering. showSearchAndList:', showSearchAndList);

    return (
        <div className="flex flex-col items-center justify-center p-5 w-full h-full"> {/* Added h-full to help centering */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col items-start animate-fade-in-up"> 
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
                                className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 mt-4"
                            >
                                View Projects
                            </button>
                        </form>

                        <div className="projects-list w-full max-w-md mt-4 self-start">
                            <h3 className="text-2xl font-bold mb-4 text-gray-800">Projects:</h3>
                            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                            {hasSearched && projects.length === 0 && !error ? (
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
                                            <div key={fileEntry.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm flex-wrap"> 
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                                                    <label htmlFor={`addFile${fileEntry.id}`} className="font-semibold text-gray-700 sm:w-fit sm:min-w-[50px] flex-shrink-0">File {fileEntry.id}:</label>
                                                    <input
                                                        type="file"
                                                        id={`addFile${fileEntry.id}`}
                                                        onChange={(e) => handleAddFileChange(fileEntry.id, 'file', e.target.files[0])}
                                                        className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow w-full"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                                                    <label htmlFor={`addFileTitle${fileEntry.id}`} className="font-semibold text-gray-700 sm:w-fit sm:min-w-[40px] flex-shrink-0">Title:</label>
                                                    <input
                                                        type="text"
                                                        id={`addFileTitle${fileEntry.id}`}
                                                        value={fileEntry.title}
                                                        onChange={(e) => handleAddFileChange(fileEntry.id, 'title', e.target.value)}
                                                        placeholder="Enter title for this new file"
                                                        className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow w-full"
                                                        required
                                                    />
                                                </div>
                                                {addFiles.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAddFileField(fileEntry.id)}
                                                        className="bg-red-500 text-white py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-red-600 shadow-md hover:shadow-lg sm:ml-auto mt-2 sm:mt-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 w-full sm:w-auto"
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
                                        className="bg-gray-400 text-gray-800 py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-gray-500 shadow-xl hover:shadow-2xl self-start mt-4 mb-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                                    >
                                        Add New File Input
                                    </button>
                                    {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                                    <button
                                        type="submit"
                                        className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-blue-600 shadow-xl hover:shadow-2xl mt-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
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

    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [files, setFiles] = useState([{ file: null, title: '', id: 1 }]);
    const [nextFileId, setNextFileId] = useState(2);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && !userDetails) {
            alert('User details not loaded. Please log in again.');
            onNavigateToWelcome(); 
        }
    }, [userDetails, isAuthLoading, onNavigateToWelcome]);


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
                alert('Project created successfully!');
                onNavigateToWelcome();
            } else {
                setError(data.message || 'Project creation failed.');
                alert(data.message || 'Project creation failed.');
            }
        } catch (err) {
            console.error('Error creating project:', err);
            setError('An error occurred during project creation.');
            alert('An error occurred during project creation.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-5 w-full h-full"> {/* Added h-full to help centering */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col items-center animate-fade-in-up"> 
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
                            <div key={fileEntry.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm flex-wrap"> 
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                                    <label htmlFor={`file${fileEntry.id}`} className="font-semibold text-gray-700 sm:w-fit sm:min-w-[50px] flex-shrink-0">File {fileEntry.id}:</label>
                                    <input
                                        type="file"
                                        id={`file${fileEntry.id}`}
                                        onChange={(e) => handleFileChange(fileEntry.id, 'file', e.target.files[0])}
                                        className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow w-full"
                                        required
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                                    <label htmlFor={`fileTitle${fileEntry.id}`} className="font-semibold text-gray-700 sm:w-fit sm:min-w-[40px] flex-shrink-0">Title:</label>
                                    <input
                                        type="text"
                                        id={`fileTitle${fileEntry.id}`}
                                        value={fileEntry.title}
                                        onChange={(e) => handleFileChange(fileEntry.id, 'title', e.target.value)}
                                        placeholder="Enter title for this file"
                                        className="p-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition flex-grow w-full"
                                        required
                                    />
                                </div>
                                {files.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeFileField(fileEntry.id)}
                                        className="bg-red-500 text-white py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-red-600 shadow-md hover:shadow-lg sm:ml-auto mt-2 sm:mt-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 w-full sm:w-auto"
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
            // Fallback: If video 'ended' event doesn't fire for any reason,
            // or if video autoplay is blocked, transition after 4 seconds anyway.
            onVideoEnd();
        }, 4000); // 4 seconds

        const handleVideoEnded = () => {
            clearTimeout(timer); // Clear the timeout if video ends naturally
            onVideoEnd();
        };

        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener('ended', handleVideoEnded);
            // Attempt to play the video; catch potential autoplay errors
            videoElement.play().catch(error => {
                console.warn("Autoplay was prevented:", error);
                // If autoplay is prevented, the setTimeout will still ensure transition
            });
        }

        return () => {
            if (videoElement) {
                videoElement.removeEventListener('ended', handleVideoEnded);
            }
            clearTimeout(timer);
        };
    }, [onVideoEnd]);

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
            <video
                ref={videoRef}
                src="/video.mp4" // IMPORTANT: Replace this with your actual video URL!
                autoPlay
                muted
                playsInline // Crucial for mobile autoplay
                className="w-full h-full object-cover" // Ensure video covers full screen
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
            default:
                return <LoginPage onLoginSuccess={() => setCurrentPage('welcome')} onNavigateToRegister={() => navigate('register')} onNavigateToForgotPassword={() => navigate('forgotPassword')} />;
        }
    };

    // Ad configuration for each page
    const adConfig = {
        login: {
            href: 'https://ad-link-login.com',
            src: '/ads/login-ad.jpg',
            alt: 'Login Advertisement',
        },
        welcome: {
            href: 'https://ad-link-welcome.com',
            src: '/ads/welcome-ad.jpg',
            alt: 'Welcome Advertisement',
        },
        createProject: {
            href: 'https://ad-link-create.com',
            src: '/ads/create-ad.jpg',
            alt: 'Create Project Advertisement',
        },
        viewProjects: {
            href: 'https://ad-link-view.com',
            src: '/ads/view-ad.jpg',
            alt: 'View Projects Advertisement',
        },
    };

    // Pick ad config for current page, fallback to login ad
    const currentAd = adConfig[currentPage] || adConfig.login;

    // What we do section images and text
    const whatWeDoImages = [
        {
            src: '/ads/what1.jpg',
            alt: 'Showcase Projects',
            desc: 'Showcase your best projects and get discovered by recruiters and peers.',
        },
        {
            src: '/ads/what2.jpg',
            alt: 'Collaborate',
            desc: 'Collaborate with others, share files, and work as a team on innovative ideas.',
        },
        {
            src: '/ads/what3.jpg',
            alt: 'Track Progress',
            desc: 'Track your project progress and keep your portfolio up to date easily.',
        },
    ];

    return (
        // Conditional rendering: Show SplashVideo first, then the main app
        <>
            {showSplash ? (
                <SplashVideo onVideoEnd={handleVideoEnd} />
            ) : (
                <div className="min-h-screen flex flex-col md:flex-row bg-black font-sans">
                    {/* Left section for Logo, Slogan, Advertisement, and What we do */}
                    <div className="w-full md:w-1/2 p-8 flex flex-col justify-start items-start relative">
                        <header className="mb-8 md:mb-0">
                            <img src="/tit.png" alt="kroxnest." className="h-20 sm:h-24 md:h-[100px] mb-[-10px] drop-shadow-lg filter invert" />
                            <p className="text-xl sm:text-2xl text-white italic pl-2" style={{ fontFamily: 'Inter, sans-serif' }}>portfolio of talent & exhibits</p>
                            <div className="md:mt-auto pb-10 pl-2">
                                <p className="text-lg text-white max-w-sm leading-relaxed">
                                    Manage your projects effortlessly: access,edit and update them from any desktop,anytime.
                                </p>
                            </div>
                        </header>
                        {/* Advertisement below slogan, with gap */}
                        <div style={{ marginTop: 48, marginBottom: 24 }}>
                            <a
                                href={currentAd.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'block',
                                    width: 600,
                                    height: 600,
                                    borderRadius: 32,
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                                    border: '2px solid #3b82f6',
                                    background: '#fff',
                                }}
                            >
                                <img
                                    src={currentAd.src}
                                    alt={currentAd.alt}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        display: 'block',
                                        background: '#fff',
                                    }}
                                />
                            </a>
                        </div>
                        {/* What we do section */}
                        <div style={{ marginTop: 48, marginBottom: 48, width: '100%' }}>
                            <h2 className="text-2xl font-bold text-white mb-6" style={{ textAlign: 'left' }}>What we do</h2>
                            <div className="flex flex-row gap-8 justify-start items-start w-full">
                                {whatWeDoImages.map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center" style={{ width: 300 }}>
                                        <img src={item.src} alt={item.alt} style={{ width: 300, height: 300, borderRadius: 16, objectFit: 'cover', marginBottom: 16, background: '#f3f4f6' }} />
                                        <p className="text-white text-base text-center" style={{ maxWidth: 300 }}>{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* How to use section */}
                        <div style={{ marginTop: 64, width: '100%' }}>
                            <h2 className="text-2xl font-bold text-white mb-6" style={{ textAlign: 'left' }}>How to use</h2>
                            <div className="flex flex-row gap-8 justify-start items-start w-full">
                                {/* Step 1 */}
                                <div className="flex flex-col items-center bg-white bg-opacity-10 rounded-2xl shadow-lg p-6" style={{ width: 300, height: 300 }}>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white text-2xl font-bold mb-4">1</div>
                                    <h3 className="text-lg font-bold text-white mb-2">Register & Login</h3>
                                    <p className="text-white text-base text-center">Create your account, log in, and set up your profile to get started with your project portfolio.</p>
                                </div>
                                {/* Step 2 */}
                                <div className="flex flex-col items-center bg-white bg-opacity-10 rounded-2xl shadow-lg p-6" style={{ width: 300, height: 300 }}>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white text-2xl font-bold mb-4">2</div>
                                    <h3 className="text-lg font-bold text-white mb-2">Create & Upload</h3>
                                    <p className="text-white text-base text-center">Create new projects, upload files, and describe your work. Collaborate with your team easily.</p>
                                </div>
                                {/* Step 3 */}
                                <div className="flex flex-col items-center bg-white bg-opacity-10 rounded-2xl shadow-lg p-6" style={{ width: 300, height: 300 }}>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white text-2xl font-bold mb-4">3</div>
                                    <h3 className="text-lg font-bold text-white mb-2">Share & Track</h3>
                                    <p className="text-white text-base text-center">Share your portfolio link, get feedback, and track your project progress anytime, anywhere.</p>
                                </div>
                            </div>
                        </div>
                        {/* Modern Footer with contact info */}
                        <footer className="w-full flex flex-col items-center justify-center py-6 px-2 mt-12 bg-black bg-opacity-60 rounded-2xl gap-2 shadow-lg">
                            <div className="text-center">
                                <span className="block text-gray-300 text-base font-semibold">© 2025 plote from KHAZA</span>
                                <span className="block text-gray-400 text-sm">All rights reserved.</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-gray-300 text-sm">Contact: <a href="mailto:info@plote.com" className="underline hover:text-blue-400">info@plote.com</a></span>
                                <span className="text-gray-300 text-sm">Phone: <a href="tel:+1234567890" className="underline hover:text-blue-400">+1 234 567 890</a></span>
                            </div>
                        </footer>
                    </div>
                    {/* Right section for dynamic page content */}
                    <main className="flex-grow flex items-center justify-center w-full md:w-1/2 p-4">
                        {renderPage()}
                    </main>
                </div>
            )}
        </>
    );
}

export default App;
