import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, get, child } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase config
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
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Initialize EmailJS
try {
  emailjs.init("i3L63-9eZOLxLsVkF");
} catch (error) {
  console.log("EmailJS initialization warning:", error);
}

// DOM Elements
const form = document.getElementById("registrationForm");
const messageDiv = document.getElementById("message");
const regIdContainer = document.getElementById("regIdContainer");
const regIdDisplay = document.getElementById("regIdDisplay");
const submitBtn = document.getElementById("submitBtn");
const bkashRadio = document.getElementById("bkash");
const nagadRadio = document.getElementById("nagad");
const bkashDetails = document.getElementById("bkash-details");
const nagadDetails = document.getElementById("nagad-details");

// Payment numbers (আপনার নম্বর দিয়ে রিপ্লেস করবেন)
const PAYMENT_NUMBERS = {
  bKash: "01712345678", // আপনার bKash নম্বর এখানে দিন
  Nagad: "01812345678"  // আপনার Nagad নম্বর এখানে দিন
};

// Payment amount
const PAYMENT_AMOUNT = "1500";

// Payment method selection handler
function handlePaymentMethodChange() {
  // Hide all payment details first
  if (bkashDetails) bkashDetails.classList.remove('active');
  if (nagadDetails) nagadDetails.classList.remove('active');
  
  // Show selected payment method details
  if (bkashRadio && bkashRadio.checked) {
    if (bkashDetails) {
      bkashDetails.classList.add('active');
      // Update payment number in display
      const bkashNumberEl = document.querySelector('#bkash-details .number');
      const bkashCopyBtn = document.querySelector('#bkash-details .copy-btn');
      if (bkashNumberEl) bkashNumberEl.textContent = PAYMENT_NUMBERS.bKash;
      if (bkashCopyBtn) bkashCopyBtn.setAttribute('data-number', PAYMENT_NUMBERS.bKash);
    }
  } else if (nagadRadio && nagadRadio.checked) {
    if (nagadDetails) {
      nagadDetails.classList.add('active');
      // Update payment number in display
      const nagadNumberEl = document.querySelector('#nagad-details .number');
      const nagadCopyBtn = document.querySelector('#nagad-details .copy-btn');
      if (nagadNumberEl) nagadNumberEl.textContent = PAYMENT_NUMBERS.Nagad;
      if (nagadCopyBtn) nagadCopyBtn.setAttribute('data-number', PAYMENT_NUMBERS.Nagad);
    }
  }
}

// Add event listeners to payment method radios
if (bkashRadio) bkashRadio.addEventListener('change', handlePaymentMethodChange);
if (nagadRadio) nagadRadio.addEventListener('change', handlePaymentMethodChange);

// Copy to clipboard function
function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', function() {
      const number = this.getAttribute('data-number');
      copyToClipboard(number);
      
      // Show feedback
      const originalText = this.innerHTML;
      this.innerHTML = '<i class="fas fa-check"></i> Copied!';
      this.classList.add('copied');
      
      // Reset after 2 seconds
      setTimeout(() => {
        this.innerHTML = originalText;
        this.classList.remove('copied');
      }, 2000);
    });
  });
  
  // Copy registration ID button
  const copyRegIdBtn = document.querySelector('.copy-reg-id-btn');
  if (copyRegIdBtn) {
    copyRegIdBtn.addEventListener('click', function() {
      const regId = regIdDisplay.textContent;
      if (regId) {
        copyToClipboard(regId);
        
        // Show feedback
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i> Registration ID Copied!';
        this.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        
        // Reset after 2 seconds
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.background = 'linear-gradient(135deg, #0b3c5d, #09507d)';
        }, 2000);
      }
    });
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  if (!text) return;
  
  // Fallback method for older browsers
  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('Text copied to clipboard (fallback)');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  };

  // Modern clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard');
      })
      .catch(err => {
        console.error('Clipboard API failed:', err);
        fallbackCopy();
      });
  } else {
    fallbackCopy();
  }
}

