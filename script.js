/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

const productSearchInput = document.getElementById("productSearchInput");

// Detect RTL language from document lang attribute
function isRTLLanguage(lang) {
  // List of RTL language codes
  const rtlLangs = ["ar", "he", "fa", "ur", "ps", "dv", "syr", "yi"];
  if (!lang) return false;
  // Check for language code or subtag
  return rtlLangs.some((code) => lang.startsWith(code));
}

function applyRTLLanguageLayout() {
  const lang = document.documentElement.lang || navigator.language || "en";
  const isRTL = isRTLLanguage(lang.toLowerCase());
  document.body.dir = isRTL ? "rtl" : "ltr";
  document.body.style.direction = isRTL ? "rtl" : "ltr";
  // Add/remove RTL class for layout containers
  const wrapper = document.querySelector(".page-wrapper");
  if (wrapper) {
    if (isRTL) {
      wrapper.classList.add("rtl");
    } else {
      wrapper.classList.remove("rtl");
    }
  }
}

// Run on load and when lang changes
applyRTLLanguageLayout();
// Optional: observe lang attribute changes
const langObserver = new MutationObserver(applyRTLLanguageLayout);
langObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category or search to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  // Filter out products missing name, brand, or category
  return data.products.filter((p) => p.name && p.brand && p.category);
}

/* Create HTML for displaying product cards with selection and description */
function displayProducts(products, selectedIds = []) {
  productsContainer.innerHTML =
    products.length === 0
      ? `<div class="placeholder-message">No products found.</div>`
      : products
          .map((product) => {
            const selected = selectedIds.includes(product.id);
            return `
      <div class="product-card${selected ? " selected" : ""}" data-id="${
              product.id
            }">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
          <button class="desc-btn" data-id="${product.id}">Details</button>
        </div>
      </div>
    `;
          })
          .join("");
}

// Store selected product IDs in localStorage
function saveSelectedProducts(selectedIds) {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedIds));
}

function getSelectedProducts() {
  return JSON.parse(localStorage.getItem("selectedProducts") || "[]");
}

