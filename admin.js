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

// Initialize Firebase v8
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth();
const database = firebase.database();

// Initialize EmailJS - আপনার Public Key
emailjs.init("i3L63-9eZOLxLsVkF");

// EmailJS Configuration
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
const itemsPerPage = 10;
let searchTimeout;

// Loading Overlay Management
function showLoading(message = 'Loading...') {
  if (loadingOverlay) {
    loadingOverlay.querySelector('.loading-text').textContent = message;
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
  this.innerHTML = type === 'password' ? 
    '<i class="fas fa-eye"></i>' : 
    '<i class="fas fa-eye-slash"></i>';
});

// Login Function
loginBtn.addEventListener('click', handleLogin);
adminPass.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') handleLogin();
});

function handleLogin() {
  const email = adminEmail.value.trim();
  const password = adminPass.value.trim();

  if (!email || !password) {
    showMessage('Please enter both email and password!', 'error');
    return;
  }

  showLoading('Signing in...');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

  // Firebase v8 signInWithEmailAndPassword
  auth.signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      const user = userCredential.user;
      
      showMessage('Login successful!', 'success');
      adminName.textContent = user.email.split('@')[0];

      setTimeout(() => {
        loginSection.style.display = 'none';
        dashboard.style.display = 'block';
        loadRegistrations();
        startRealtimeUpdates();
        updateServerStatus(true);
        showToast('Welcome to GMMCC Admin Panel', 'success');
      }, 1000);
    })
    .catch(function(error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed! ';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Try again later.';
          break;
        default:
          errorMessage = 'Check your credentials and try again.';
      }
      
      showMessage(errorMessage, 'error');
      updateServerStatus(false);
    })
    .finally(function() {
      hideLoading();
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
    });
}

// Logout Function
logoutBtn.addEventListener('click', function() {
  showLoading('Logging out...');
  
  auth.signOut()
    .then(function() {
      // Clear data
      allRegistrations = [];
      filteredRegistrations = [];
      
      // Switch to login
      dashboard.style.display = 'none';
      loginSection.style.display = 'flex';
      adminEmail.value = '';
      adminPass.value = '';
      adminEmail.focus();
      
      showMessage('Logged out successfully!', 'success');
      updateServerStatus(false);
    })
    .catch(function(error) {
      console.error('Logout error:', error);
      showToast('Logout failed', 'error');
    })
    .finally(function() {
      hideLoading();
    });
});

// Check Authentication State
auth.onAuthStateChanged(function(user) {
  if (user) {
    console.log('Admin signed in:', user.email);
    adminName.textContent = user.email.split('@')[0];
    loginSection.style.display = 'none';
    dashboard.style.display = 'block';
    
    // Load initial data
    loadRegistrations();
    startRealtimeUpdates();
    updateServerStatus(true);
    
  } else {
    console.log('Admin signed out');
    loginSection.style.display = 'flex';
    dashboard.style.display = 'none';
    updateServerStatus(false);
  }
});

// Load Registrations from Firebase
function loadRegistrations() {
  showLoading('Loading registrations...');
  
  database.ref('registrations').once('value')
    .then(function(snapshot) {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Convert object to array
        allRegistrations = Object.keys(data).map(key => ({
          id: key,
          reg_id: data[key].reg_id || `GMMCC-${key.substring(0, 6).toUpperCase()}`,
          name: data[key].name || '',
          roll: data[key].roll || '',
          phone: data[key].phone || '',
          email: data[key].email || '',
          group: data[key].group || '',
          hsc: data[key].hsc || '',
          payment: data[key].payment || '',
          txid: data[key].txid || '',
          payment_amount: data[key].payment_amount || '1500',
          status: data[key].status || 'Pending',
          timestamp: data[key].timestamp || Date.now(),
          approvedAt: data[key].approvedAt || null,
          approvedBy: data[key].approvedBy || ''
        }));
        
        // Sort by timestamp (newest first)
        allRegistrations.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`Loaded ${allRegistrations.length} registrations`);
        
        // Update UI
        updateStats();
        applyFilters();
        
      } else {
        allRegistrations = [];
        updateStats();
        applyFilters();
        showToast('No registrations found yet', 'info');
      }
    })
    .catch(function(error) {
      console.error('Error loading registrations:', error);
      showToast('Failed to load registrations', 'error');
      updateServerStatus(false);
    })
    .finally(function() {
      hideLoading();
    });
}

