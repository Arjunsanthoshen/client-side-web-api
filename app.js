// Load API key from environment variable or prompt the user if not found
const API_KEY = process.env.GROQ_API_KEY || localStorage.getItem('GROQ_API_KEY');
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// DOM Elements
const modelSelect = document.getElementById('model-select');
const promptInput = document.getElementById('prompt-input');
const submitBtn = document.getElementById('submit-btn');
const clearBtn = document.getElementById('clear-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const responseArea = document.getElementById('response-area');
const favoritesListEl = document.getElementById('favorites-list');

// App State
let currentModel = 'llama3-8b-8192';
let savedPrompts = [];
let isDarkTheme = false;

// Check if API key is available or prompt user to enter it
function checkApiKey() {
    if (!API_KEY) {
        const apiKeyPrompt = prompt('Please enter your Groq API key:');
        
        if (apiKeyPrompt) {
            // Save API key to localStorage for future use
            localStorage.setItem('GROQ_API_KEY', apiKeyPrompt);
            // Reload the page to use the new API key
            window.location.reload();
        } else {
            responseArea.innerHTML = `<p class="error">Error: API key not provided. You can get a Groq API key from <a href="https://console.groq.com/" target="_blank">https://console.groq.com/</a></p>`;
        }
    }
}

// Load saved preferences from localStorage
function loadSavedPreferences() {
    // Check API key first
    checkApiKey();
    
    // Load saved prompts
    const savedPromptsData = localStorage.getItem('savedPrompts');
    if (savedPromptsData) {
        savedPrompts = JSON.parse(savedPromptsData);
        renderSavedPrompts();
    }

    // Load preferred model
    const savedModel = localStorage.getItem('model');
    if (savedModel) {
        currentModel = savedModel;
        modelSelect.value = currentModel;
    }

    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkTheme = true;
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Save preferences to localStorage
function savePreferences() {
    localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
    localStorage.setItem('model', currentModel);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

// Generate AI response
async function generateResponse(prompt) {
    try {
        // Get latest API key (may have been set in localStorage)
        const currentApiKey = process.env.GROQ_API_KEY || localStorage.getItem('GROQ_API_KEY');
        
        // Check if API key is set
        if (!currentApiKey) {
            checkApiKey();
            return;
        }
        
        // Set loading state
        responseArea.innerHTML = '<p class="loading">Generating response</p>';
        submitBtn.disabled = true;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentApiKey}`
            },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI assistant.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        // Display response
        responseArea.innerHTML = `<div>${formatResponse(aiResponse)}</div>`;
        
        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyButton.classList.add('copy-btn');
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(aiResponse);
            copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
        });
        
        responseArea.appendChild(copyButton);
        
    } catch (error) {
        // If the error indicates an invalid API key
        if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('Authorization')) {
            // Clear the stored API key
            localStorage.removeItem('GROQ_API_KEY');
            responseArea.innerHTML = `<p class="error">Error: Invalid API key. Please refresh the page to enter a new key.</p>`;
        } else {
            responseArea.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    } finally {
        submitBtn.disabled = false;
    }
}

// Format the AI response with HTML
function formatResponse(text) {
    // Convert markdown-style code blocks to HTML
    text = text.replace(/```([a-z]*)([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
    return text;
}

// Render saved prompts
function renderSavedPrompts() {
    favoritesListEl.innerHTML = '';
    
    if (savedPrompts.length === 0) {
        favoritesListEl.innerHTML = '<p>No saved prompts yet.</p>';
        return;
    }
    
    savedPrompts.forEach(prompt => {
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item';
        promptItem.innerHTML = `
            <span>${prompt}</span>
            <button class="remove-prompt" data-prompt="${prompt}">×</button>
        `;
        favoritesListEl.appendChild(promptItem);
        
        // Add click event to prompt text
        promptItem.querySelector('span').addEventListener('click', () => {
            promptInput.value = prompt;
        });
        
        // Add click event to remove button
        promptItem.querySelector('.remove-prompt').addEventListener('click', (e) => {
            e.stopPropagation();
            removePrompt(prompt);
        });
    });
}

// Remove prompt from saved prompts
function removePrompt(prompt) {
    const index = savedPrompts.indexOf(prompt);
    
    if (index !== -1) {
        savedPrompts.splice(index, 1);
    }
    
    // Update saved prompts display
    renderSavedPrompts();
    
    // Save to localStorage
    savePreferences();
}

// Toggle theme
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggleBtn.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    savePreferences();
}

// Event Listeners
submitBtn.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (prompt) {
        generateResponse(prompt);
    }
});

clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    responseArea.innerHTML = '';
});

modelSelect.addEventListener('change', (e) => {
    currentModel = e.target.value;
    savePreferences();
});

themeToggleBtn.addEventListener('click', toggleTheme);

// Initialize the app
loadSavedPreferences();
