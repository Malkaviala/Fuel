// app.js

// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAwgVoCZi4QZYxNZB-DElzh3OzXyPi_oWQ",
    authDomain: "finance-c000b.firebaseapp.com",
    projectId: "finance-c000b",
    storageBucket: "finance-c000b.appspot.com",
    messagingSenderId: "560534350244",
    appId: "1:560534350244:web:64e1194ca97e41d9a97931",
    measurementId: "G-BD3WQJ1FCY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let editId = null;
let isLoading = false;

// DOM elements
const defForm = document.getElementById('defForm');
const entriesList = document.getElementById('entriesList');
const formTitle = document.getElementById('formTitle');

// Format currency
const formatCurrency = (number) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
};

// Format date
const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// Show loading state
const showLoading = () => {
    isLoading = true;
    entriesList.innerHTML = '<div class="loading">Loading...</div>';
};

// Show error message
const showError = (message) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    entriesList.prepend(errorDiv);
};

// Tab Navigation
const initializeTabs = () => {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = tab.dataset.page;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show active page
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');

            // Load data if viewing stats page
            if (pageId === 'viewPage') {
                loadEntries();
            }
        });
    });
};

// Add/Edit entry
const initializeForm = () => {
    defForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const entry = {
            date: document.getElementById('date').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            pricePerGallon: parseFloat(document.getElementById('pricePerGallon').value),
            odometer: parseInt(document.getElementById('odometer').value),
            timestamp: new Date().getTime()
        };

        try {
            if (editId) {
                const entryDoc = doc(db, 'defEntries', editId);
                await updateDoc(entryDoc, entry);
                alert('Entry updated successfully');
                editId = null;
                formTitle.textContent = "New Entry";
            } else {
                await addDoc(collection(db, 'defEntries'), entry);
                alert('Entry added successfully');
            }

            defForm.reset();
            loadEntries();
        } catch (error) {
            console.error('Error adding/updating entry:', error);
            alert('Error adding/updating entry');
        }
    });
};

// Load entries
async function loadEntries() {
    showLoading();

    let totalDef = 0;
    let totalCost = 0;
    let previousOdometer = null;
    let totalDistance = 0;

    try {
        const querySnapshot = await getDocs(collection(db, 'defEntries'));
        const entries = [];

        querySnapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });

        // Sort entries by date
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate distances between entries
        for (let i = 0; i < entries.length - 1; i++) {
            const currentEntry = entries[i];
            const nextEntry = entries[i + 1];
            currentEntry.distanceDriven = currentEntry.odometer - nextEntry.odometer;
        }

        entriesList.innerHTML = '';

        entries.forEach((entry, index) => {
            const totalEntryCost = entry.quantity * entry.pricePerGallon;
            const distanceInfo = entry.distanceDriven ? 
                `Distance: ${entry.distanceDriven.toLocaleString()} miles` : 
                (index === entries.length - 1 ? 'First entry' : '');

            const entryEl = document.createElement('div');
            entryEl.className = 'entry-item';
            entryEl.innerHTML = `
                <div class="entry-header">
                    <span class="entry-date">${formatDate(entry.date)}</span>
                    <div class="entry-actions">
                        <button class="edit-btn" onclick="editEntry('${entry.id}')">
                            <span>Edit</span>
                        </button>
                        <button class="delete-btn" onclick="deleteEntry('${entry.id}')">
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
                <div class="entry-details">
                    <div>Quantity: ${entry.quantity.toFixed(2)} gal</div>
                    <div>Price: $${formatCurrency(entry.pricePerGallon)}/gal</div>
                    <div>Total: $${formatCurrency(totalEntryCost)}</div>
                    <div>Odometer: ${entry.odometer.toLocaleString()} mi</div>
                    <div class="distance-info">${distanceInfo}</div>
                </div>
            `;

            entriesList.appendChild(entryEl);

            totalDef += entry.quantity;
            totalCost += totalEntryCost;

            // Calculate total distance driven
            if (previousOdometer !== null) {
                const distance = previousOdometer - entry.odometer;
                if (distance > 0) {
                    totalDistance += distance;
                }
            }
            previousOdometer = entry.odometer;
        });

        // Update summary with properly formatted numbers
        document.getElementById('totalDef').textContent = formatCurrency(totalDef);
        document.getElementById('totalCost').textContent = formatCurrency(totalCost);

        // Calculate and display average cost and consumption rate
        document.getElementById('avgCost').textContent = totalDef > 0 ? 
            formatCurrency(totalCost / totalDef) : '0.00';
        document.getElementById('consumptionRate').textContent = totalDef > 0 && totalDistance > 0 ? 
            (totalDistance / totalDef).toFixed(2) : '0.00';

        if (entries.length === 0) {
            entriesList.innerHTML = `
                <div class="card" style="text-align: center; color: #666;">
                    No entries found. Add your first DEF fill-up!
                </div>
            `;
        }

    } catch (error) {
        console.error('Error loading entries:', error);
        showError('Error loading entries. Please try again.');
    } finally {
        isLoading = false;
    }
}


// Edit entry
window.editEntry = async (id) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'defEntries'));
        const doc = querySnapshot.docs.find(doc => doc.id === id);
        
        if (!doc) {
            throw new Error('Entry not found');
        }

        const entryData = doc.data();

        document.getElementById('date').value = entryData.date;
        document.getElementById('quantity').value = entryData.quantity;
        document.getElementById('pricePerGallon').value = entryData.pricePerGallon;
        document.getElementById('odometer').value = entryData.odometer;

        formTitle.textContent = "Edit Entry";
        editId = id;
        
        // Switch to the Add Entry tab
        document.querySelector('[data-page="addPage"]').click();

    } catch (error) {
        console.error('Error editing entry:', error);
        alert('Error loading entry for editing');
    }
};

// Delete entry
window.deleteEntry = async (id) => {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            await deleteDoc(doc(db, 'defEntries', id));
            alert('Entry deleted successfully');
            loadEntries();
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Error deleting entry');
        }
    }
};

// Initialize the application
const initializeAppFunctions = () => {
    initializeTabs();
    initializeForm();
    
    // Set today's date as default for new entries
    document.getElementById('date').valueAsDate = new Date();

    // Load initial data if on view page
    if (document.getElementById('viewPage').classList.contains('active')) {
        loadEntries();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAppFunctions);

// Export functions that need to be globally available
window.editEntry = editEntry;
window.deleteEntry = deleteEntry;
