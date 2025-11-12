/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggleSidebar");
const newChatBtn = document.getElementById("newChatBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const conversationList = document.getElementById("conversationList");
const pageWrapper = document.querySelector(".page-wrapper");

// Accessibility controls
const darkModeToggle = document.getElementById("darkModeToggle");
const increaseFontBtn = document.getElementById("increaseFontBtn");
const decreaseFontBtn = document.getElementById("decreaseFontBtn");
const accessibilityMenuBtn = document.getElementById("accessibilityMenuBtn");
const accessibilityModal = document.getElementById("accessibilityModal");
const closeAccessibilityModal = document.getElementById(
  "closeAccessibilityModal"
);

// Load saved preferences
const darkMode = localStorage.getItem("darkMode") === "true";
const fontSize = localStorage.getItem("fontSize") || "normal";

if (darkMode) {
  document.body.classList.add("dark-mode");
  darkModeToggle.querySelector(".material-icons").textContent = "light_mode";
}

if (fontSize === "large") {
  document.body.classList.add("font-large");
} else if (fontSize === "xlarge") {
  document.body.classList.add("font-xlarge");
} else if (fontSize === "small") {
  document.body.classList.add("font-small");
}

// Conversation tracking - stores full message history
let currentConversation = {
  id: Date.now(),
  title: "New Conversation",
  messages: [], // Will store all messages including system prompt
  userName: null, // Track user's name if mentioned
  createdAt: new Date().toISOString(),
};

// Array to store all past conversations
let conversations = JSON.parse(localStorage.getItem("conversations")) || [];

// Load the most recent conversation or create new one
if (conversations.length > 0) {
  currentConversation = conversations[0];
  loadConversation(currentConversation);
} else {
  conversations.push(currentConversation);
  saveConversations();
}

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

// Render conversation list
renderConversationList();

// Toggle sidebar
toggleSidebarBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  pageWrapper.classList.toggle("sidebar-open");
});

// Close sidebar button
closeSidebarBtn.addEventListener("click", () => {
  sidebar.classList.remove("open");
  pageWrapper.classList.remove("sidebar-open");
});

// New chat button
newChatBtn.addEventListener("click", () => {
  createNewConversation();
});

// Accessibility modal controls
accessibilityMenuBtn.addEventListener("click", () => {
  accessibilityModal.classList.add("open");
});

closeAccessibilityModal.addEventListener("click", () => {
  accessibilityModal.classList.remove("open");
});

// Close modal when clicking outside
accessibilityModal.addEventListener("click", (e) => {
  if (e.target === accessibilityModal) {
    accessibilityModal.classList.remove("open");
  }
});

// Dark mode toggle
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark);
  darkModeToggle.querySelector(".material-icons").textContent = isDark
    ? "light_mode"
    : "dark_mode";
});

// Font size controls
increaseFontBtn.addEventListener("click", () => {
  document.body.classList.remove("font-small", "font-large", "font-xlarge");
  if (!document.body.classList.contains("font-large")) {
    document.body.classList.add("font-large");
    localStorage.setItem("fontSize", "large");
  } else {
    document.body.classList.remove("font-large");
    document.body.classList.add("font-xlarge");
    localStorage.setItem("fontSize", "xlarge");
  }
});