// Start Real-time Updates
function startRealtimeUpdates() {
  const registrationsRef = database.ref('registrations');
  
  registrationsRef.on('value', function(snapshot) {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      allRegistrations = Object.keys(data).map(key => ({
        id: key,
        reg_id: data[key].reg_id || `GMMCC-${key.substring(0, 6).toUpperCase()}`,
        name: data[key].name || '',
        roll: data[key].roll || '',
        phone: data[key].phone || '',
        email: data[key].email || '',
        group: data[key].group || '',
        hsc: data[key].hsc || '',
        payment: data[key].payment || '',
        txid: data[key].txid || '',
        payment_amount: data[key].payment_amount || '1500',
        status: data[key].status || 'Pending',
        timestamp: data[key].timestamp || Date.now(),
        approvedAt: data[key].approvedAt || null,
        approvedBy: data[key].approvedBy || ''
      }));
      
      allRegistrations.sort((a, b) => b.timestamp - a.timestamp);
      updateStats();
      applyFilters();
      updateServerStatus(true);
    }
  }, function(error) {
    console.error('Realtime update error:', error);
    updateServerStatus(false);
    showToast('Connection lost. Retrying...', 'warning');
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
  let results = [...allRegistrations];
  
  // Apply status filter
  if (currentFilter !== 'all') {
    results = results.filter(r => r.status === currentFilter);
  }
  
  // Apply payment method filter
  const paymentValue = paymentFilter.value;
  if (paymentValue) {
    results = results.filter(r => r.payment === paymentValue);
  }
  
  // Apply search
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    results = results.filter(r => 
      (r.name && r.name.toLowerCase().includes(searchTerm)) ||
      (r.roll && r.roll.toLowerCase().includes(searchTerm)) ||
      (r.phone && r.phone.includes(searchTerm)) ||
      (r.email && r.email.toLowerCase().includes(searchTerm)) ||
      (r.reg_id && r.reg_id.toLowerCase().includes(searchTerm)) ||
      (r.txid && r.txid.toLowerCase().includes(searchTerm)) ||
      (r.group && r.group.toLowerCase().includes(searchTerm))
    );
  }
  
  filteredRegistrations = results;
  currentPage = 1;
  updateTable();
  updatePagination();
}

