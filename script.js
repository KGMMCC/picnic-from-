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
emailjs.init("i3L63-9eZOLxLsVkF");

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
  bKash: "01XXX XXXXXX",
  Nagad: "01XXX XXXXXX"
};

// Payment amount
const PAYMENT_AMOUNT = "1500";

// Payment method selection handler
function handlePaymentMethodChange() {
  // Hide all payment details first
  bkashDetails.classList.remove('active');
  nagadDetails.classList.remove('active');
  
  // Show selected payment method details
  if (bkashRadio.checked) {
    bkashDetails.classList.add('active');
    // Update payment number in display
    document.querySelector('#bkash-details .number').textContent = PAYMENT_NUMBERS.bKash;
    document.querySelector('#bkash-details .copy-btn').setAttribute('data-number', PAYMENT_NUMBERS.bKash);
  } else if (nagadRadio.checked) {
    nagadDetails.classList.add('active');
    // Update payment number in display
    document.querySelector('#nagad-details .number').textContent = PAYMENT_NUMBERS.Nagad;
    document.querySelector('#nagad-details .copy-btn').setAttribute('data-number', PAYMENT_NUMBERS.Nagad);
  }
}

// Add event listeners to payment method radios
bkashRadio.addEventListener('change', handlePaymentMethodChange);
nagadRadio.addEventListener('change', handlePaymentMethodChange);

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
  document.querySelector('.copy-reg-id-btn')?.addEventListener('click', function() {
    const regId = regIdDisplay.textContent;
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
  });
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Text copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    // Fallback method
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  });
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
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Disable button and show loading state
  const originalText = submitBtn.querySelector('.btn-text').textContent;
  submitBtn.querySelector('.btn-text').textContent = "Processing...";
  submitBtn.disabled = true;
  
  // Get form values
  const hsc = document.getElementById("hsc").value.trim();
  const name = document.getElementById("name").value.trim();
  const roll = document.getElementById("roll").value.trim();
  const group = document.getElementById("group").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const payment = document.querySelector('input[name="payment"]:checked')?.value;
  const txid = document.getElementById("txid").value.trim();
  
  // Validation
  if (!hsc || !name || !roll || !group || !phone || !email || !payment || !txid) {
    showMessage("Please fill all fields!", "error");
    resetButton(originalText);
    return;
  }
  
  if (!document.getElementById("terms").checked) {
    showMessage("Please agree to the terms and conditions!", "error");
    resetButton(originalText);
    return;
  }
  
  // Phone validation
  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!phoneRegex.test(phone)) {
    showMessage("Please enter a valid Bangladeshi mobile number!", "error");
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
  
  // Check if payment method is selected
  if (!payment) {
    showMessage("Please select a payment method!", "error");
    resetButton(originalText);
    return;
  }
  
  // Generate Registration ID
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substr(2, 6).toUpperCase();
  const reg_id = `GMMCC-${year}-${randomPart}`;
  
  // Check for duplicates
  try {
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
    
    // Save to Firebase
    const newRegRef = push(ref(db, "registrations"));
    await set(newRegRef, {
      hsc, 
      name, 
      roll, 
      group, 
      phone, 
      email, 
      payment, 
      txid, 
      reg_id, 
      status: "Pending", 
      timestamp: Date.now(),
      verified: false,
      payment_amount: PAYMENT_AMOUNT
    });
    
    // Success message
    showMessage("Registration successful! Your registration ID has been generated.", "success");
    
    // Show registration ID
    regIdDisplay.textContent = reg_id;
    regIdContainer.classList.add("show");
    
    // Scroll to registration ID
    setTimeout(() => {
      regIdContainer.scrollIntoView({ behavior: 'smooth' });
    }, 500);
    
    // Send confirmation email (optional)
    try {
      await emailjs.send("service_id", "template_id", {
        to_email: email,
        to_name: name,
        reg_id: reg_id,
        college: "GMMCC",
        payment_method: payment
      });
    } catch (emailError) {
      console.log("Email sending failed:", emailError);
    }
    
    // Reset form after 10 seconds
    setTimeout(() => {
      form.reset();
      regIdContainer.classList.remove("show");
      // Hide payment details
      bkashDetails.classList.remove('active');
      nagadDetails.classList.remove('active');
    }, 10000);
    
  } catch (error) {
    console.error("Registration error:", error);
    showMessage("An error occurred. Please try again!", "error");
  } finally {
    resetButton(originalText);
  }
});

// Helper functions
function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = "message-container " + type;
  messageDiv.style.display = "block";
  
  // Auto-hide message after 5 seconds
  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

function resetButton(originalText) {
  submitBtn.querySelector('.btn-text').textContent = originalText;
  submitBtn.disabled = false;
}

// Initialize the page
window.addEventListener('load', () => {
  // Set payment amount in all displays
  document.querySelectorAll('.amount').forEach(amountEl => {
    amountEl.textContent = PAYMENT_AMOUNT;
  });
  
  // Set payment numbers
  document.querySelector('#bkash-details .number').textContent = PAYMENT_NUMBERS.bKash;
  document.querySelector('#nagad-details .number').textContent = PAYMENT_NUMBERS.Nagad;
  
  // Setup copy buttons
  setupCopyButtons();
  
  // Add typing effect to form title
  const formTitle = document.querySelector('.form-header h2');
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
});
