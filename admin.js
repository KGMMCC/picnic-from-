// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNDT0P_2lL1cxrVfRJ19rLg1_JoTwiLU4",
  authDomain: "gmmcc-picnic.firebaseapp.com",
  databaseURL: "https://gmmcc-picnic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gmmcc-picnic",
  storageBucket: "gmmcc-picnic.firebaseapp.com",
  messagingSenderId: "659544860374",
  appId: "1:659544860374:web:70bac069b946be11ee4b77"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Initialize EmailJS
emailjs.init('i3L63-9eZOLxLsVkF');

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');
const adminPass = document.getElementById('adminPass');
const loginMsg = document.getElementById('loginMsg');
const adminName = document.getElementById('adminName');
const togglePassword = document.getElementById('togglePassword');

// Stats Elements
const totalRegistrations = document.getElementById('totalRegistrations');
const pendingRegistrations = document.getElementById('pendingRegistrations');
const approvedRegistrations = document.getElementById('approvedRegistrations');
const todayRegistrations = document.getElementById('todayRegistrations');

// Table Elements
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const paymentFilter = document.getElementById('paymentFilter');
const refreshBtn = document.getElementById('refreshBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

// Global Variables
let allRegistrations = [];
let filteredRegistrations = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 10;

// Toggle Password Visibility
togglePassword.addEventListener('click', function() {
  const type = adminPass.getAttribute('type') === 'password' ? 'text' : 'password';
  adminPass.setAttribute('type', type);
  this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
});

// Login Function
loginBtn.addEventListener('click', async () => {
  const email = adminEmail.value.trim();
  const password = adminPass.value.trim();

  if (!email || !password) {
    showMessage('Please enter both email and password!', 'error');
    return;
  }

  try {
    // Disable login button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update admin name display
    adminName.textContent = user.email;

    // Show success message
    showMessage('Login successful! Loading dashboard...', 'success');

    // Switch to dashboard after a short delay
    setTimeout(() => {
      loginSection.style.display = 'none';
      dashboard.style.display = 'block';
      
      // Load registrations data
      loadRegistrations();
      
      // Start real-time updates
      startRealtimeUpdates();
    }, 1000);

  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = 'Login failed! ';
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage += 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage += 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage += 'Incorrect password.';
        break;
      case 'auth/too-many-requests':
        errorMessage += 'Too many login attempts. Please try again later.';
        break;
      default:
        errorMessage += 'Please check your credentials.';
    }
    
    showMessage(errorMessage, 'error');
    
  } finally {
    // Reset login button
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
  }
});

// Logout Function
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    dashboard.style.display = 'none';
    loginSection.style.display = 'block';
    adminEmail.value = '';
    adminPass.value = '';
    showMessage('Logged out successfully!', 'success');
  } catch (error) {
    showMessage('Logout failed: ' + error.message, 'error');
  }
});

// Load Registrations from Firebase
async function loadRegistrations() {
  try {
    const registrationsRef = ref(db, 'registrations');
    const snapshot = await get(registrationsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Convert object to array
      allRegistrations = Object.entries(data).map(([key, value]) => ({
        key,
        ...value,
        timestamp: value.timestamp || Date.now()
      }));
      
      // Sort by timestamp (newest first)
      allRegistrations.sort((a, b) => b.timestamp - a.timestamp);
      
      // Update stats and table
      updateStats();
      applyFilters();
      
    } else {
      allRegistrations = [];
      updateStats();
      applyFilters();
      showToast('No registrations found yet.', 'info');
    }
    
  } catch (error) {
    console.error('Error loading registrations:', error);
    showToast('Failed to load registrations: ' + error.message, 'error');
  }
}

// Start Real-time Updates
function startRealtimeUpdates() {
  const registrationsRef = ref(db, 'registrations');
  
  onValue(registrationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      allRegistrations = Object.entries(data).map(([key, value]) => ({
        key,
        ...value,
        timestamp: value.timestamp || Date.now()
      }));
      
      allRegistrations.sort((a, b) => b.timestamp - a.timestamp);
      updateStats();
      applyFilters();
    }
  });
}

