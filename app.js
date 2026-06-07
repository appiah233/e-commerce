/* ============================================================
   EmyAfroBeads — Premium Ecommerce Application (Integrated Backend)
   ============================================================ */

// ---- State ----
let products = [];
const currencyConfig = {
  GHS: { code: "GHS", symbol: "₵", rate: 1, locale: "en-GH" },
  USD: { code: "USD", symbol: "$", rate: 0.063, locale: "en-US" },
  GBP: { code: "GBP", symbol: "£", rate: 0.050, locale: "en-GB" },
  EUR: { code: "EUR", symbol: "€", rate: 0.058, locale: "en-DE" }
};

let currentCurrency = localStorage.getItem("emy_currency") || "GHS";
const cart = new Map(JSON.parse(localStorage.getItem("emy_cart") || "[]"));
const wishlist = new Set(JSON.parse(localStorage.getItem("emy_wishlist") || "[]"));

const state = {
  filter: "All",
  sort: "featured",
  search: ""
};

// ---- Auth State ----
let currentUser = JSON.parse(localStorage.getItem("emy_user") || "null");
let authToken = localStorage.getItem("emy_token") || "";

// ---- DOM References ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const productGrid = $("#productGrid");
const filterButtons = $$(".filter-button");
const sortSelect = $("#sortSelect");
const searchInput = $("#searchInput");
const searchDropdown = $("#searchDropdown");
const cartButton = $("#cartButton");
const cartDrawer = $("#cartDrawer");
const cartOverlay = $("#cartOverlay");
const closeCartBtn = $("#closeCart");
const cartItemsEl = $("#cartItems");
const cartTotalEl = $("#cartTotal");
const cartSubtotalEl = $("#cartSubtotal");
const cartCountEl = $("#cartCount");
const cartEmptyEl = $("#cartEmpty");
const clearCartBtn = $("#clearCart");
const checkoutButton = $("#checkoutButton");
const quickAddButton = $("[data-quick-add]");
const themeToggle = $("#themeToggle");
const currencySelect = $("#currencySelect");
const backToTop = $("#backToTop");
const toastContainer = $("#toastContainer");
const mainNav = $("#mainNav");
const hamburgerBtn = $("#hamburgerBtn");
const mobileNav = $("#mobileNav");
const mobileNavOverlay = $("#mobileNavOverlay");
const mobileNavClose = $("#mobileNavClose");
const newsletterForm = $("#newsletterForm");
const newsletterSuccess = $("#newsletterSuccess");

// New Auth DOM references
const authModal = $("#authModal");
const authOverlay = $("#authOverlay");
const authClose = $("#authClose");
const userButton = $("#userButton");
const userBadge = $("#userBadge");
const tabLogin = $("#tabLogin");
const tabRegister = $("#tabRegister");
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const authTitle = $("#authTitle");

// ---- Utility: Format Price ----
function formatPrice(priceGHS) {
  const config = currencyConfig[currentCurrency];
  const converted = Number(priceGHS) * config.rate;
  if (Number.isNaN(converted)) return "";
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    maximumFractionDigits: 0
  }).format(converted);
}

function getProductImage(image) {
  const waistImage = "images/waist_beads.png";
  if (!image) return waistImage;
  const legacyImages = [
    "images/ig1.jpg",
    "images/ig2.jpg",
    "images/ig3.jpg",
    "images/hero_beads.png",
    "images/necklace_beads.png",
    "images/anklet_beads.png"
  ];
  return legacyImages.includes(image) ? waistImage : image;
}

const strandOptions = [50, 75, 100, 200];

function getStrandOptionsHTML(current = 50) {
  let options = strandOptions
    .map(
      (value) =>
        `<option value="${value}" ${value === current ? "selected" : ""}>${value} strands</option>`
    )
    .join("");

  if (!strandOptions.includes(current)) {
    options += `<option value="${current}" selected>${current} strands</option>`;
  }

  return options;
}

// ---- Utility: Star Rating HTML ----
function starHTML(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

// ---- Toast Notifications ----
function showToast(message, icon = "✓") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast-icon">${icon}</span>${message}`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 2800);
}

// ---- Save State ----
function saveCart() {
  localStorage.setItem("emy_cart", JSON.stringify(Array.from(cart.entries())));
}

