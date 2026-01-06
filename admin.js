// Firebase Configuration - আপনার Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCNDT0P_2lL1cxrVfRJ19rLg1_JoTwiLU4",
  authDomain: "gmmcc-picnic.firebaseapp.com",
  databaseURL: "https://gmmcc-picnic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gmmcc-picnic",
  storageBucket: "gmmcc-picnic.appspot.com",
  messagingSenderId: "659544860374",
  appId: "1:659544860374:web:70bac069b946be11ee4b77"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Initialize EmailJS - আপনার Public Key
emailjs.init("i3L63-9eZOLxLsVkF");

// EmailJS Configuration - আপনার Service এবং Template IDs
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_0eawslg',
  TEMPLATE_ID: 'template_0ahqigr'
};

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboard = document.getElementById('dashboard');
const loadingOverlay = document.getElementById('loadingOverlay');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');
const adminPass = document.getElementById('adminPass');
const loginMsg = document.getElementById('loginMsg');
const adminName = document.getElementById('adminName');
const togglePassword = document.getElementById('togglePassword');
const serverStatus = document.getElementById('serverStatus');
const serverStatusText = document.getElementById('serverStatusText');

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
const exportBtn = document.getElementById('exportBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const startItem = document.getElementById('startItem');
const endItem = document.getElementById('endItem');
const totalItems = document.getElementById('totalItems');

// Global Variables
let allRegistrations = [];
let filteredRegistrations = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 15;
let searchTimeout;
let isConnected = false;

// Loading Overlay Management
function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}

// Toggle Password Visibility
togglePassword.addEventListener('click', function() {
  const type = adminPass.getAttribute('type') === 'password' ? 'text' : 'password';
  adminPass.setAttribute('type', type);
  this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
});

// Login Function
loginBtn.addEventListener('click', handleLogin);

// Enter key login
adminPass.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    handleLogin();
  }
});

async function handleLogin() {
  const email = adminEmail.value.trim();
  const password = adminPass.value.trim();

  if (!email || !password) {
    showMessage('Please enter both email and password!', 'error');
    return;
  }

  try {
    showLoading();
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update admin name
    adminName.textContent = user.email;

    showMessage('Login successful! Loading dashboard...', 'success');

    setTimeout(() => {
      loginSection.style.display = 'none';
      dashboard.style.display = 'block';
      
      // Load registrations
      loadRegistrations();
      
      // Start real-time updates
      startRealtimeUpdates();
      
      // Update server status
      updateServerStatus(true);
    }, 1500);

  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Login failed! ';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage += 'Account disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage += 'No account found.';
        break;
      case 'auth/wrong-password':
        errorMessage += 'Incorrect password.';
        break;
      case 'auth/too-many-requests':
        errorMessage += 'Too many attempts. Try later.';
        break;
      default:
        errorMessage += 'Check credentials.';
    }
    
    showMessage(errorMessage, 'error');
    updateServerStatus(false);
    
  } finally {
    hideLoading();
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
  }
}

// Logout Function
logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    dashboard.style.display = 'none';
    loginSection.style.display = 'block';
    adminEmail.value = '';
    adminPass.value = '';
    showMessage('Logged out successfully!', 'success');
    updateServerStatus(false);
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Check Authentication State
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User is signed in:', user.email);
    adminName.textContent = user.email;
    loginSection.style.display = 'none';
    dashboard.style.display = 'block';
    loadRegistrations();
    startRealtimeUpdates();
    updateServerStatus(true);
  } else {
    console.log('User is signed out');
    loginSection.style.display = 'flex';
    dashboard.style.display = 'none';
    updateServerStatus(false);
  }
});

// Load Registrations from Firebase
async function loadRegistrations() {
  try {
    showLoading();
    
    const registrationsRef = database.ref('registrations');
    const snapshot = await registrationsRef.once('value');
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Convert object to array
      allRegistrations = Object.entries(data).map(([key, value]) => ({
        key,
        ...value,
        timestamp: value.timestamp || Date.now(),
        reg_id: value.reg_id || key.substring(0, 8).toUpperCase()
      }));
      
      // Sort by timestamp (newest first)
      allRegistrations.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`Loaded ${allRegistrations.length} registrations`);
      
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
    updateServerStatus(false);
  } finally {
    hideLoading();
  }
}

