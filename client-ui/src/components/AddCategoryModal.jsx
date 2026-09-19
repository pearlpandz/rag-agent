import React, { useState } from 'react';

const AddCategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
    const [categoryName, setCategoryName] = useState('');
    const [shortDescription, setShortDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newCategory = {
            name: categoryName,
            shortdescription: shortDescription,
        };

        try {
            const response = await fetch('http://localhost:8001/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCategory),
            });

            if (response.ok) {
                const addedCategory = await response.json();
                onCategoryAdded(addedCategory);
                setCategoryName('');
                setShortDescription('');
                onClose();
            } else {
                console.error('Failed to add category');
            }
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2>Add New Category</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="categoryName" style={labelStyle}>Category Name:</label>
                        <input
                            type="text"
                            id="categoryName"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            style={inputStyle}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="shortDescription" style={labelStyle}>Short Description:</label>
                        <textarea
                            id="shortDescription"
                            value={shortDescription}
                            onChange={(e) => setShortDescription(e.target.value)}
                            style={textareaStyle}
                            required
                        ></textarea>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel</button>
                        <button type="submit" style={submitButtonStyle}>Add Category</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    width: '90%',
    maxWidth: '500px',
    position: 'relative',
};

const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
};

const inputStyle = {
    width: '100%',
    padding: '0.8rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
};

const textareaStyle = {
    width: '100%',
    padding: '0.8rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
    minHeight: '80px',
    resize: 'vertical',
};

const submitButtonStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '0.8rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
};

const cancelButtonStyle = {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '0.8rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
};

export default AddCategoryModal;
