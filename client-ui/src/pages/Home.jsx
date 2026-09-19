import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AddCategoryModal from "../components/AddCategoryModal";

const Homepage = () => {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchCategories = async () => {
        try {
            const response = await fetch("http://localhost:8001/api/categories");
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleCategoryAdded = (newCategory) => {
        setCategories((prevCategories) => [...prevCategories, newCategory]);
    };

    return (
        <div style={{ padding: "2rem", backgroundColor: "#f4f4f4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                    <h2>Welcome to the Knowledge Hub</h2>
                    <p>Select a category to get started:</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{ backgroundColor: "#007bff", color: "white", padding: "0.5rem 1rem", borderRadius: "5px", textDecoration: "none", fontWeight: "bold", border: "none", cursor: "pointer" }}
                >
                    Add Category
                </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginTop: "2rem" }}>
                {categories.map((category) => (
                    <Link key={category.id} to={`/documents/${category.id}`} style={{ background: "white", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.07)", padding: "2rem", textDecoration: "none", color: "#222", flex: "1 0 220px", maxWidth: "250px", transition: "box-shadow .2s" }}>
                        <h3 style={{ marginBottom: "1rem" }}>{category.name}</h3>
                        <p style={{ fontSize: "1rem" }}>{category.shortdescription}</p>
                    </Link>
                ))}
            </div>
            <AddCategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCategoryAdded={handleCategoryAdded} />
        </div>
    );
};

export default Homepage;