// Update Statistics
function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  
  const total = allRegistrations.length;
  const pending = allRegistrations.filter(r => r.status === 'Pending').length;
  const approved = allRegistrations.filter(r => r.status === 'Approved').length;
  const todayRegs = allRegistrations.filter(r => {
    const regDate = new Date(r.timestamp);
    regDate.setHours(0, 0, 0, 0);
    return regDate.getTime() === todayTimestamp;
  }).length;
  
  totalRegistrations.textContent = total;
  pendingRegistrations.textContent = pending;
  approvedRegistrations.textContent = approved;
  todayRegistrations.textContent = todayRegs;
}

// Apply Filters and Search
function applyFilters() {
  filteredRegistrations = [...allRegistrations];
  
  // Apply status filter
  if (currentFilter !== 'all') {
    filteredRegistrations = filteredRegistrations.filter(r => r.status === currentFilter);
  }
  
  // Apply payment method filter
  const paymentValue = paymentFilter.value;
  if (paymentValue) {
    filteredRegistrations = filteredRegistrations.filter(r => r.payment === paymentValue);
  }
  
  // Apply search
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filteredRegistrations = filteredRegistrations.filter(r => 
      r.name?.toLowerCase().includes(searchTerm) ||
      r.roll?.toLowerCase().includes(searchTerm) ||
      r.phone?.toLowerCase().includes(searchTerm) ||
      r.email?.toLowerCase().includes(searchTerm)
    );
  }
  
  currentPage = 1;
  updateTable();
  updatePagination();
}

// Update Table
function updateTable() {
  if (filteredRegistrations.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
          <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
          <p>No registrations found</p>
          <p style="font-size: 13px; margin-top: 10px;">Try changing your filters or search term</p>
        </td>
      </tr>
    `;
    return;
  }
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageRegistrations = filteredRegistrations.slice(startIndex, endIndex);
  
  // Generate table rows
  tableBody.innerHTML = pageRegistrations.map(reg => {
    const date = new Date(reg.timestamp);
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    return `
      <tr>
        <td><strong>${reg.name || 'N/A'}</strong></td>
        <td>${reg.roll || 'N/A'}</td>
        <td>${reg.phone || 'N/A'}</td>
        <td>${reg.email || 'N/A'}</td>
        <td>${reg.payment || 'N/A'}</td>
        <td>
          <span class="status-badge status-${reg.status?.toLowerCase() || 'pending'}">
            ${reg.status || 'Pending'}
          </span>
        </td>
        <td title="${new Date(reg.timestamp).toLocaleString()}">
          ${formattedDate}<br><small>${formattedTime}</small>
        </td>
        <td>
          ${reg.status === 'Pending' ? `
            <button class="action-btn approve-btn" onclick="approveRegistration('${reg.key}', '${reg.name}', '${reg.email}')">
              <i class="fas fa-check"></i> Approve
            </button>
          ` : '<span style="color: #2ecc71; font-weight: 500;">✓ Approved</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

// Update Pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Function to send approval email via EmailJS
function sendApprovalEmail(name, email, regId) {
  // Your EmailJS Service ID and Template ID
  const serviceID = 'YOUR_SERVICE_ID';  // আপনার service ID বসাবেন
  const templateID = 'YOUR_TEMPLATE_ID'; // আপনার template ID বসাবেন
  
  const templateParams = {
    student_name: name,
    reg_id: regId,
    to_email: email,
    college_name: 'GMMCC',
    picnic_date: '25th March, 2026',
    picnic_venue: 'Shishu Park & Resort'
  };

  emailjs.send(serviceID, templateID, templateParams)
    .then(response => {
      console.log('Email sent successfully!', response.status, response.text);
      showToast(`Confirmation email sent to ${name}!`, 'success');
    })
    .catch(err => {
      console.error('Email sending error:', err);
      showToast(`Failed to send email to ${name}`, 'error');
    });
}

// Approve Registration with Email Notification
window.approveRegistration = async function(key, name, email) {
  // Show confirmation dialog
  if (!confirm(`Are you sure you want to approve registration for ${name}?\n\nAn approval email will be sent to ${email}`)) {
    return;
  }
  
  try {
    // Update status in Firebase
    await update(ref(db, 'registrations/' + key), { 
      status: 'Approved',
      approvedAt: Date.now(),
      approvedBy: adminName.textContent || 'Admin'
    });
    
    // Show success message
    showToast(`Registration approved for ${name}!`, 'success');
    
    // Send approval email if email exists
    if (email && email.includes('@')) {
      // Use registration ID from database or generate one
      const regRef = ref(db, 'registrations/' + key);
      const snapshot = await get(regRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const regId = data.reg_id || key.substring(0, 8).toUpperCase();
        
        // Send email
        sendApprovalEmail(name, email, regId);
        
        // Update local registration status
        const regIndex = allRegistrations.findIndex(r => r.key === key);
        if (regIndex !== -1) {
          allRegistrations[regIndex].status = 'Approved';
          updateStats();
          applyFilters();
        }
      }
    } else {
      showToast(`Registration approved, but no email sent (invalid email: ${email})`, 'warning');
      
      // Update local registration status even without email
      const regIndex = allRegistrations.findIndex(r => r.key === key);
      if (regIndex !== -1) {
        allRegistrations[regIndex].status = 'Approved';
        updateStats();
        applyFilters();
      }
    }
    
  } catch (error) {
    console.error('Error approving registration:', error);
    showToast('Failed to approve registration: ' + error.message, 'error');
  }
};

// Event Listeners for Filters
searchInput.addEventListener('input', () => {
  applyFilters();
});

paymentFilter.addEventListener('change', () => {
  applyFilters();
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', function() {
    // Remove active class from all buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    this.classList.add('active');
    
    // Update current filter
    currentFilter = this.dataset.filter;
    
    // Apply filters
    applyFilters();
  });
});

// Pagination buttons
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
    updatePagination();
  }
});

nextBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
    updatePagination();
  }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  loadRegistrations();
  showToast('Data refreshed!', 'success');
});

// Helper Functions
function showMessage(message, type) {
  loginMsg.textContent = message;
  loginMsg.className = `message ${type}`;
  loginMsg.style.display = 'block';
  
  // Auto-hide message after 3 seconds
  setTimeout(() => {
    loginMsg.style.display = 'none';
  }, 3000);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'flex';
  
  // Auto-hide toast after 3 seconds
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Auto-focus email input on page load
window.addEventListener('load', () => {
  adminEmail.focus();
});

// Email Settings Modal (Optional - for changing email settings)
function showEmailSettings() {
  const modal = document.createElement('div');
  modal.className = 'email-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 500px;">
      <h3 style="margin-bottom: 20px; color: #0b3c5d;">
        <i class="fas fa-envelope"></i> Email Settings
      </h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Service ID</label>
        <input type="text" id="emailServiceID" value="YOUR_SERVICE_ID" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Template ID</label>
        <input type="text" id="emailTemplateID" value="YOUR_TEMPLATE_ID" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 10px 20px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
          Cancel
        </button>
        <button onclick="saveEmailSettings()" style="padding: 10px 20px; background: #0b3c5d; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Save Settings
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Function to save email settings
window.saveEmailSettings = function() {
  const serviceID = document.getElementById('emailServiceID').value;
  const templateID = document.getElementById('emailTemplateID').value;
  
  // Here you would typically save these to localStorage or your database
  localStorage.setItem('emailServiceID', serviceID);
  localStorage.setItem('emailTemplateID', templateID);
  
  showToast('Email settings saved!', 'success');
  document.querySelector('.email-settings-modal').remove();
};

// Load saved email settings on page load
window.addEventListener('load', () => {
  const savedServiceID = localStorage.getItem('emailServiceID');
  const savedTemplateID = localStorage.getItem('emailTemplateID');
  
  if (savedServiceID && savedTemplateID) {
    // You can use these saved values in your sendApprovalEmail function
    console.log('Loaded saved email settings');
  }
});