function saveWishlist() {
  localStorage.setItem("emy_wishlist", JSON.stringify(Array.from(wishlist)));
}

// ---- Fetch Products from Backend (Optimized Loading & Seeding) ----
async function fetchProducts() {
  // Show skeleton loading shimmers for top-tier visual experience
  productGrid.innerHTML = Array(6)
    .fill(0)
    .map(
      () => `
      <div class="shimmer-card">
        <div class="shimmer-media"></div>
        <div class="shimmer-line title"></div>
        <div class="shimmer-line desc"></div>
        <div class="shimmer-line price"></div>
      </div>
    `
    )
    .join("");

  try {
    const res = await fetch("/api/products");
    const json = await res.json();

    if (json.status === "success") {
      // If database is empty, seed automatically for immediate operation
      if (json.data.length === 0) {
        console.log("Product catalog is empty. Seeding database...");
        const seedRes = await fetch("/api/products/seed", { method: "POST" });
        const seedJson = await seedRes.json();
        if (seedJson.status === "success") {
          return fetchProducts(); // Re-fetch after seeding
        }
      }

      products = json.data;
      renderProducts();
    } else {
      throw new Error(json.message || "Failed to load products");
    }
  } catch (error) {
    console.error("Failed to load products from API:", error);
    productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--ink-muted);">
        <p style="font-size: 48px; margin-bottom: 12px;">⚠️</p>
        <p style="font-size: 18px; font-weight: 600;">Unable to connect to the store</p>
        <p style="font-size: 14px; margin-top: 6px;">Please check your internet connection or server status.</p>
        <button class="btn primary sm" onclick="fetchProducts()" style="margin-top: 16px;">Try Again</button>
      </div>
    `;
  }
}

// ---- Render Products ----
function renderProducts() {
  const list = products
    .filter((p) => state.filter === "All" || p.category === state.filter)
    .filter((p) => {
      if (!state.search) return true;
      const q = state.search;
      return (
        p.name.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (state.sort === "low") return a.price - b.price;
      if (state.sort === "high") return b.price - a.price;
      if (state.sort === "rating") return b.rating - a.rating;
      return 0;
    });

  if (list.length === 0) {
    productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--ink-muted);">
        <p style="font-size: 48px; margin-bottom: 12px;">🔍</p>
        <p style="font-size: 18px; font-weight: 600;">No beads found</p>
        <p style="font-size: 14px; margin-top: 6px;">Try a different search or filter.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = list
    .map((product, index) => {
      const id = product._id;
      const isWishlisted = wishlist.has(id);
      const imageSrc = getProductImage(product.image);
      return `
        <article class="product-card" style="--i: ${index};" data-product-id="${id}">
          <button class="wishlist-btn ${isWishlisted ? "is-wishlisted" : ""}" type="button" data-wishlist="${id}" aria-label="Add to wishlist">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path></svg>
          </button>
          <div class="product-visual" data-view="${id}">
            <img src="${imageSrc}" alt="${product.name}" loading="lazy" onerror="this.src='images/waist_beads.png'" />
            <span class="badge">${product.tag || "Handmade"}</span>
          </div>
          <div class="product-body">
            <div class="product-meta">
              <span>${product.category}</span>
              <span class="product-rating">
                <span class="star">★</span> ${(product.rating || 4.8).toFixed(1)}
              </span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-footer">
            <div class="product-order-meta">
              <span class="price" data-price="${product.price}">${formatPrice(product.price)}</span>
              <label class="strand-label">
                <span>Strands</span>
                <select class="strand-select" data-id="${id}">
                  ${getStrandOptionsHTML(50)}
                </select>
              </label>
            </div>
            <button class="btn primary sm" type="button" data-id="${id}">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path>
                <path d="M3 6h18"></path>
                <path d="M16 10a4 4 0 01-8 0"></path>
              </svg>
              Add
            </button>
          </div>
        </div>
      </article>
      `;
    })
    .join("");
}

// ---- Update All Prices on Page ----
function updateAllPrices() {
  $$("[data-price]").forEach((el) => {
    const ghsPrice = parseFloat(el.dataset.price);
    el.textContent = formatPrice(ghsPrice);
  });
}

// ---- Cart Functions ----
function updateCartCount() {
  const count = Array.from(cart.values()).reduce((s, q) => s + q, 0);
  cartCountEl.textContent = count;
}

function renderCart() {
  const entries = Array.from(cart.entries());

  if (entries.length === 0) {
    cartItemsEl.innerHTML = "";
    cartEmptyEl.style.display = "block";
    cartTotalEl.textContent = formatPrice(0);
    cartSubtotalEl.textContent = formatPrice(0);
    return;
  }

  cartEmptyEl.style.display = "none";

  cartItemsEl.innerHTML = entries
    .map(([id, qty]) => {
      const p = products.find((item) => item._id === id);
      if (!p) return "";
      const strandOptionsHTML = getStrandOptionsHTML(qty);
      const cartImageSrc = getProductImage(p.image);
      return `
        <div class="cart-item">
          <div class="cart-item-image">
            <img src="${cartImageSrc}" alt="${p.name}" onerror="this.src='images/waist_beads.png'" />
          </div>
          <div class="cart-item-details">
            <span class="cart-item-name">${p.name}</span>
            <span class="cart-item-subtitle">${qty} strands</span>
            <span class="cart-item-price">${formatPrice(p.price * qty)}</span>
            <div class="cart-item-actions">
              <label class="cart-strand-label">
                <span>Strands</span>
                <select class="cart-strand-select" data-id="${id}">
                  ${strandOptionsHTML}
                </select>
              </label>
              <button class="qty-button" data-action="dec" data-id="${id}">−</button>
              <button class="qty-button" data-action="inc" data-id="${id}">+</button>
            </div>
            <button class="cart-item-remove" data-action="remove" data-id="${id}">Remove</button>
          </div>
        </div>
      `;
    })
    .join("");

  const total = entries.reduce((sum, [id, qty]) => {
    const p = products.find((item) => item._id === id);
    return p ? sum + p.price * qty : sum;
  }, 0);

  cartSubtotalEl.textContent = formatPrice(total);
  cartTotalEl.textContent = formatPrice(total);
}

function addToCart(id, strands = 50) {
  const qty = cart.get(id) ?? 0;
  cart.set(id, qty + strands);
  updateCartCount();
  renderCart();
  saveCart();

  const p = products.find((item) => item._id === id);
  showToast(`${p?.name || "Item"} added to bag (${strands} strands)`, "🛍️");
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartOverlay.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartOverlay.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ---- Wishlist Backend & Local Sync ----
async function toggleWishlist(id) {
  if (wishlist.has(id)) {
    wishlist.delete(id);
    showToast("Removed from wishlist", "💔");
  } else {
    wishlist.add(id);
    showToast("Added to wishlist", "❤️");
  }
  saveWishlist();
  renderProducts();

  // If user logged in, sync with database
  if (authToken) {
    try {
      await fetch("/api/users/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ productId: id })
      });
    } catch (err) {
      console.warn("Could not sync wishlist with server:", err);
    }
  }
}

// ---- User Authentication Handler ----
function updateAuthUI() {
  if (currentUser) {
    userBadge.style.display = "block";
    // autofill checkout fields if logged in
    $("#checkoutFirstName").value = currentUser.firstName || "";
    $("#checkoutLastName").value = currentUser.lastName || "";
    $("#checkoutEmail").value = currentUser.email || "";
    $("#checkoutPhone").value = currentUser.phone || "";
  } else {
    userBadge.style.display = "none";
  }
}

function openAuthModal() {
  authModal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  authModal.classList.remove("is-open");
  document.body.style.overflow = "";
}

// Switch Auth tabs
function switchAuthTab(tab) {
  if (tab === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    authTitle.textContent = "Sign In";
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    authTitle.textContent = "Create Account";
  }
}

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;

  if (!email || !password) {
    showToast("Please fill in all fields", "⚠️");
    return;
  }

  const submitBtn = $("#loginSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Signing In...`;

  try {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();

    if (json.status === "success") {
      currentUser = json.data;
      authToken = json.data.token;
      localStorage.setItem("emy_user", JSON.stringify(currentUser));
      localStorage.setItem("emy_token", authToken);

      // Import wishlist from database
      if (currentUser.wishlist) {
        currentUser.wishlist.forEach((id) => wishlist.add(id));
        saveWishlist();
      }

      showToast(`Welcome back, ${currentUser.firstName}! 👋`, "🎉");
      updateAuthUI();
      renderProducts();
      closeAuthModal();
    } else {
      showToast(json.message || "Invalid credentials", "⚠️");
    }
  } catch (error) {
    showToast("Failed to authenticate. Try again.", "⚠️");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
});