// Start Real-time Updates
function startRealtimeUpdates() {
  const registrationsRef = database.ref('registrations');
  
  registrationsRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      allRegistrations = Object.entries(data).map(([key, value]) => ({
        key,
        ...value,
        timestamp: value.timestamp || Date.now(),
        reg_id: value.reg_id || key.substring(0, 8).toUpperCase()
      }));
      
      allRegistrations.sort((a, b) => b.timestamp - a.timestamp);
      updateStats();
      applyFilters();
      updateServerStatus(true);
    }
  }, (error) => {
    console.error('Realtime update error:', error);
    updateServerStatus(false);
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
  
  totalRegistrations.textContent = total.toLocaleString();
  pendingRegistrations.textContent = pending.toLocaleString();
  approvedRegistrations.textContent = approved.toLocaleString();
  todayRegistrations.textContent = todayRegs.toLocaleString();
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
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filteredRegistrations = filteredRegistrations.filter(r => 
      (r.name && r.name.toLowerCase().includes(searchTerm)) ||
      (r.roll && r.roll.toLowerCase().includes(searchTerm)) ||
      (r.phone && r.phone.includes(searchTerm)) ||
      (r.email && r.email.toLowerCase().includes(searchTerm)) ||
      (r.reg_id && r.reg_id.toLowerCase().includes(searchTerm)) ||
      (r.txid && r.txid.toLowerCase().includes(searchTerm))
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
        <td colspan="9" style="text-align: center; padding: 50px; color: #666;">
          <i class="fas fa-inbox" style="font-size: 50px; margin-bottom: 20px; opacity: 0.3;"></i>
          <h3 style="margin-bottom: 10px; font-weight: 600;">No registrations found</h3>
          <p style="font-size: 14px;">Try adjusting your filters or search term</p>
        </td>
      </tr>
    `;
    return;
  }
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredRegistrations.length);
  const pageRegistrations = filteredRegistrations.slice(startIndex, endIndex);
  
  // Generate table rows
  tableBody.innerHTML = pageRegistrations.map(reg => {
    const date = new Date(reg.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <tr data-key="${reg.key}">
        <td><strong>${reg.reg_id || reg.key.substring(0, 8)}</strong></td>
        <td>${reg.name || 'N/A'}</td>
        <td>${reg.roll || 'N/A'}</td>
        <td>${reg.phone || 'N/A'}</td>
        <td>
          <span style="display: flex; align-items: center; gap: 8px;">
            <i class="fas ${reg.payment === 'bKash' ? 'fa-mobile-alt' : 'fa-wallet'}"></i>
            ${reg.payment || 'N/A'}
          </span>
        </td>
        <td><code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${reg.txid || 'N/A'}</code></td>
        <td>
          <span class="status-badge status-${(reg.status || 'Pending').toLowerCase()}">
            ${reg.status || 'Pending'}
          </span>
        </td>
        <td>
          <div style="font-size: 13px; color: #666;">
            ${formattedDate}<br>
            <small>${formattedTime}</small>
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="action-btn view-btn" onclick="showDetails('${reg.key}')">
              <i class="fas fa-eye"></i> View
            </button>
            ${reg.status === 'Pending' ? `
              <button class="action-btn approve-btn" onclick="approveRegistration('${reg.key}')">
                <i class="fas fa-check"></i> Approve
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update Pagination
function updatePagination() {
  const totalItemsCount = filteredRegistrations.length;
  const totalPages = Math.ceil(totalItemsCount / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItemsCount);
  
  totalItems.textContent = totalItemsCount.toLocaleString();
  startItem.textContent = startIndex.toLocaleString();
  endItem.textContent = endIndex.toLocaleString();
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Show Registration Details
window.showDetails = async function(key) {
  try {
    const reg = allRegistrations.find(r => r.key === key);
    if (!reg) return;
    
    // Create modal dynamically
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    `;
    
    const date = new Date(reg.timestamp);
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 15px; width: 100%; max-width: 800px; max-height: 80vh; overflow: auto; animation: slideDown 0.3s ease;">
        <div style="background: linear-gradient(135deg, #0b3c5d, #09507d); color: white; padding: 25px 30px; border-radius: 15px 15px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 20px;">
            <i class="fas fa-user"></i> Registration Details
          </h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s;">
            &times;
          </button>
        </div>
        <div style="padding: 30px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
            <!-- Student Information -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #0b3c5d;">
              <h4 style="color: #0b3c5d; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 16px;">
                <i class="fas fa-user-circle"></i> Student Information
              </h4>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Full Name:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${reg.name || 'N/A'}</span>
              </div>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">College Roll:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${reg.roll || 'N/A'}</span>
              </div>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Group/Department:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${reg.group || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">HSC Year:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${reg.hsc || 'N/A'}</span>
              </div>
            </div>
            
            <!-- Contact Information -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #0b3c5d;">
              <h4 style="color: #0b3c5d; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 16px;">
                <i class="fas fa-address-card"></i> Contact Information
              </h4>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Phone Number:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${reg.phone || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Email Address:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${reg.email || 'N/A'}</span>
              </div>
            </div>
            
            <!-- Payment Information -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #0b3c5d;">
              <h4 style="color: #0b3c5d; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 16px;">
                <i class="fas fa-money-bill-wave"></i> Payment Information
              </h4>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Payment Method:</span>
                <span style="color: #0b3c5d; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                  <i class="fas ${reg.payment === 'bKash' ? 'fa-mobile-alt' : 'fa-wallet'}"></i>
                  ${reg.payment || 'N/A'}
                </span>
              </div>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Transaction ID:</span>
                <span style="color: #0b3c5d; font-weight: 500;">
                  <code style="background: #f1f1f1; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-family: 'Courier New', monospace;">${reg.txid || 'N/A'}</code>
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Amount:</span>
                <span style="color: #0b3c5d; font-weight: 500; font-size: 16px;">৳ ${reg.payment_amount || '1500'}</span>
              </div>
            </div>
            
            <!-- Registration Details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #0b3c5d;">
              <h4 style="color: #0b3c5d; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 16px;">
                <i class="fas fa-info-circle"></i> Registration Details
              </h4>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Registration ID:</span>
                <span style="color: #0b3c5d; font-weight: 500; font-size: 15px;"><strong>${reg.reg_id || reg.key.substring(0, 8)}</strong></span>
              </div>
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Status:</span>
                <span style="color: #0b3c5d; font-weight: 500;">
                  <span style="padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; background: ${reg.status === 'Approved' ? '#d4edda' : '#fff3cd'}; color: ${reg.status === 'Approved' ? '#155724' : '#856404'}; border: 1px solid ${reg.status === 'Approved' ? '#c3e6cb' : '#ffeaa7'};">
                    ${reg.status || 'Pending'}
                  </span>
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #555; font-size: 14px;">Registered On:</span>
                <span style="color: #0b3c5d; font-weight: 500;">${formattedDate}</span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
            ${reg.status === 'Pending' ? `
              <button onclick="approveRegistration('${reg.key}'); this.parentElement.parentElement.parentElement.parentElement.remove()" style="padding: 12px 30px; background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s;">
                <i class="fas fa-check"></i> Approve Registration
              </button>
            ` : ''}
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="padding: 12px 30px; background: #f8f9fa; color: #666; border: 2px solid #ddd; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s;">
              <i class="fas fa-times"></i> Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideDown {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .modal button:hover {
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        style.remove();
      }
    });
    
    // Close button hover effect
    const closeBtn = modal.querySelector('button');
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    
  } catch (error) {
    console.error('Error showing details:', error);
    showToast('Failed to load registration details', 'error');
  }
};

// Approve Registration
window.approveRegistration = async function(key) {
  const reg = allRegistrations.find(r => r.key === key);
  if (!reg) return;
  
  if (!confirm(`Are you sure you want to approve registration for ${reg.name}?\n\nAn approval email will be sent to ${reg.email}`)) {
    return;
  }
  
  try {
    showLoading();
    
    // Update status in Firebase
    const updates = {
      status: 'Approved',
      approvedAt: Date.now(),
      approvedBy: adminName.textContent || 'Admin'
    };
    
    await database.ref(`registrations/${key}`).update(updates);
    
    // Update local registration
    const regIndex = allRegistrations.findIndex(r => r.key === key);
    if (regIndex !== -1) {
      allRegistrations[regIndex] = { ...allRegistrations[regIndex], ...updates };
    }
    
    updateStats();
    applyFilters();
    
    // Send approval email using your template
    if (reg.email && reg.email.includes('@')) {
      const emailResult = await sendApprovalEmail(reg, key);
      if (emailResult.success) {
        showToast(`Registration approved and email sent to ${reg.name}!`, 'success');
      } else {
        showToast(`Registration approved for ${reg.name}! (Email failed: ${emailResult.error})`, 'warning');
      }
    } else {
      showToast(`Registration approved for ${reg.name}! (No email sent - invalid email)`, 'warning');
    }
    
  } catch (error) {
    console.error('Error approving registration:', error);
    showToast('Failed to approve registration: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
};

// Send Approval Email via EmailJS - আপনার template ব্যবহার করে
async function sendApprovalEmail(registration, key) {
  try {
    const templateParams = {
      student_name: registration.name,
      reg_id: registration.reg_id || key.substring(0, 8).toUpperCase(),
      to_email: registration.email
    };

    console.log('Sending approval email to:', registration.email);
    console.log('EmailJS Config:', EMAILJS_CONFIG);
    console.log('Template Params:', templateParams);
    
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );
    
    console.log('Email sent successfully:', response);
    return { success: true, response };
    
  } catch (error) {
    console.error('Email sending error:', error);
    console.error('Error details:', {
      message: error.message,
      text: error.text,
      status: error.status
    });
    return { 
      success: false, 
      error: error.text || error.message || 'Unknown error' 
    };
  }
}

// Export to CSV
exportBtn.addEventListener('click', () => {
  if (filteredRegistrations.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }
  
  try {
    const headers = ['Registration ID', 'Name', 'Roll', 'Phone', 'Email', 'Group', 'HSC Year', 'Payment Method', 'Transaction ID', 'Status', 'Registered Date', 'Amount', 'Approved Date', 'Approved By'];
    
    const csvData = filteredRegistrations.map(reg => {
      const date = new Date(reg.timestamp);
      const approvedDate = reg.approvedAt ? new Date(reg.approvedAt).toLocaleDateString('en-US') : '';
      
      return [
        reg.reg_id || reg.key.substring(0, 8),
        reg.name || '',
        reg.roll || '',
        reg.phone || '',
        reg.email || '',
        reg.group || '',
        reg.hsc || '',
        reg.payment || '',
        reg.txid || '',
        reg.status || 'Pending',
        date.toLocaleDateString('en-US'),
        reg.payment_amount || '1500',
        approvedDate,
        reg.approvedBy || ''
      ];
    });
    
    const csv = [headers, ...csvData].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `gmmcc_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredRegistrations.length} registrations to CSV`, 'success');
    
  } catch (error) {
    console.error('Export error:', error);
    showToast('Failed to export data', 'error');
  }
});

// Event Listeners
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 500);
});

paymentFilter.addEventListener('change', applyFilters);

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    this.classList.add('active');
    currentFilter = this.dataset.filter;
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
  showToast('Data refreshed successfully!', 'success');
});

// Helper Functions
function showMessage(message, type) {
  loginMsg.textContent = message;
  loginMsg.className = `message ${type}`;
  loginMsg.style.display = 'block';
  
  setTimeout(() => {
    loginMsg.style.display = 'none';
  }, 3000);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'flex';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function updateServerStatus(connected) {
  isConnected = connected;
  
  if (serverStatus && serverStatusText) {
    if (connected) {
      serverStatus.className = 'fas fa-circle connected';
      serverStatusText.textContent = 'Connected';
      serverStatus.style.color = '#2ecc71';
      serverStatus.parentElement.classList.add('connected');
      serverStatus.parentElement.classList.remove('disconnected');
    } else {
      serverStatus.className = 'fas fa-circle disconnected';
      serverStatusText.textContent = 'Disconnected';
      serverStatus.style.color = '#e74c3c';
      serverStatus.parentElement.classList.add('disconnected');
      serverStatus.parentElement.classList.remove('connected');
    }
  }
}

// Auto-focus email input on page load
window.addEventListener('load', () => {
  adminEmail.focus();
  updateServerStatus(false);
  
  // Check Firebase connection
  testFirebaseConnection();
});

// Test Firebase Connection
async function testFirebaseConnection() {
  try {
    const testRef = database.ref('.info/connected');
    testRef.on('value', (snapshot) => {
      updateServerStatus(snapshot.val() === true);
    });
  } catch (error) {
    console.error('Firebase connection test error:', error);
    updateServerStatus(false);
  }
}

// EmailJS Test Function (Debugging এর জন্য)
window.testEmailJS = async function() {
  try {
    const testParams = {
      student_name: 'Test Student',
      reg_id: 'GMMCC-2026-TEST',
      to_email: 'test@example.com'
    };
    
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      testParams
    );
    
    console.log('EmailJS Test Successful:', response);
    showToast('EmailJS test successful!', 'success');
    
  } catch (error) {
    console.error('EmailJS Test Failed:', error);
    showToast(`EmailJS test failed: ${error.text || error.message}`, 'error');
  }
};

// Add connection status styles
const connectionStyles = document.createElement('style');
connectionStyles.textContent = `
.server-status.connected {
  color: #2ecc71;
}
.server-status.disconnected {
  color: #e74c3c;
}
.server-status i {
  margin-right: 8px;
}
`;
document.head.appendChild(connectionStyles);

// Add toast notification styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 15px 25px;
  background: #333;
  color: white;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: none;
  align-items: center;
  gap: 15px;
  animation: slideInRight 0.3s ease;
  max-width: 400px;
  border-left: 5px solid;
}

.toast.success {
  background: #2ecc71;
  border-left-color: #27ae60;
}

.toast.error {
  background: #e74c3c;
  border-left-color: #c0392b;
}

.toast.info {
  background: #3498db;
  border-left-color: #2980b9;
}

.toast.warning {
  background: #f39c12;
  border-left-color: #d68910;
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(toastStyles);