// Add animation to form inputs on focus
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function() {
    this.parentElement.classList.add('focused');
  });
  
  input.addEventListener('blur', function() {
    if (!this.value) {
      this.parentElement.classList.remove('focused');
    }
  });
});

// Form submission
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Disable button and show loading state
    const originalText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').textContent = "Processing...";
    submitBtn.disabled = true;
    
    // Get form values
    const hsc = document.getElementById("hsc")?.value.trim() || "";
    const name = document.getElementById("name")?.value.trim() || "";
    const roll = document.getElementById("roll")?.value.trim() || "";
    const group = document.getElementById("group")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const payment = document.querySelector('input[name="payment"]:checked')?.value || "";
    const txid = document.getElementById("txid")?.value.trim() || "";
    
    console.log("Form values:", { hsc, name, roll, group, phone, email, payment, txid });
    
    // Validation
    if (!hsc || !name || !roll || !group || !phone || !email || !payment || !txid) {
      showMessage("Please fill all fields!", "error");
      resetButton(originalText);
      return;
    }
    
    if (!document.getElementById("terms")?.checked) {
      showMessage("Please agree to the terms and conditions!", "error");
      resetButton(originalText);
      return;
    }
    
    // Phone validation
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      showMessage("Please enter a valid Bangladeshi mobile number (013-019)!", "error");
      resetButton(originalText);
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage("Please enter a valid email address!", "error");
      resetButton(originalText);
      return;
    }
    
    // Generate Registration ID
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substr(2, 6).toUpperCase();
    const reg_id = `GMMCC-${year}-${randomPart}`;
    
    console.log("Generated Reg ID:", reg_id);
    
    try {
      // Check for duplicates
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `registrations`));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const key in data) {
          // Check for duplicate phone
          if (data[key].phone === phone) {
            showMessage("This phone number is already registered!", "error");
            resetButton(originalText);
            return;
          }
          
          // Check for duplicate email
          if (data[key].email === email) {
            showMessage("This email is already registered!", "error");
            resetButton(originalText);
            return;
          }
          
          // Check for duplicate transaction ID
          if (data[key].txid === txid) {
            showMessage("This transaction ID is already used!", "error");
            resetButton(originalText);
            return;
          }
        }
      }
      
      console.log("No duplicates found. Saving to Firebase...");
      
      // Save to Firebase - FIXED APPROACH
      const registrationsRef = ref(db, 'registrations');
      const newRegRef = push(registrationsRef);
      
      const registrationData = {
        hsc: hsc,
        name: name,
        roll: roll,
        group: group,
        phone: phone,
        email: email,
        payment: payment,
        txid: txid,
        reg_id: reg_id,
        status: "Pending",
        timestamp: Date.now(),
        payment_amount: PAYMENT_AMOUNT
      };
      
      console.log("Saving data:", registrationData);
      
      // Use set instead of update for new entry
      await set(newRegRef, registrationData);
      
      console.log("Data saved successfully!");
      
      // Success message
      showMessage("Registration successful! Your registration ID has been generated.", "success");
      
      // Show registration ID
      if (regIdDisplay) {
        regIdDisplay.textContent = reg_id;
      }
      if (regIdContainer) {
        regIdContainer.classList.add("show");
      }
      
      // Scroll to registration ID
      setTimeout(() => {
        if (regIdContainer) {
          regIdContainer.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      
      // Send confirmation email (optional - remove if not needed)
      try {
        // Only if you have EmailJS configured
        if (typeof emailjs !== 'undefined') {
          const emailResult = await emailjs.send("service_i3l63-9ezolxlsvkf", "template_default", {
            to_email: email,
            to_name: name,
            reg_id: reg_id,
            college: "GMMCC",
            payment_method: payment
          });
          console.log("Email sent:", emailResult);
        }
      } catch (emailError) {
        console.log("Email sending failed (not critical):", emailError);
        // Don't show error to user, email is optional
      }
      
      // Reset form after 5 seconds
      setTimeout(() => {
        if (form) {
          form.reset();
          // Reset payment details visibility
          if (bkashDetails) bkashDetails.classList.remove('active');
          if (nagadDetails) nagadDetails.classList.remove('active');
          // Reset radio buttons
          if (bkashRadio) bkashRadio.checked = false;
          if (nagadRadio) nagadRadio.checked = false;
        }
        if (regIdContainer) {
          regIdContainer.classList.remove("show");
        }
      }, 5000);
      
    } catch (error) {
      console.error("Registration error details:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      let errorMessage = "An error occurred. Please try again!";
      
      // Firebase specific error handling
      if (error.code) {
        switch (error.code) {
          case 'PERMISSION_DENIED':
            errorMessage = "Database permission denied. Please check Firebase rules.";
            break;
          case 'UNAVAILABLE':
            errorMessage = "Network error. Please check your internet connection.";
            break;
          case 'UNKNOWN':
            errorMessage = "Unknown error. Please refresh the page and try again.";
            break;
        }
      }
      
      showMessage(errorMessage, "error");
      
      // Try to show more detailed error in console
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    } finally {
      resetButton(originalText);
    }
  });
}

