import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function AddDocumentModal({ isOpen, onClose, onDocumentAdded }) {
    const { categoryId } = useParams();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!name || !file) {
            setError('Name and file are required.');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('category_id', categoryId);
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8001/api/docs', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const newDocument = await response.json();
            onDocumentAdded(newDocument);
            onClose();
            setName('');
            setDescription('');
            setFile(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2>Upload New Document</h2>
                <form onSubmit={handleSubmit} style={formStyle}>
                    <div style={formGroupStyle}>
                        <label htmlFor="docName" style={labelStyle}>Name:</label>
                        <input
                            type="text"
                            id="docName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={inputStyle}
                            disabled={loading}
                        />
                    </div>
                    <div style={formGroupStyle}>
                        <label htmlFor="docDescription" style={labelStyle}>Description:</label>
                        <textarea
                            id="docDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={textareaStyle}
                            disabled={loading}
                        />
                    </div>
                    <div style={formGroupStyle}>
                        <label htmlFor="docFile" style={labelStyle}>File:</label>
                        <input
                            type="file"
                            id="docFile"
                            onChange={(e) => setFile(e.target.files[0])}
                            style={inputStyle}
                            disabled={loading}
                        />
                    </div>
                    {error && <p style={errorStyle}>{error}</p>}
                    <div style={buttonGroupStyle}>
                        <button type="submit" style={submitButtonStyle} disabled={loading}>
                            {loading ? 'Uploading...' : 'Upload Document'}
                        </button>
                        <button type="button" onClick={onClose} style={cancelButtonStyle} disabled={loading}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const modalContentStyle = {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    width: '90%',
    maxWidth: '500px',
    zIndex: 1001,
    position: 'relative',
};

const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
};

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
};

const labelStyle = {
    marginBottom: '5px',
    fontWeight: '600',
    color: '#333',
};

const inputStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
};

const textareaStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    minHeight: '80px',
    resize: 'vertical',
};

const buttonGroupStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
};

const submitButtonStyle = {
    backgroundColor: '#1d4ed8',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background-color 0.2s ease',
};

const cancelButtonStyle = {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background-color 0.2s ease',
};

const errorStyle = {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: '10px',
    fontSize: '14px',
};