// Register
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const firstName = $("#registerFirstName").value.trim();
  const lastName = $("#registerLastName").value.trim();
  const email = $("#registerEmail").value.trim();
  const phone = $("#registerPhone").value.trim();
  const password = $("#registerPassword").value;

  if (!firstName || !lastName || !email || !password) {
    showToast("Please fill in required fields", "⚠️");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "⚠️");
    return;
  }

  const submitBtn = $("#registerSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Registering...`;

  try {
    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, phone, password })
    });
    const json = await res.json();

    if (json.status === "success") {
      currentUser = json.data;
      authToken = json.data.token;
      localStorage.setItem("emy_user", JSON.stringify(currentUser));
      localStorage.setItem("emy_token", authToken);

      showToast(`Welcome, ${firstName}! 🎉`, "✨");
      updateAuthUI();
      closeAuthModal();
    } else {
      showToast(json.message || "Registration failed", "⚠️");
    }
  } catch (error) {
    showToast("Failed to register. Try again.", "⚠️");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});

// Logout
function handleUserButtonClick() {
  if (currentUser) {
    const confirmLogout = confirm(`Logged in as ${currentUser.firstName} ${currentUser.lastName}.\nWould you like to log out?`);
    if (confirmLogout) {
      currentUser = null;
      authToken = "";
      localStorage.removeItem("emy_user");
      localStorage.removeItem("emy_token");
      wishlist.clear();
      saveWishlist();

      showToast("Logged out successfully", "👋");
      updateAuthUI();
      renderProducts();
    }
  } else {
    openAuthModal();
  }
}

