import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
// IMPORTANT: style.css is linked directly in public/index.html to avoid import issues.
// Do NOT uncomment the line below:
// import './style.css'; 

// --- Context for Authentication ---
const AuthContext = createContext(null);

const AuthContextProvider = ({ children }) => {
    const [token, setTokenInternal] = useState(localStorage.getItem('jwtToken'));
    const [userDetails, setUserDetails] = useState(null); // Now stores full user details including roll_number
    const [isAuthLoading, setIsAuthLoading] = useState(true); // New state to track if auth is still loading

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
        setIsAuthLoading(false); // Auth is no longer loading after logout
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
        setIsAuthLoading(true); // Start loading
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/user/details`, {
                    method: 'GET',
                    headers: createAuthHeaders(),
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log('AuthContext - Fetched User Details:', data);
                    console.log('AuthContext - User Roll Number from details:', data.user?.roll_number); // Safely access roll_number
                    setUserDetails(data.user); // Store only the 'user' object, not {success:true, user:{...}}
                } else {
                    console.error('AuthContext - Failed to fetch user details:', response.status, response.statusText);
                    if (response.status === 401 || response.status === 403) {
                        removeToken();
                        alert('Your session has expired or is invalid. Please log in again.');
                        if (setCurrentPageCallback) setCurrentPageCallback('login'); // Navigate to login page
                    }
                }
            } catch (error) {
                console.error('AuthContext - Error fetching user details:', error);
                alert('An error occurred while fetching user details.');
            } finally {
                setIsAuthLoading(false); // Finished loading
            }
        } else {
            setIsAuthLoading(false); // No token, no loading needed
        }
    }, [token]); // Re-run when token changes

    useEffect(() => {
        fetchUserDetails(); // Fetch details on component mount or token change
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
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <p className="mb-6 text-gray-800 text-lg font-medium">{message}</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onConfirm}
                        className="bg-[#00ADB5] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        Yes
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-[#393E46] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#2B3036] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#393E46] focus:ring-opacity-75"
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
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Edit Project Title</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="newProjectTitle" className="font-semibold text-gray-700">New Project Title:</label>
                    <input
                        type="text"
                        id="newProjectTitle"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="p-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="submit"
                            className="bg-[#00ADB5] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-[#393E46] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#2B3036] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#393E46] focus:ring-opacity-75"
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
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
                <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Replace File</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="newFileName" className="font-semibold text-gray-700">New File Name:</label>
                    <input
                        type="text"
                        id="newFileName"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="p-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    <label htmlFor="newFileInput" className="font-semibold text-gray-700">Upload New File:</label>
                    <input
                        type="file"
                        id="newFileInput"
                        onChange={(e) => setNewFile(e.target.files[0])}
                        className="p-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="submit"
                            className="bg-[#00ADB5] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-[#393E46] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#2B3036] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#393E46] focus:ring-opacity-75"
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
        // Function to load a script
        const loadScript = (url, callback) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = callback;
            script.onerror = () => console.error(`Failed to load script: ${url}`);
            document.head.appendChild(script);
        };

        // Function to load a stylesheet
        const loadStylesheet = (url) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onerror = () => console.error(`Failed to load stylesheet: ${url}`);
            document.head.appendChild(link);
        };

        const highlightCode = () => {
            if (window.hljs && codeRef.current) {
                // Remove existing highlighting classes to re-highlight
                codeRef.current.className = ''; // Clear existing classes
                if (language) {
                    codeRef.current.classList.add(`language-${language}`);
                }
                window.hljs.highlightElement(codeRef.current);
            }
        };

        if (window.hljs) {
            // hljs is already loaded, just highlight
            highlightCode();
        } else {
            // Load highlight.js core and a theme if not already loaded
            loadStylesheet('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'); // A dark theme
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', () => {
                // Load specific language support if needed, or rely on autodetect
                // For a more robust solution, load languages dynamically based on 'language' prop
                // e.g., loadScript(`https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${language}.min.js`, highlightCode);
                highlightCode(); // Highlight after hljs is loaded
            });
        }
    }, [content, language]); // Re-run effect if content or language changes

    return (
        <div ref={modalRef} className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-5 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-4xl w-full h-4/5 flex flex-col transform transition-all duration-300 scale-105 opacity-0 animate-scale-in">
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
                        className="bg-[#393E46] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#2B3036] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#393E46] focus:ring-opacity-75"
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
            className="bg-[#F0F0F0] p-4 rounded-lg shadow-md hover:bg-[#DBDBDB] transition duration-200 cursor-pointer"
            onClick={() => onSelectProject(project.id, project.name)}
        >
            <h4 className="text-xl font-bold text-[#222831] mb-2">{project.name}</h4>
            <p className="text-[#393E46] text-sm">{project.description}</p>
        </div>
    );
};


// --- Page Components ---

const LoginPage = ({ onLoginSuccess, onNavigateToRegister, onNavigateToForgotPassword }) => {
    const { setToken } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false); // New state to control visibility

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowForgotPassword(false); // Hide it initially
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
                // Show forgot password button only on login failure
                setShowForgotPassword(true);
            }
        } catch (err) {
            console.error('Error during login:', err);
            setError('An error occurred. Please try again.');
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center p-5 w-full">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center animate-scale-in">
                <h2 className="text-4xl font-extrabold mb-8 text-[#222831]">Login</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xs mx-auto">
                    <label htmlFor="loginUsername" className="font-semibold text-[#393E46]">Username:</label>
                    <input
                        type="text"
                        id="loginUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />

                    <label htmlFor="loginPassword" className="font-semibold text-[#393E46]">Password:</label>
                    <input
                        type="password"
                        id="loginPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />

                    {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}

                    <button
                        type="submit"
                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        Login
                    </button>
                </form>
                {showForgotPassword && ( // Conditionally render "Forgot Password?"
                    <p className="mt-4 text-[#222831]">
                        <a href="#" onClick={onNavigateToForgotPassword} className="text-[#00ADB5] font-semibold hover:underline transition duration-200">
                            Forgot Password?
                        </a>
                    </p>
                )}
                <p className="mt-6 text-[#222831]">
                    Don't have an account?{' '}
                    <a href="#" onClick={onNavigateToRegister} className="text-[#00ADB5] font-semibold hover:underline transition duration-200">
                        Register here
                    </a>
                </p>
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
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.reEnterPassword) {
            setError('Passwords do not match!');
            alert('Passwords do not match!');
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
        <div className="flex items-center justify-center p-5 w-full">
            {/* Increased max-w-xl for a wider container */}
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col items-center animate-scale-in">
                <h2 className="text-4xl font-extrabold mb-8 text-[#222831]">Register</h2>
                {/* Max-w-lg for the form to give it more horizontal space for labels & inputs side-by-side */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-lg mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="email" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">Email:</label>
                        <input type="email" id="email" value={formData.email} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="username" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">Username:</label>
                        <input type="text" id="username" value={formData.username} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="password" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">Password:</label>
                        <input type="password" id="password" value={formData.password} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="reEnterPassword" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">Re-enter Password:</label>
                        <input type="password" id="reEnterPassword" value={formData.reEnterPassword} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="collegeName" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">College Name:</label>
                        <input type="text" id="collegeName" value={formData.collegeName} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="branch" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">Branch:</label>
                        <input type="text" id="branch" value={formData.branch} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="rollNumber" className="font-semibold text-[#393E46] text-sm sm:w-1/4 flex-shrink-0">Roll Number:</label>
                        <input type="text" id="rollNumber" value={formData.rollNumber} onChange={handleChange}
                            className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md flex-grow" required />
                    </div>

                    {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}

                    <button
                        type="submit"
                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg mt-4 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        Register
                    </button>
                </form>
                <p className="mt-6 text-[#222831]">
                    Already have an account?{' '}
                    <a href="#" onClick={onNavigateToLogin} className="text-[#00ADB5] font-semibold hover:underline transition duration-200">
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
    const [resetTokenInfo, setResetTokenInfo] = useState(null); // To display token and link

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
            // Use document.execCommand for broader compatibility in some iframe environments
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
        <div className="flex items-center justify-center p-5 w-full">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center animate-scale-in">
                <h2 className="text-4xl font-extrabold mb-8 text-[#222831]">Forgot Password</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xs mx-auto">
                    <p className="text-center text-[#393E46] mb-4">Enter your username to receive a password reset token.</p>
                    <label htmlFor="username" className="font-semibold text-[#393E46]">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg mt-4 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        Request Reset Token
                    </button>
                </form>

                {error && <p className="text-red-600 text-sm text-center mt-4">{error}</p>}
                {message && <p className="text-green-600 text-sm text-center mt-4">{message}</p>}

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
                            Use this link to proceed: <a href="#" onClick={() => onNavigateToResetPasswordWithToken(resetTokenInfo.token)} className="text-[#00ADB5] font-semibold hover:underline transition duration-200 break-all">Reset Password Link</a>
                        </p>
                    </div>
                )}

                <p className="mt-6 text-[#222831]">
                    Remembered your password?{' '}
                    <a href="#" onClick={onNavigateToLogin} className="text-[#00ADB5] font-semibold hover:underline transition duration-200">
                        Login here
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
        // If initialToken is provided via URL (e.g., from a simulated email link), use it
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
        <div className="flex items-center justify-center p-5 w-full">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center animate-scale-in">
                <h2 className="text-4xl font-extrabold mb-8 text-[#222831]">Reset Password</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-xs mx-auto">
                    <label htmlFor="resetUsername" className="font-semibold text-[#393E46]">Username:</label>
                    <input
                        type="text"
                        id="resetUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />

                    <label htmlFor="resetToken" className="font-semibold text-[#393E46]">Reset Token:</label>
                    <input
                        type="text"
                        id="resetToken"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />

                    <label htmlFor="newPassword" className="font-semibold text-[#393E46]">New Password:</label>
                    <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />

                    <label htmlFor="reEnterNewPassword" className="font-semibold text-[#393E46]">Re-enter New Password:</label>
                    <input
                        type="password"
                        id="reEnterNewPassword"
                        value={reEnterNewPassword}
                        onChange={(e) => setReEnterNewPassword(e.target.value)}
                        className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md"
                        required
                    />

                    {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}
                    {message && <p className="text-green-600 text-sm text-center mt-2">{message}</p>}

                    <button
                        type="submit"
                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg mt-4 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        Reset Password
                    </button>
                </form>
                <p className="mt-6 text-[#222831]">
                    <a href="#" onClick={onNavigateToLogin} className="text-[#00ADB5] font-semibold hover:underline transition duration-200">
                        Back to Login
                    </a>
                </p>
            </div>
        </div>
    );
};


const WelcomePage = ({ onNavigateToCreateProject, onNavigateToViewProjects }) => {
    const { userDetails, removeToken, fetchUserDetails, isAuthLoading } = useContext(AuthContext); // Added isAuthLoading

    // Fetch user details when the component mounts or token changes
    useEffect(() => {
        if (!userDetails && !isAuthLoading) { // Only fetch if userDetails is not already available AND not currently loading
            fetchUserDetails();
        }
    }, [userDetails, fetchUserDetails, isAuthLoading]); // Depend on userDetails and fetchUserDetails


    const handleLogout = () => {
        removeToken();
        alert('Logged out successfully!');
        // Context will handle navigation to login page after token removal
    };

    return (
        <div className="flex flex-col items-center justify-center p-5 w-full">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center animate-scale-in">
                <h1 className="text-4xl font-extrabold mb-8 text-[#222831]">Welcome, {userDetails?.username || 'User'}!</h1>

                {isAuthLoading ? (
                    <p className="text-gray-600 mb-6">Loading user details...</p>
                ) : userDetails ? (
                    <div className="user-details-box text-left w-full max-w-xs mx-auto mb-6 p-4 border border-[#00ADB5] rounded-xl bg-gradient-to-r from-teal-50 to-teal-100 shadow-inner">
                        <p className="text-[#393E46] text-sm">College: <span className="font-medium">{userDetails.college || 'N/A'}</span></p>
                        <p className="text-[#393E46] text-sm">Branch: <span className="font-medium">{userDetails.branch || 'N/A'}</span></p>
                        <p className="text-[#393E46] text-sm">Roll Number: <span className="font-medium">{userDetails.roll_number || 'N/A'}</span></p>
                    </div>
                ) : (
                    <p className="text-red-600 mb-6">Could not load user details. Please try logging in again.</p>
                )}

                <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-xs justify-center">
                    <button
                        onClick={onNavigateToCreateProject}
                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        Create New Project
                    </button>
                    <button
                        onClick={onNavigateToViewProjects}
                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                    >
                        View All Projects
                    </button>
                </div>

                <button
                    onClick={handleLogout}
                    className="bg-[#EEEEEE] text-[#222831] py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#DBDBDB] hover:scale-105 shadow-md hover:shadow-lg mt-6 w-full max-w-[150px] mx-auto focus:outline-none focus:ring-2 focus:ring-[#EEEEEE] focus:ring-opacity-75"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

// Updated FileItem component to include ownership logic and onViewFile prop
const FileItem = ({ file, projectOwnerRollNumber, loggedInUserRollNumber, onReplace, onDelete, onViewFile }) => {
    // Determine if the logged-in user is the owner of this project/file
    const isOwner = loggedInUserRollNumber && projectOwnerRollNumber === loggedInUserRollNumber;
    console.log(`FileItem - File ID: ${file.id}, LoggedInUserRollNumber: '${loggedInUserRollNumber}', ProjectOwnerRollNumber: '${projectOwnerRollNumber}', IsOwner: ${isOwner}`); // Added log for direct comparison

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 p-4 bg-[#F8FBFB] rounded-xl border border-[#393E46] shadow-sm animate-fade-in-up flex-wrap">
            {/* Group for File Name & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-2/3">
                {/* Changed from <label> to <span> as it's not associated with an input */}
                <span className="font-semibold text-[#393E46] text-sm mb-1 sm:w-fit sm:min-w-[40px] flex-shrink-0">Title:</span>
                <span className="font-bold text-[#222831] flex-grow">{file.file_name} ({file.original_name})</span>
            </div>
            {/* Group for Buttons */}
            <div className="flex flex-wrap gap-2 sm:ml-auto justify-end w-full sm:w-1/3">
                <button
                    onClick={() => onViewFile(file.file_path, file.original_name)} // Pass file_path and original_name
                    className="bg-[#EEEEEE] text-[#222831] py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-[#DBDBDB] hover:scale-105 shadow-sm hover:shadow-md text-center flex-grow sm:flex-grow-0"
                >
                    View
                </button>
                {isOwner && (
                    <>
                        <button
                            onClick={() => onReplace(file.id, file.file_name)}
                            className="bg-[#EEEEEE] text-[#222831] py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-[#DBDBDB] hover:scale-105 shadow-sm hover:shadow-md flex-grow sm:flex-grow-0"
                        >
                            Replace
                        </button>
                        <button
                            onClick={() => onDelete(file.id)}
                            className="bg-[#F47C7C] text-white py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-[#E06666] hover:scale-105 shadow-md hover:shadow-lg flex-grow sm:flex-grow-0"
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
    const loggedInUserRollNumber = userDetails?.roll_number; // Get logged-in user's roll number
    console.log('ViewProjectsPage - loggedInUserRollNumber (from AuthContext):', loggedInUserRollNumber); // Added log

    const [rollNumber, setRollNumber] = useState('');
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectFiles, setProjectFiles] = useState([]);
    const [addFiles, setAddFiles] = useState([{ file: null, title: '', id: 1 }]);
    const [nextAddFileId, setNextAddFileId] = useState(2);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // stores the action to perform on confirm
    const [showEditTitleModal, setShowEditTitleModal] = useState(false);
    const [showReplaceFileModal, setShowReplaceFileModal] = useState(false);
    const [fileToReplace, setFileToReplace] = useState(null);
    const [hasSearched, setHasSearched] = useState(false); // New state to track if a search has been performed

    const [showCodeViewer, setShowCodeViewer] = useState(false);
    const [codeViewerContent, setCodeViewerContent] = useState('');
    const [codeViewerLanguage, setCodeViewerLanguage] = '';


    const fetchProjects = useCallback(async () => {
        console.log('fetchProjects called with rollNumber:', rollNumber);
        setError('');
        if (!rollNumber) {
            setProjects([]);
            setHasSearched(false); // Reset search status if roll number is cleared
            console.log('Roll number is empty, not fetching projects.');
            return;
        }
        setHasSearched(true); // Mark that a search has been initiated
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
            setSelectedProject(null); // Clear selected project on new search
            setProjectFiles([]);
            setAddFiles([{ file: null, title: '', id: 1 }]); // Reset add file fields
            setNextAddFileId(2);

        } catch (err) {
            console.error('fetchProjects - Error in fetchProjects:', err);
            setError(`An error occurred while fetching projects: ${err.message}`);
            setProjects([]);
            setSelectedProject(null); // Ensure no project is selected on error
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
            console.log('fetchProjectDetails - Fetched project.roll_number (actual owner):', project.roll_number); // Added log
            // IMPORTANT: Update selectedProject with the full project object including its actual roll_number
            setSelectedProject(project); // This is crucial for the ownership check to be accurate
            setProjectFiles(files);
            setAddFiles([{ file: null, title: '', id: 1 }]); // Reset add file fields
            setNextAddFileId(2);
        } catch (err) {
            console.error('fetchProjectDetails - Error in fetchProjectDetails:', err);
            setError(`An error occurred while fetching project details: ${err.message}`);
            setSelectedProject(null); // Go back to search list view on error
            setProjectFiles([]);
            if (err.message === 'Project not found.') {
                alert('Project not found. It might have been deleted or never existed.');
                setProjects([]); // Clear project list to prompt new search
                setHasSearched(false); // Reset search status
            }
            if (err.message.includes('401') || err.message.includes('403')) {
                removeToken();
                alert('Your session has expired or is invalid. Please log in again.');
            }
        }
    }, [removeToken]);

    const handleSelectProject = (projectId, projectName) => {
        console.log('handleSelectProject called:', projectId, projectName);
        // Only set a temporary state to indicate loading, the actual project object (with roll_number)
        // will be set by fetchProjectDetails. We don't initialize roll_number here from the input field
        // because the input field's rollNumber might not be the actual owner.
        // Set a placeholder for `selectedProject` initially to trigger UI change and indicate loading
        setSelectedProject({ id: projectId, name: projectName, description: 'Loading...', roll_number: null });
        fetchProjectDetails(projectId);
    };

    const handleBackToProjectsList = () => {
        console.log('handleBackToProjectsList called.');
        setSelectedProject(null); // Clear selected project details
        setProjectFiles([]);
        setAddFiles([{ file: null, title: '', id: 1 }]);
        setNextAddFileId(2);
        setProjects([]); // Explicitly clear projects list to show search form
        setHasSearched(false); // Reset search status
        setRollNumber(''); // Clear the roll number input as well
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

        if (addFiles.some(f => f.file === null || !f.title.trim())) { // Check for null file and empty title
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
                fetchProjectDetails(selectedProject.id); // Refresh details
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
                    fetchProjectDetails(selectedProject.id); // Refresh project details
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
                    handleBackToProjectsList(); // Go back to the list and refresh
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
        // After title save, we don't need to re-fetch *all* projects.
        // If the user is on the project details page, just update the title displayed.
        // If they go back to the list, fetchProjects will be triggered.
    };

    const onReplaceFileComplete = () => {
        setShowReplaceFileModal(false);
        setFileToReplace(null);
        fetchProjectDetails(selectedProject.id); // Refresh project details
    };

    const handleViewFile = async (filePath, originalFileName) => {
        const fileExtension = originalFileName.split('.').pop().toLowerCase();
        const codeExtensions = ['js', 'json', 'css', 'html', 'txt', 'py', 'java', 'c', 'cpp', 'sh', 'md', 'xml']; // Add more as needed

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
                setCodeViewerLanguage(fileExtension); // Pass extension for highlighting
                setShowCodeViewer(true);
            } catch (error) {
                console.error('Error fetching file content for viewer:', error);
                alert(`An error occurred while fetching file content: ${error.message}`);
            }
        } else {
            // For non-code files, open in new tab
            window.open(`${API_BASE_URL}${filePath}`, '_blank');
        }
    };


    // Determine current view based on selectedProject state
    const showSearchAndList = selectedProject === null;
    console.log('ViewProjectsPage - Rendering. showSearchAndList:', showSearchAndList);


    return (
        <div className="flex flex-col items-center justify-center p-5 w-full">
            {/* Removed the Hero Image Section */}

            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col items-start animate-scale-in">
                <h1 className="text-4xl font-extrabold mb-8 text-[#222831] self-center">View Projects</h1>

                {showSearchAndList ? (
                    <>
                        <form onSubmit={(e) => { e.preventDefault(); fetchProjects(); }} className="flex flex-col gap-5 w-full max-w-xs mx-auto mb-6">
                            <label htmlFor="viewRollNumber" className="font-semibold text-[#393E46]">Enter Student Roll Number:</label>
                            <input
                                type="text"
                                id="viewRollNumber"
                                value={rollNumber}
                                onChange={(e) => setRollNumber(e.target.value)}
                                placeholder="e.g., 12345"
                                className="p-3 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition focus:shadow-md mb-2"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                            >
                                View Projects
                            </button>
                        </form>

                        <div className="projects-list w-full max-w-md mt-4 self-start">
                            <h3 className="text-2xl font-bold mb-4 text-[#222831]">Projects:</h3>
                            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
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
                        {/* Project Details Section */}
                        <div className="project-details-section w-full animate-fade-in-up">
                            <h3 className="text-3xl font-extrabold mb-2 text-[#222831]">{selectedProject?.name}</h3>
                            <p className="text-[#393E46] text-lg mb-6">{selectedProject?.description || ''}</p>

                            {/* Edit/Delete Project Buttons (only visible to project owner) */}
                            {loggedInUserRollNumber && selectedProject?.roll_number === loggedInUserRollNumber && (
                                <div className="flex flex-wrap gap-4 mb-6 justify-start">
                                    <button
                                        onClick={handleEditProjectTitle}
                                        className="bg-[#EEEEEE] text-[#222831] py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#DBDBDB] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#EEEEEE] focus:ring-opacity-75"
                                    >
                                        Edit Title
                                    </button>
                                    <button
                                        onClick={handleDeleteProject}
                                        className="bg-[#F47C7C] text-white py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#E06666] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F47C7C] focus:ring-opacity-75"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            )}

                            <h4 className="text-2xl font-bold mb-4 text-[#222831]">Associated Files:</h4>
                            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                            {projectFiles.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {projectFiles.map(file => (
                                        <FileItem
                                            key={file.id}
                                            file={file}
                                            projectOwnerRollNumber={selectedProject.roll_number} // Pass project owner's roll number
                                            loggedInUserRollNumber={loggedInUserRollNumber} // Pass logged-in user's roll number
                                            onReplace={handleReplaceFile}
                                            onDelete={handleDeleteFile}
                                            onViewFile={handleViewFile}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600">No files associated with this project.</p>
                            )}

                            {/* Add New Files Form (only visible to project owner) */}
                            {loggedInUserRollNumber && selectedProject?.roll_number === loggedInUserRollNumber && (
                                <form onSubmit={handleAddFilesSubmit} className="flex flex-col gap-5 mt-8 w-full">
                                    <h4 className="text-2xl font-bold mb-2 text-[#222831]">Add New Files to this Project:</h4>
                                    <div className="flex flex-col gap-4 w-full">
                                        {addFiles.map(fileEntry => (
                                            // Each new file entry row is a flex container
                                            <div key={fileEntry.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-[#F8FBFB] rounded-xl border border-[#393E46] shadow-sm flex-wrap">
                                                {/* Group for File Input */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                                                    <label htmlFor={`addFile${fileEntry.id}`} className="font-semibold text-[#393E46] sm:w-fit sm:min-w-[50px] flex-shrink-0">File {fileEntry.id}:</label>
                                                    <input
                                                        type="file"
                                                        id={`addFile${fileEntry.id}`}
                                                        onChange={(e) => handleAddFileChange(fileEntry.id, 'file', e.target.files[0])}
                                                        className="p-2 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition flex-grow w-full"
                                                        required
                                                    />
                                                </div>
                                                {/* Group for Title Input */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-1/2">
                                                    <label htmlFor={`addFileTitle${fileEntry.id}`} className="font-semibold text-[#393E46] sm:w-fit sm:min-w-[40px] flex-shrink-0">Title:</label>
                                                    <input
                                                        type="text"
                                                        id={`addFileTitle${fileEntry.id}`}
                                                        value={fileEntry.title}
                                                        onChange={(e) => handleAddFileChange(fileEntry.id, 'title', e.target.value)}
                                                        placeholder="Enter title for this new file"
                                                        className="p-2 border border-[#393E46] rounded-lg text-[#222831] bg-[#F8FBFB] focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent transition flex-grow w-full"
                                                        required
                                                    />
                                                </div>
                                                {addFiles.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAddFileField(fileEntry.id)}
                                                        className="bg-[#F47C7C] text-white py-2 px-4 rounded-lg font-bold transition duration-300 hover:bg-[#E06666] hover:scale-105 shadow-md hover:shadow-lg sm:ml-auto mt-2 sm:mt-0 focus:outline-none focus:ring-2 focus:ring-[#F47C7C] focus:ring-opacity-75 w-full sm:w-auto"
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
                                        className="bg-[#393E46] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#2B3036] hover:scale-105 shadow-md hover:shadow-lg self-start mt-4 mb-2 focus:outline-none focus:ring-2 focus:ring-[#393E46] focus:ring-opacity-75"
                                    >
                                        Add New File Input
                                    </button>
                                    {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}
                                    <button
                                        type="submit"
                                        className="bg-[#00ADB5] text-white py-3 px-6 rounded-lg font-bold transition duration-300 hover:bg-[#008C94] hover:scale-105 shadow-md hover:shadow-lg mt-5 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:ring-opacity-75"
                                    >
                                        Done (Add Files)
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                )}

                {/* Dynamic Bottom Buttons for navigation */}
                <div className="flex flex-wrap gap-4 mt-8 w-full justify-end">
                    {!showSearchAndList && (
                        <button
                            onClick={handleBackToProjectsList}
                            className="bg-[#EEEEEE] text-[#222831] py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#DBDBDB] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#EEEEEE] focus:ring-opacity-75"
                        >
                            &larr; Back to Projects List
                        </button>
                    )}
                    <button
                        onClick={onNavigateToWelcome}
                        className="bg-[#EEEEEE] text-[#222831] py-2 px-5 rounded-lg font-bold transition duration-300 hover:bg-[#DBDBDB] hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#EEEEEE] focus:ring-opacity-75"
                    >
                        Back to Welcome
                    </button>
                </div>
            </div>

            {/* Modals rendered conditionally */}
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

export default function RenderApp() {
    return (
        // Render the main App component, which now includes AuthContextProvider internally
        // AuthContextProvider must wrap App for useContext to work correctly within App and its children
        <AuthContextProvider>
            <App />
        </AuthContextProvider>
    );
}