// Helper functions
function showMessage(text, type) {
  if (messageDiv) {
    messageDiv.textContent = text;
    messageDiv.className = `message-container ${type}`;
    messageDiv.style.display = "block";
    
    // Auto-hide message after 5 seconds
    setTimeout(() => {
      if (messageDiv) {
        messageDiv.style.display = "none";
      }
    }, 5000);
  } else {
    alert(`${type.toUpperCase()}: ${text}`);
  }
}

function resetButton(originalText) {
  if (submitBtn) {
    submitBtn.querySelector('.btn-text').textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Debug function to check Firebase connection
async function testFirebaseConnection() {
  try {
    console.log("Testing Firebase connection...");
    const testRef = ref(db, 'test');
    await set(push(testRef), { test: Date.now() });
    console.log("Firebase connection successful!");
    return true;
  } catch (error) {
    console.error("Firebase connection test failed:", error);
    return false;
  }
}

// Initialize the page
window.addEventListener('load', () => {
  console.log("Page loaded, initializing...");
  
  // Test Firebase connection
  testFirebaseConnection().then(success => {
    if (!success) {
      showMessage("Warning: Cannot connect to database. Some features may not work.", "error");
    }
  });
  
  // Set payment amount in all displays
  document.querySelectorAll('.amount').forEach(amountEl => {
    if (amountEl) amountEl.textContent = PAYMENT_AMOUNT;
  });
  
  // Set payment numbers
  const bkashNumberEl = document.querySelector('#bkash-details .number');
  const nagadNumberEl = document.querySelector('#nagad-details .number');
  
  if (bkashNumberEl) bkashNumberEl.textContent = PAYMENT_NUMBERS.bKash;
  if (nagadNumberEl) nagadNumberEl.textContent = PAYMENT_NUMBERS.Nagad;
  
  // Setup copy buttons
  setupCopyButtons();
  
  // Add typing effect to form title (if element exists)
  const formTitle = document.querySelector('.form-header h2');
  if (formTitle) {
    const originalText = formTitle.textContent;
    formTitle.textContent = '';
    let i = 0;
    
    function typeWriter() {
      if (i < originalText.length) {
        formTitle.textContent += originalText.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
      }
    }
    
    // Start typing effect after a delay
    setTimeout(typeWriter, 1000);
  }
  
  // Check if all required elements exist
  if (!form) console.error("Form element not found!");
  if (!submitBtn) console.error("Submit button not found!");
  if (!messageDiv) console.error("Message div not found!");
  
  console.log("Initialization complete!");
});

// Add global error handler
window.addEventListener('error', function(event) {
  console.error('Global error:', event.error);
  console.error('In file:', event.filename);
  console.error('At line:', event.lineno, 'column:', event.colno);
});

// Also catch promise rejections
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});