// ---- Quick View ----
function openQuickView(id) {
  const p = products.find((item) => item._id === id);
  if (!p) return;

  const quickviewSrc = getProductImage(p.image);
  $("#quickviewImage").src = quickviewSrc;
  $("#quickviewImage").alt = p.name;
  $("#quickviewCategory").textContent = p.category;
  $("#quickviewName").textContent = p.name;
  $("#quickviewStars").textContent = starHTML(p.rating || 4.8);
  $("#quickviewRatingText").textContent = `${p.rating || 4.8} / 5.0`;
  $("#quickviewDescription").textContent = p.description;
  $("#quickviewPrice").textContent = formatPrice(p.price);
  $("#quickviewPrice").dataset.price = p.price;

  const addBtn = $("#quickviewAddCart");
  addBtn.onclick = () => {
    const quickviewQty = parseInt($("#quickviewStrands")?.value, 10) || 50;
    addToCart(p._id, quickviewQty);
    closeQuickView();
    openCart();
  };

  const quickviewStrands = $("#quickviewStrands");
  if (quickviewStrands) {
    quickviewStrands.value = "50";
  }

  const wishBtn = $("#quickviewWishlist");
  wishBtn.textContent = wishlist.has(p._id) ? "♥ Wishlisted" : "♡ Wishlist";
  wishBtn.onclick = () => {
    toggleWishlist(p._id);
    wishBtn.textContent = wishlist.has(p._id) ? "♥ Wishlisted" : "♡ Wishlist";
  };

  $("#quickviewModal").classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeQuickView() {
  $("#quickviewModal").classList.remove("is-open");
  if (!cartDrawer.classList.contains("is-open") && !$("#checkoutModal").classList.contains("is-open")) {
    document.body.style.overflow = "";
  }
}

// ---- Checkout & Paystack Integration ----
let checkoutStep = 1;

function openCheckout() {
  if (!cart.size) return;
  closeCart();

  checkoutStep = 1;
  updateCheckoutSteps();
  $("#checkoutStep1").style.display = "";
  $("#checkoutStep2").style.display = "none";
  $("#checkoutStep3").style.display = "none";

  // Pre-fill profile shipping information if logged in
  updateAuthUI();

  $("#checkoutModal").classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  $("#checkoutModal").classList.remove("is-open");
  document.body.style.overflow = "";
}

function updateCheckoutSteps() {
  $$(".checkout-step").forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.remove("active", "done");
    if (stepNum === checkoutStep) step.classList.add("active");
    if (stepNum < checkoutStep) step.classList.add("done");
  });
}