// Display selected products in the list
function updateSelectedProductsList(products, selectedIds) {
  if (selectedIds.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected.</div>`;
    return;
  }
  selectedProductsList.innerHTML = selectedIds
    .map((id) => {
      const prod = products.find((p) => p.id === id);
      return prod
        ? `<div class="selected-product-item" style="border:2px solid #e3a535;padding:8px 12px;border-radius:6px;display:flex;align-items:center;gap:8px;background:#fff7e6;">
            <span style="font-weight:500;">${prod.name}</span>
            <button class="remove-selected-btn" data-id="${id}" style="background:#ff003b;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;">Remove</button>
          </div>`
        : "";
    })
    .join("");
  // Add clear all button
  selectedProductsList.innerHTML += `<button id="clearSelectedBtn" style="margin-top:10px;background:#ff003b;color:#fff;border:none;border-radius:6px;padding:6px 16px;cursor:pointer;">Clear All</button>`;
}

// Main state
let allProducts = [];
let selectedIds = getSelectedProducts();
let filteredProducts = [];
let currentCategory = "";

// Load and display products
async function refreshProducts() {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  // Filter by category and search
  filteredProducts = allProducts.filter((product) => {
    const matchesCategory = currentCategory
      ? product.category === currentCategory
      : true;
    const searchVal = productSearchInput.value.trim().toLowerCase();
    const matchesSearch = searchVal
      ? (product.name + " " + product.brand + " " + product.description)
          .toLowerCase()
          .includes(searchVal)
      : true;
    return matchesCategory && matchesSearch;
  });
  displayProducts(filteredProducts, selectedIds);
  updateSelectedProductsList(allProducts, selectedIds);
}

// Initial load
refreshProducts();

// Category filter
categoryFilter.addEventListener("change", (e) => {
  currentCategory = e.target.value || "";
  refreshProducts();
});

// Product search
productSearchInput.addEventListener("input", () => {
  refreshProducts();
});

// Product card click for selection
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) return;
  const id = parseInt(card.getAttribute("data-id"));
  // If clicking details button, don't toggle selection
  if (e.target.classList.contains("desc-btn")) return;
  if (selectedIds.includes(id)) {
    selectedIds = selectedIds.filter((pid) => pid !== id);
  } else {
    selectedIds.push(id);
  }
  saveSelectedProducts(selectedIds);
  refreshProducts();
});

// Show product description in modal popup
const descModal = document.getElementById("descModal");
const descModalText = document.getElementById("descModalText");
const descModalClose = document.getElementById("descModalClose");
productsContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("desc-btn")) {
    const id = parseInt(e.target.getAttribute("data-id"));
    const prod = allProducts.find((p) => p.id === id);
    if (prod) {
      descModalText.innerHTML = `<h3 style='color:#ff003b;margin-bottom:10px;'>${prod.name}</h3><p>${prod.description}</p>`;
      descModal.style.display = "flex";
    }
  }
});
descModalClose.addEventListener("click", () => {
  descModal.style.display = "none";
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") descModal.style.display = "none";
});

// Remove selected product from list
selectedProductsList.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-selected-btn")) {
    const id = parseInt(e.target.getAttribute("data-id"));
    selectedIds = selectedIds.filter((pid) => pid !== id);
    saveSelectedProducts(selectedIds);
    refreshProducts();
  }
  if (e.target.id === "clearSelectedBtn") {
    selectedIds = [];
    saveSelectedProducts(selectedIds);
    refreshProducts();
  }
});

// Conversation history for chat
let chatHistory = [];

// Helper to render chat messages
function renderChat() {
  chatWindow.innerHTML = chatHistory
    .map(
      (msg) =>
        `<div style="margin-bottom:16px;"><strong style="color:${
          msg.role === "user" ? "#e3a535" : "#ff003b"
        };">${
          msg.role === "user" ? "You" : "L'Oréal Advisor"
        }:</strong> <span>${msg.content}</span></div>`
    )
    .join("");
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Generate routine button handler
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedIds.length === 0) {
    chatHistory.push({
      role: "system",
      content: "Please select products to generate a routine.",
    });
    renderChat();
    return;
  }
  // Get selected product data
  const selectedProducts = allProducts.filter((p) =>
    selectedIds.includes(p.id)
  );
  // Show loading
  chatHistory.push({
    role: "user",
    content: "Generate a personalized routine for my selected products.",
  });
  renderChat();

  // Build a system prompt for the Worker to guide routine generation
  const productNames = selectedProducts.map((p) => p.name).join(", ");
  const messages = [
    {
      role: "system",
      content: `You are a L'Oréal skincare and beauty expert. Create a personalized skincare and beauty routine using these products: ${productNames}. Give clear steps and tips for morning and evening use.`,
    },
    ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
  ];

  try {
    // Use your Cloudflare Worker endpoint here
    const response = await fetch(
      "https://square-smoke-e4bd.daniel-brill20.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      }
    );
    const data = await response.json();
    const routine = data.reply || "Sorry, I couldn't generate a routine.";
    chatHistory.push({
      role: "assistant",
      content: routine,
    });
    renderChat();
  } catch (err) {
    chatHistory.push({
      role: "assistant",
      content: "Error connecting to routine service.",
    });
    renderChat();
  }
});

// Chat form submission handler
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;
  chatHistory.push({ role: "user", content: userInput });
  renderChat();

  // Call your Cloudflare Worker endpoint for chat
  try {
    const messages = chatHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    const response = await fetch(
      "https://square-smoke-e4bd.daniel-brill20.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      }
    );
    const data = await response.json();
    const reply = data.reply || "Sorry, I couldn't answer that.";
    chatHistory.push({
      role: "assistant",
      content: reply,
    });
    renderChat();
  } catch (err) {
    chatHistory.push({
      role: "assistant",
      content: "Error connecting to chat service.",
    });
    renderChat();
  }
  chatForm.reset();
});