decreaseFontBtn.addEventListener("click", () => {
  if (document.body.classList.contains("font-xlarge")) {
    document.body.classList.remove("font-xlarge");
    document.body.classList.add("font-large");
    localStorage.setItem("fontSize", "large");
  } else if (document.body.classList.contains("font-large")) {
    document.body.classList.remove("font-large");
    localStorage.setItem("fontSize", "normal");
  } else {
    document.body.classList.add("font-small");
    localStorage.setItem("fontSize", "small");
  }
});

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  // Display the user's message
  appendMessage("user", text);

  // Clear the input
  userInput.value = "";

  // Show loading indicator
  const loading = document.createElement("p");
  loading.className = "msg assistant loading";
  loading.innerHTML = "Assistant: ";

  // Create a wrapper for the animated text with unique ID
  const uniqueId = "thinking-" + Date.now();
  const textWrapper = document.createElement("span");
  textWrapper.className = "thinking-text";
  textWrapper.id = uniqueId;
  textWrapper.textContent = "thinking...";
  loading.appendChild(textWrapper);

  chatWindow.appendChild(loading);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Use anime.js to split text into characters and animate
  textWrapper.innerHTML = textWrapper.textContent.replace(
    /\S/g,
    "<span class='letter' style='display:inline-block;'>$&</span>"
  );

  // Animate each character individually with anime.js
  const animation = anime
    .timeline({ loop: true })
    .add({
      targets: `#${uniqueId} .letter`,
      opacity: [0, 1],
      translateY: [20, 0],
      rotateZ: [180, 0],
      easing: "easeOutExpo",
      duration: 800,
      delay: anime.stagger(50), // Using anime's stagger function
    })
    .add({
      targets: `#${uniqueId} .letter`,
      opacity: [1, 0],
      translateY: [0, -20],
      easing: "easeInExpo",
      duration: 500,
      delay: anime.stagger(40, { from: "last" }), // Reverse stagger
    });

  try {
    // Add minimum delay to let animation play at least twice (about 3 seconds)
    const [reply] = await Promise.all([
      sendToApi(text),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    // Stop the animation and remove loading indicator
    animation.pause();
    loading.remove();

    // Store assistant's reply in conversation history
    currentConversation.messages.push({
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
    });

    // Update conversation title if it's the first user message
    if (
      currentConversation.messages.filter((m) => m.role === "user").length === 1
    ) {
      currentConversation.title =
        text.substring(0, 50) + (text.length > 50 ? "..." : "");
    }

    // Extract user's name if mentioned (simple detection)
    if (!currentConversation.userName) {
      const nameMatch =
        text.match(/my name is (\w+)/i) ||
        text.match(/I'm (\w+)/i) ||
        text.match(/I am (\w+)/i);
      if (nameMatch) {
        currentConversation.userName = nameMatch[1];
      }
    }

    // Save conversations to localStorage
    saveConversations();
    renderConversationList();

    // Display the assistant's reply
    appendMessage("assistant", reply);
  } catch (err) {
    console.error(err);
    animation.pause();
    loading.remove();
    appendMessage(
      "assistant",
      "Sorry — there was an error contacting the API."
    );
  }
});

// --- Helper functions ---

// Cloudflare Worker URL for the "jarvis" worker
const API_URL = "https://jarvis.hjulian103.workers.dev";

// Append a message to the chat window
function appendMessage(role, text) {
  const p = document.createElement("p");
  p.className = `msg ${role}`;
  p.textContent = (role === "user" ? "You: " : "Assistant: ") + text;
  chatWindow.appendChild(p);

  // Store user message in conversation history
  if (role === "user") {
    currentConversation.messages.push({
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });
  }

  // Keep view scrolled to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Create a new conversation
function createNewConversation() {
  // Save current conversation before creating new one
  saveConversations();

  // Create new conversation
  currentConversation = {
    id: Date.now(),
    title: "New Conversation",
    messages: [],
    userName: null,
    createdAt: new Date().toISOString(),
  };

  // Add to conversations array at the beginning
  conversations.unshift(currentConversation);
  saveConversations();

  // Clear chat window
  chatWindow.innerHTML = "";
  chatWindow.textContent = "👋 Hello! How can I help you today?";

  // Update UI
  renderConversationList();
}

// Load a specific conversation
function loadConversation(conversation) {
  currentConversation = conversation;

  // Clear chat window
  chatWindow.innerHTML = "";

  // Display initial message if no messages yet
  if (currentConversation.messages.length === 0) {
    chatWindow.textContent = "👋 Hello! How can I help you today?";
    return;
  }

  // Redisplay all messages from this conversation
  currentConversation.messages.forEach((msg) => {
    if (msg.role !== "system") {
      const p = document.createElement("p");
      p.className = `msg ${msg.role}`;
      p.textContent =
        (msg.role === "user" ? "You: " : "Assistant: ") + msg.content;
      chatWindow.appendChild(p);
    }
  });

  chatWindow.scrollTop = chatWindow.scrollHeight;
  renderConversationList();
}

// Render the conversation list in the sidebar
function renderConversationList() {
  conversationList.innerHTML = "";

  conversations.forEach((conv) => {
    const item = document.createElement("div");
    item.className = "conversation-item";
    if (conv.id === currentConversation.id) {
      item.classList.add("active");
    }

    const title = document.createElement("div");
    title.className = "conversation-title";
    title.textContent = conv.title;

    const date = document.createElement("div");
    date.className = "conversation-date";
    const convDate = new Date(conv.createdAt);
    date.textContent =
      convDate.toLocaleDateString() +
      " " +
      convDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    item.appendChild(title);
    item.appendChild(date);

    // Click to load conversation
    item.addEventListener("click", () => {
      loadConversation(conv);
    });

    conversationList.appendChild(item);
  });
}

// Save conversations to localStorage
function saveConversations() {
  // Update the current conversation in the array
  const index = conversations.findIndex((c) => c.id === currentConversation.id);
  if (index !== -1) {
    conversations[index] = currentConversation;
  }

  // Keep only the last 20 conversations
  if (conversations.length > 20) {
    conversations = conversations.slice(0, 20);
  }

  localStorage.setItem("conversations", JSON.stringify(conversations));
}

// Send the user's message to the API and get the assistant's reply
async function sendToApi(userText) {
  // L'Oréal system prompt - defines the chatbot's role and boundaries
  const systemPrompt = `You are a specialized chatbot for L'Oréal. You must only answer questions directly related to L'Oréal products, skincare and haircare routines, beauty tips, ingredient information, and personalized recommendations involving L'Oréal's brands (e.g., Maybelline, Lancôme, Garnier, Redken, etc.).

If a user asks something unrelated to L'Oréal's products, beauty routines, or brand information, politely reply that you can only discuss topics related to L'Oréal and its product lines.

Your tone should be friendly, informative, and professional, reflecting the voice of a trusted L'Oréal beauty advisor.${
    currentConversation.userName
      ? ` The user's name is ${currentConversation.userName}.`
      : ""
  }`;

  // Build the messages array with full conversation context
  const messages = [
    { role: "system", content: systemPrompt },
    // Include previous messages for context (last 50 messages to support longer conversations)
    ...currentConversation.messages
      .filter((m) => m.role !== "system")
      .slice(-50)
      .map((m) => ({ role: m.role, content: m.content })),
    // Add the new user message
    { role: "user", content: userText },
  ];

  // POST the messages to the worker
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  // Check if the response is successful
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  // Parse the JSON response
  const data = await res.json();

  // The Cloudflare Worker forwards the OpenAI response object.
  // The assistant content is at: data.choices[0].message.content
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    // If shape is unexpected, return a safe stringified version for debugging
    return JSON.stringify(data);
  }

  // Remove markdown formatting characters (# and **) from the response
  const cleanedReply = reply.replace(/[#*]/g, "");

  return cleanedReply;
}