function renderOrderSummary() {
  const entries = Array.from(cart.entries());
  let html = entries
    .map(([id, qty]) => {
      const p = products.find((item) => item._id === id);
      if (!p) return "";
      return `<div class="checkout-order-item"><span>${p.name} × ${qty}</span><span>${formatPrice(p.price * qty)}</span></div>`;
    })
    .join("");

  const total = entries.reduce((sum, [id, qty]) => {
    const p = products.find((item) => item._id === id);
    return p ? sum + p.price * qty : sum;
  }, 0);

  html += `<div class="checkout-order-item"><span>Shipping</span><span>Free</span></div>`;
  html += `<div class="checkout-order-total"><span>Total</span><span>${formatPrice(total)}</span></div>`;

  $("#checkoutOrderSummary").innerHTML = html;
}

// Calculate cart total price
function getCartTotalGHS() {
  return Array.from(cart.entries()).reduce((sum, [id, qty]) => {
    const p = products.find((item) => item._id === id);
    return p ? sum + p.price * qty : sum;
  }, 0);
}

// Order & Payment flow: Create Order (Backend) -> Launch Paystack Popup -> Verify Order (Backend)
async function processPayment() {
  const email = $("#checkoutEmail").value.trim();
  const firstName = $("#checkoutFirstName").value.trim();
  const lastName = $("#checkoutLastName").value.trim();
  const phone = $("#checkoutPhone").value.trim();
  const address = $("#checkoutAddress").value.trim();
  const city = $("#checkoutCity").value.trim();
  const country = $("#checkoutCountry").value.trim();

  if (!email || !firstName || !lastName || !address || !city || !country) {
    showToast("Please fill in shipping details", "⚠️");
    return;
  }

  const checkoutBtn = $("#checkoutNext2");
  const originalHtml = checkoutBtn.innerHTML;
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = `<span class="spinner"></span> Redirecting to Payment...`;

  try {
    // 1. Create order on backend (secures price calculation and validates stock)
    const orderItems = Array.from(cart.entries()).map(([id, qty]) => {
      const p = products.find((item) => item._id === id);
      return {
        product: p._id,
        name: p.name,
        quantity: qty,
        price: p.price
      };
    });

    const orderPayload = {
      orderItems,
      shippingAddress: { address, city, country },
      paymentMethod: "Paystack",
      guestEmail: email
    };

    const headers = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers,
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderRes.json();
    if (orderData.status !== "success") {
      throw new Error(orderData.message || "Could not register order");
    }

    const order = orderData.data;

    // 2. Load Paystack Inline Payment Pop
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your public Key
      email: email,
      amount: order.totalPrice * 100, // GHS in pesewas
      currency: "GHS",
      ref: "EMY-" + order._id + "-" + Date.now(),
      onSuccess: function (transaction) {
        // 3. Confirm with Server-to-Server Verification (API)
        verifyPaymentOnBackend(transaction.reference, order._id, checkoutBtn, originalHtml);
      },
      onCancel: function () {
        showToast("Payment cancelled by client", "⚠️");
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = originalHtml;
      }
    });

  } catch (err) {
    console.error("Order processing error:", err);
    showToast(err.message || "Failed to initiate payment", "⚠️");
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = originalHtml;
  }
}

// Verification Call
async function verifyPaymentOnBackend(reference, orderId, checkoutBtn, originalHtml) {
  try {
    const res = await fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, orderId })
    });

    const verifyData = await res.json();
    if (verifyData.status !== "success") {
      throw new Error(verifyData.message || "Payment verification failed");
    }

    // Payment Successful -> Show Confirmation Page
    checkoutStep = 3;
    updateCheckoutSteps();
    $("#checkoutStep2").style.display = "none";
    $("#checkoutStep3").style.display = "";

    // Clear cart and storage
    cart.clear();
    saveCart();
    updateCartCount();
    renderCart();

    showToast("Payment verified! Thank you for your order.", "🎉");

  } catch (err) {
    console.error("Server payment verification failed:", err);
    showToast(err.message || "Server verification failed. Please contact support.", "⚠️");
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = originalHtml;
    }
  }
}