// Update Table
function updateTable() {
  if (filteredRegistrations.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px 20px; color: #666;">
          <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
          <h3 style="margin-bottom: 10px; font-size: 16px; font-weight: 600;">No registrations found</h3>
          <p style="font-size: 13px;">Try adjusting your filters or search term</p>
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
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
    
    // Truncate long text for mobile
    const truncateText = (text, maxLength = 15) => {
      if (!text) return 'N/A';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    return `
      <tr data-id="${reg.id}">
        <td>
          <strong style="font-size: 12px;">${truncateText(reg.reg_id, 10)}</strong>
        </td>
        <td>${truncateText(reg.name, 12)}</td>
        <td>${reg.roll || '-'}</td>
        <td>
          <span style="font-family: monospace; font-size: 12px;">
            ${truncateText(reg.phone, 10)}
          </span>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <i class="fas ${reg.payment === 'bKash' ? 'fa-mobile-alt' : 'fa-wallet'}" style="font-size: 12px;"></i>
            <span style="font-size: 12px;">${reg.payment ? reg.payment.substring(0, 3) : '-'}</span>
          </span>
        </td>
        <td>
          <code style="background: #f8f9fa; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-family: monospace;">
            ${reg.txid ? reg.txid.substring(0, 8) + '...' : '-'}
          </code>
        </td>
        <td>
          <span class="status-badge status-${(reg.status || 'Pending').toLowerCase()}">
            ${reg.status || 'Pending'}
          </span>
        </td>
        <td>
          <div style="font-size: 11px; color: #666;">
            ${formattedDate}<br>
            <small>${formattedTime}</small>
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn view-btn" onclick="showDetails('${reg.id}')" title="View Details">
              <i class="fas fa-eye"></i> View
            </button>
            ${reg.status === 'Pending' ? `
              <button class="action-btn approve-btn" onclick="approveRegistration('${reg.id}')" title="Approve Registration">
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
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Show Registration Details Modal
window.showDetails = function(id) {
  const reg = allRegistrations.find(r => r.id === id);
  if (!reg) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  const date = new Date(reg.timestamp);
  const formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const approvedDate = reg.approvedAt ? 
    new Date(reg.approvedAt).toLocaleDateString('en-US') : 'Not approved yet';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-user-circle"></i> Registration Details
        </h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="info-group">
          <span class="info-label">Registration ID</span>
          <span class="info-value"><strong>${reg.reg_id}</strong></span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Full Name</span>
          <span class="info-value">${reg.name || 'N/A'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">College Roll</span>
          <span class="info-value">${reg.roll || 'N/A'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Group/Department</span>
          <span class="info-value">${reg.group || 'N/A'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">HSC Year</span>
          <span class="info-value">${reg.hsc || 'N/A'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Contact Phone</span>
          <span class="info-value">${reg.phone || 'N/A'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Email Address</span>
          <span class="info-value">${reg.email || 'N/A'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Payment Method</span>
          <span class="info-value">
            <i class="fas ${reg.payment === 'bKash' ? 'fa-mobile-alt' : 'fa-wallet'}"></i>
            ${reg.payment || 'N/A'}
          </span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Transaction ID</span>
          <span class="info-value">
            <code>${reg.txid || 'N/A'}</code>
          </span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Payment Amount</span>
          <span class="info-value">৳ ${reg.payment_amount || '1500'}</span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Registration Status</span>
          <span class="info-value">
            <span class="status-badge status-${(reg.status || 'Pending').toLowerCase()}">
              ${reg.status || 'Pending'}
            </span>
          </span>
        </div>
        
        <div class="info-group">
          <span class="info-label">Registered On</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        
        ${reg.approvedBy ? `
          <div class="info-group">
            <span class="info-label">Approved By</span>
            <span class="info-value">${reg.approvedBy}</span>
          </div>
          
          <div class="info-group">
            <span class="info-label">Approved On</span>
            <span class="info-value">${approvedDate}</span>
          </div>
        ` : ''}
        
        <div class="modal-actions">
          ${reg.status === 'Pending' ? `
            <button class="modal-btn approve" onclick="approveRegistration('${reg.id}'); this.closest('.modal-overlay').remove()">
              <i class="fas fa-check"></i> Approve Registration
            </button>
          ` : ''}
          <button class="modal-btn close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
};

// Approve Registration with Email Notification
window.approveRegistration = function(id) {
  const reg = allRegistrations.find(r => r.id === id);
  if (!reg) return;
  
  // Confirmation dialog
  if (!confirm(`Approve registration for ${reg.name}?\n\nAn approval email will be sent to ${reg.email || 'their email address'}.`)) {
    return;
  }
  
  showLoading('Approving registration...');
  
  // Prepare update data
  const updates = {
    status: 'Approved',
    approvedAt: Date.now(),
    approvedBy: adminName.textContent || 'Admin'
  };
  
  // Update in Firebase (Firebase v8 syntax)
  database.ref('registrations/' + id).update(updates)
    .then(function() {
      // Update local data
      Object.assign(reg, updates);
      
      // Refresh UI
      updateStats();
      applyFilters();
      showToast(`Registration approved for ${reg.name}!`, 'success');
      
      // Send approval email
      if (reg.email && isValidEmail(reg.email)) {
        setTimeout(() => {
          sendApprovalEmail(reg);
        }, 500);
      } else {
        showToast(`Approved! (No email sent - invalid email address)`, 'warning');
      }
    })
    .catch(function(error) {
      console.error('Error approving registration:', error);
      showToast('Failed to approve registration', 'error');
    })
    .finally(function() {
      hideLoading();
    });
};

// Email Validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Send Approval Email via EmailJS
function sendApprovalEmail(registration) {
  showLoading('Sending approval email...');
  
  const templateParams = {
    student_name: registration.name,
    reg_id: registration.reg_id,
    to_email: registration.email,
    from_name: 'GMMCC Picnic Committee',
    reply_to: 'gmmcc.picnic@gmail.com'
  };

  console.log('Sending approval email to:', registration.email);
  
  emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, templateParams)
    .then(function(response) {
      console.log('Email sent successfully:', response);
      showToast(`Approval email sent to ${registration.email}`, 'success');
    })
    .catch(function(error) {
      console.error('Email sending error:', error);
      showToast(`Approved! (Email failed: ${error.text || 'Network error'})`, 'warning');
    })
    .finally(function() {
      hideLoading();
    });
}

// Export to CSV
exportBtn.addEventListener('click', function() {
  if (filteredRegistrations.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }
  
  showLoading('Preparing CSV export...');
  
  try {
    const headers = [
      'Registration ID', 'Name', 'Roll', 'Phone', 'Email',
      'Group', 'HSC Year', 'Payment Method', 'Transaction ID',
      'Status', 'Amount', 'Registered Date', 'Approved Date', 'Approved By'
    ];
    
    const csvData = filteredRegistrations.map(reg => {
      const regDate = new Date(reg.timestamp);
      const approvedDate = reg.approvedAt ? new Date(reg.approvedAt) : null;
      
      return [
        reg.reg_id,
        reg.name || '',
        reg.roll || '',
        reg.phone || '',
        reg.email || '',
        reg.group || '',
        reg.hsc || '',
        reg.payment || '',
        reg.txid || '',
        reg.status || 'Pending',
        reg.payment_amount || '1500',
        regDate.toLocaleDateString('en-US'),
        approvedDate ? approvedDate.toLocaleDateString('en-US') : '',
        reg.approvedBy || ''
      ];
    });
    
    const csv = [headers, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.href = url;
    link.download = `gmmcc_registrations_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${filteredRegistrations.length} registrations`, 'success');
    
  } catch (error) {
    console.error('Export error:', error);
    showToast('Failed to export data', 'error');
    
  } finally {
    hideLoading();
  }
});

// Event Listeners
searchInput.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 300);
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
prevBtn.addEventListener('click', function() {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
    updatePagination();
  }
});

nextBtn.addEventListener('click', function() {
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
    updatePagination();
  }
});

// Refresh button
refreshBtn.addEventListener('click', function() {
  showLoading('Refreshing data...');
  setTimeout(() => {
    loadRegistrations();
    showToast('Data refreshed!', 'success');
  }, 500);
});

// Helper Functions
function showMessage(message, type) {
  if (!loginMsg) return;
  
  loginMsg.textContent = message;
  loginMsg.className = `message ${type}`;
  loginMsg.style.display = 'block';
  
  setTimeout(() => {
    loginMsg.style.display = 'none';
  }, 3000);
}

function showToast(message, type = 'info') {
  // Create toast if it doesn't exist
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'flex';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function updateServerStatus(connected) {
  if (!serverStatus || !serverStatusText) return;
  
  if (connected) {
    serverStatus.className = 'fas fa-circle';
    serverStatus.style.color = '#2ecc71';
    serverStatusText.textContent = 'Connected';
    serverStatus.parentElement.classList.add('connected');
    serverStatus.parentElement.classList.remove('disconnected');
  } else {
    serverStatus.className = 'fas fa-circle';
    serverStatus.style.color = '#e74c3c';
    serverStatusText.textContent = 'Disconnected';
    serverStatus.parentElement.classList.add('disconnected');
    serverStatus.parentElement.classList.remove('connected');
  }
}

// Initialize on page load
window.addEventListener('load', function() {
  // Auto-focus email input
  adminEmail.focus();
  
  // Test Firebase connection
  testFirebaseConnection();
  
  // Add touch-friendly class for mobile
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
  }
  
  // Prevent form submission on Enter
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
    }
  });
});

// Test Firebase Connection
function testFirebaseConnection() {
  const testRef = database.ref('.info/connected');
  testRef.on('value', function(snapshot) {
    updateServerStatus(snapshot.val() === true);
  });
}

// EmailJS Test Function
window.testEmailJS = function() {
  showLoading('Testing EmailJS...');
  
  const testParams = {
    student_name: 'Test Student',
    reg_id: 'GMMCC-2024-TEST',
    to_email: 'test@example.com',
    from_name: 'GMMCC Admin',
    reply_to: 'admin@gmmcc.edu'
  };
  
  emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, testParams)
    .then(function(response) {
      console.log('EmailJS Test Successful:', response);
      showToast('EmailJS test successful! Check your email.', 'success');
    })
    .catch(function(error) {
      console.error('EmailJS Test Failed:', error);
      showToast(`EmailJS test failed: ${error.text || error.message}`, 'error');
    })
    .finally(function() {
      hideLoading();
    });
};

// Mobile-friendly touch enhancements
document.addEventListener('touchstart', function() {}, {passive: true});

// Prevent zoom on double-tap
document.addEventListener('dblclick', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
    e.preventDefault();
  }
});