// ---- Search Autocomplete ----
function updateSearchDropdown() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    searchDropdown.classList.remove("is-open");
    return;
  }

  const results = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.tag.toLowerCase().includes(query)
  ).slice(0, 5);

  if (results.length === 0) {
    searchDropdown.classList.remove("is-open");
    return;
  }

  searchDropdown.innerHTML = results
    .map(
      (p) => `
    <div class="search-dropdown-item" data-search-id="${p._id}">
      <img src="${p.image}" alt="" />
      <div class="search-item-info">
        <div class="search-item-name">${p.name}</div>
        <div class="search-item-price">${formatPrice(p.price)}</div>
      </div>
    </div>
  `
    )
    .join("");

  searchDropdown.classList.add("is-open");
}

// ---- Dark Mode ----
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("emy_theme", theme);

  const icon = $("#themeIcon");
  if (theme === "dark") {
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>`;
  } else {
    icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>`;
  }
}

// ---- Mobile Nav ----
function openMobileNav() {
  mobileNav.classList.add("is-open");
  mobileNavOverlay.classList.add("is-open");
  hamburgerBtn.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeMobileNav() {
  mobileNav.classList.remove("is-open");
  mobileNavOverlay.classList.remove("is-open");
  hamburgerBtn.classList.remove("is-open");
  document.body.style.overflow = "";
}

// ---- Scroll Reveal (Intersection Observer) ----
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
  );

  $$(".reveal").forEach((el) => observer.observe(el));
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Filter buttons
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("is-active"));
    button.classList.add("is-active");
    state.filter = button.dataset.filter || "All";
    renderProducts();
  });
});

// Sort
sortSelect.addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderProducts();
});

// Search input
searchInput.addEventListener("input", (e) => {
  state.search = e.target.value.trim().toLowerCase();
  renderProducts();
  updateSearchDropdown();
});

searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim()) updateSearchDropdown();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    searchDropdown.classList.remove("is-open");
  }
});

// Search dropdown click
searchDropdown.addEventListener("click", (e) => {
  const item = e.target.closest("[data-search-id]");
  if (item) {
    openQuickView(item.dataset.searchId);
    searchDropdown.classList.remove("is-open");
    searchInput.value = "";
    state.search = "";
  }
});

// Product grid — add to cart / wishlist click
productGrid.addEventListener("click", (e) => {
  const addBtn = e.target.closest("button[data-id]");
  if (addBtn) {
    e.stopPropagation();
    const card = addBtn.closest(".product-card");
    const qtySelect = card?.querySelector(".strand-select");
    const strands = parseInt(qtySelect?.value, 10) || 50;
    addToCart(addBtn.dataset.id, strands);
    return;
  }

  const wishBtn = e.target.closest("[data-wishlist]");
  if (wishBtn) {
    e.stopPropagation();
    toggleWishlist(wishBtn.dataset.wishlist);
    return;
  }

  const card = e.target.closest("[data-product-id]");
  if (card && !e.target.closest("button")) {
    openQuickView(card.dataset.productId);
  }
});

// Cart drawer items
cartItemsEl.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  const qty = cart.get(id) ?? 0;

  if (action === "inc") {
    cart.set(id, qty + 1);
  } else if (action === "dec") {
    if (qty <= 1) cart.delete(id);
    else cart.set(id, qty - 1);
  } else if (action === "remove") {
    cart.delete(id);
    showToast("Item removed from bag", "🗑️");
  }

  updateCartCount();
  renderCart();
  saveCart();
});

cartItemsEl.addEventListener("change", (e) => {
  const select = e.target.closest(".cart-strand-select");
  if (!select) return;
  const id = select.dataset.id;
  const qty = parseInt(select.value, 10) || 50;
  if (qty <= 0) {
    cart.delete(id);
  } else {
    cart.set(id, qty);
  }
  updateCartCount();
  renderCart();
  saveCart();
});

// Cart open/close
cartButton.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

// Clear cart
clearCartBtn.addEventListener("click", () => {
  cart.clear();
  updateCartCount();
  renderCart();
  saveCart();
  showToast("Bag cleared", "🗑️");
});

// Quick add (hero)
if (quickAddButton) {
  quickAddButton.addEventListener("click", () => {
    // Find first product ID dynamically (or fallback)
    const pid = quickAddButton.dataset.quickAdd;
    const resolvedProduct = products.find(p => p.tag === "New" || p.name.includes("African glass"));
    const idToUse = resolvedProduct ? resolvedProduct._id : pid;
    addToCart(idToUse);
    openCart();
  });
}

// Quick view close
$("#quickviewClose").addEventListener("click", closeQuickView);
$("#quickviewOverlay").addEventListener("click", closeQuickView);

// Checkout Steps
checkoutButton.addEventListener("click", openCheckout);
$("#checkoutClose").addEventListener("click", closeCheckout);
$("#checkoutOverlay").addEventListener("click", closeCheckout);
$("#checkoutCancel").addEventListener("click", closeCheckout);

$("#checkoutNext1").addEventListener("click", () => {
  const firstName = $("#checkoutFirstName").value.trim();
  const email = $("#checkoutEmail").value.trim();
  if (!firstName || !email) {
    showToast("Please fill in required fields", "⚠️");
    return;
  }

  checkoutStep = 2;
  updateCheckoutSteps();
  $("#checkoutStep1").style.display = "none";
  $("#checkoutStep2").style.display = "";
  renderOrderSummary();
});

$("#checkoutBack2").addEventListener("click", () => {
  checkoutStep = 1;
  updateCheckoutSteps();
  $("#checkoutStep2").style.display = "none";
  $("#checkoutStep1").style.display = "";
});

$("#checkoutNext2").addEventListener("click", () => {
  processPayment();
});

$("#checkoutDone").addEventListener("click", () => {
  closeCheckout();
  renderProducts();
});

// Auth Modal UI Bindings
userButton.addEventListener("click", handleUserButtonClick);
authClose.addEventListener("click", closeAuthModal);
authOverlay.addEventListener("click", closeAuthModal);
tabLogin.addEventListener("click", () => switchAuthTab("login"));
tabRegister.addEventListener("click", () => switchAuthTab("register"));

// Dark mode theme selection
const savedTheme = localStorage.getItem("emy_theme") || "light";
setTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

// Currency conversion binding
currencySelect.value = currentCurrency;
currencySelect.addEventListener("change", (e) => {
  currentCurrency = e.target.value;
  localStorage.setItem("emy_currency", currentCurrency);
  renderProducts();
  renderCart();
  updateAllPrices();
});

// Mobile nav
hamburgerBtn.addEventListener("click", () => {
  if (mobileNav.classList.contains("is-open")) {
    closeMobileNav();
  } else {
    openMobileNav();
  }
});
mobileNavClose.addEventListener("click", closeMobileNav);
mobileNavOverlay.addEventListener("click", closeMobileNav);
$$(".mobile-nav-links a").forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

// Scroll bindings
window.addEventListener("scroll", () => {
  if (window.scrollY > 600) {
    backToTop.classList.add("is-visible");
  } else {
    backToTop.classList.remove("is-visible");
  }

  if (window.scrollY > 100) {
    mainNav.classList.add("scrolled");
  } else {
    mainNav.classList.remove("scrolled");
  }
}, { passive: true });

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Newsletter subscription
newsletterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const emailInput = $("#newsletterEmail");
  const email = emailInput.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailInput.classList.add("error");
    showToast("Please enter a valid email", "⚠️");
    return;
  }

  emailInput.classList.remove("error");
  newsletterForm.style.display = "none";
  newsletterSuccess.classList.add("is-visible");
  showToast("Welcome to the family! 🎉", "✉️");
});

// ESC key listener to close modals
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("#quickviewModal").classList.contains("is-open")) closeQuickView();
    else if ($("#checkoutModal").classList.contains("is-open")) closeCheckout();
    else if (cartDrawer.classList.contains("is-open")) closeCart();
    else if (mobileNav.classList.contains("is-open")) closeMobileNav();
    else if (authModal.classList.contains("is-open")) closeAuthModal();
  }
});

// Smooth anchor scroll
$$('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ============================================================
// INITIALIZE
// ============================================================
updateAuthUI();
fetchProducts();
updateCartCount();
renderCart();
initScrollReveal();
