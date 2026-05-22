const API_BASE_URL = 'const API_BASE_URL = window.location.origin;';

// 1. App State Data Model
let appState = {
    budget: 1200.00,
    savingsGoal: 200.00,
    savingsCurrent: 150.00,
    expenses: [],
    currentTipIndex: 0
};

// Global Chart References
let barChartInstance = null;
let pieChartInstance = null;

// 2. DOM Document Ready Initialization
document.addEventListener("DOMContentLoaded", async () => {
    // Force data hydration from the server before loading visual dependencies
    await initDashboard();
    setupEventHandlers();
});

// 3. Asynchronous Main Initialization & Re-hydration Pipeline
async function initDashboard() {
    try {
        // Fetch financial metrics summary and expenses list concurrently from the backend
        const [summaryResponse, expensesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/summary`),
            fetch(`${API_BASE_URL}/expenses`)
        ]);

        const summaryData = await summaryResponse.json();
        const expensesData = await expensesResponse.json();

        if (summaryData.status === "success" && expensesData.status === "success") {
            appState.budget = summaryData.total_budget;
            appState.expenses = expensesData.expenses;
            renderCalculatedMetrics(summaryData.total_spent, summaryData.remaining_budget);
        }
    } catch (error) {
        console.warn("Local operational engine error or backend offline. Triggering cache fallback simulation.");
        // Compute simulation values locally so UI runs flawlessly even if the server isn't running
        const localSpent = appState.expenses.reduce((sum, e) => sum + e.amount, 0);
        renderCalculatedMetrics(localSpent, (appState.budget - localSpent));
    }
    
    renderExpenseTable();
    initAnalyticsCharts();
    runAIEssistantHeuristics(false);
    populateDefaultDate();
}

// 4. Setup Interactive DOM Event Triggers
function setupEventHandlers() {
    const modal = document.getElementById("expenseModal");
    const openBtn = document.getElementById("openModalBtn");
    const closeBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelModalBtn");
    const form = document.getElementById("addExpenseForm");
    const nextTipBtn = document.getElementById("nextTipBtn");

    if (openBtn) openBtn.addEventListener("click", () => modal.classList.add("active"));
    
    const closeModalClosure = () => {
        modal.classList.remove("active");
        if (form) form.reset();
        populateDefaultDate();
    };
    
    if (closeBtn) closeBtn.addEventListener("click", closeModalClosure);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModalClosure);
    
    window.addEventListener("click", (e) => {
        if (e.target === modal) closeModalClosure();
    });

    // Form Interception & Data Submission Pipeline
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            // Dynamic selector mapping to handle HTML element ID variations safely
            const descInput = document.getElementById("expDescription") || document.getElementById("description");
            const amountInput = document.getElementById("expAmount") || document.getElementById("amount");
            const categoryInput = document.getElementById("expCategory") || document.getElementById("category");
            const dateInput = document.getElementById("expDate") || document.getElementById("date");

            if (!descInput || !amountInput || !categoryInput || !dateInput) {
                console.error("DOM Selectors structural failure. One or more fields missing.");
                showToast("Form element reference link lost.", "danger");
                return;
            }

            const payload = {
                desc: descInput.value.trim(),
                amount: parseFloat(amountInput.value),
                category: categoryInput.value,
                date: dateInput.value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/add-expense`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (result.status === "success") {
                    showToast("Expense logged to persistent file storage.", "success");
                }
            } catch (error) {
                // Client local generation fallback tracking override if backend fails
                const simulatedId = Math.floor(Math.random() * 100000);
                appState.expenses.unshift({ id: simulatedId, ...payload });
                showToast("Server unreachable. Transaction cached locally instead.", "info");
            }

            const res = await fetch(`${API_BASE_URL}/expenses`);
            const data = await res.json();
            appState.expenses = data.expenses;
            renderExpenseTable();
            initAnalyticsCharts();
            const totalSpent = appState.expenses.reduce((s, e) => s + e.amount, 0);
            renderCalculatedMetrics(totalSpent, appState.budget - totalSpent);
            closeModalClosure();
        });
    }

    if (nextTipBtn) {
        nextTipBtn.addEventListener("click", () => {
            runAIEssistantHeuristics(true);
            showToast("AI intelligence vectors parsed and re-indexed.", "info");
        });
    }

    // --- Sidebar Tab-Switching Engine ---
    const menuItems = document.querySelectorAll(".menu-item");
    const metricsGrid = document.querySelector(".metrics-grid");
    const analyticsSection = document.querySelector(".analytics-section");
    const dataSplitSection = document.querySelector(".data-split-section");
    const tableCard = document.querySelector(".table-card");
    const aiCard = document.getElementById("aiCard");

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();

            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            // Strip out line breaks and layout whitespace caused by nested icon elements
            const selectedTab = item.innerText.replace(/[\n\r]/g, "").trim().toLowerCase();

            // Toggle dashboard visibility layers based on selected tab context
            if (selectedTab.includes("dashboard")) {
                if (metricsGrid) metricsGrid.style.display = "grid";
                if (analyticsSection) analyticsSection.style.display = "flex";
                if (dataSplitSection) dataSplitSection.style.display = "grid";
                if (tableCard) tableCard.style.display = "block";
                if (aiCard) aiCard.style.display = "block";
                showToast("Returned to Master Control System Console.", "info");
            } 
            else if (selectedTab.includes("expenses")) {
                if (metricsGrid) metricsGrid.style.display = "none";
                if (analyticsSection) analyticsSection.style.display = "none";
                if (dataSplitSection) dataSplitSection.style.display = "block";
                if (tableCard) tableCard.style.display = "block";
                if (aiCard) aiCard.style.display = "none";
            } 
            else if (selectedTab.includes("smart tips")) {
                if (metricsGrid) metricsGrid.style.display = "none";
                if (analyticsSection) analyticsSection.style.display = "none";
                if (dataSplitSection) dataSplitSection.style.display = "block";
                if (tableCard) tableCard.style.display = "none";
                if (aiCard) aiCard.style.display = "block";
            } 
            else {
                showToast(`${item.innerText.trim()} terminal layer is in sandbox mode.`, "info");
            }
        });
    });
}

// 5. Calculations & Live UI Card Rendering
function renderCalculatedMetrics(totalSpent, remaining) {
    const spentPercentage = ((totalSpent / appState.budget) * 100).toFixed(1);

    const budgetNode = document.getElementById("totalBudgetVal");
    const spentNode = document.getElementById("totalSpentVal");
    const remainingNode = document.getElementById("remainingVal");

    if (budgetNode) budgetNode.textContent = formatCurrency(appState.budget);
    if (spentNode) spentNode.textContent = formatCurrency(totalSpent);
    if (remainingNode) {
        remainingNode.textContent = formatCurrency(remaining);
        if (remaining < 150) {
            remainingNode.className = "card-value text-danger";
        } else {
            remainingNode.className = "card-value text-gradient-green";
        }
    }
    
    const spentPctElement = document.querySelector(".spent-percentage");
    if (spentPctElement) {
        spentPctElement.textContent = `${isNaN(spentPercentage) ? 0 : spentPercentage}% of allocation budget utilized`;
    }
}

// 6. Dynamic DOM Table Ingestion Component
function renderExpenseTable() {
    const tbody = document.getElementById("expenseTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (appState.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b7280;">No data vectors configured in transaction database.</td></tr>`;
        return;
    }

    appState.expenses.forEach(exp => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHTML(exp.desc)}</td>
            <td><span class="category-badge badge-${exp.category.toLowerCase()}">${exp.category}</span></td>
            <td>${formatDateDisplay(exp.date)}</td>
            <td class="text-danger">-${formatCurrency(exp.amount)}</td>
            <td>
                <button class="delete-btn" onclick="deleteExpenseItem(${exp.id})">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 7. Chart.js Implementation Engine
function initAnalyticsCharts() {
    const categories = ["Food", "Education", "Entertainment", "Transport", "Other"];
    const categoryTotals = categories.map(cat => {
        return appState.expenses
            .filter(exp => exp.category === cat)
            .reduce((sum, exp) => sum + exp.amount, 0);
    });

    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = '#9ca3af';

    // --- Category Breakdown Doughnut Chart ---
    const pieCanvas = document.getElementById("categoryPieChart");
    if (pieCanvas) {
        const ctxPie = pieCanvas.getContext("2d");
        if (pieChartInstance) pieChartInstance.destroy();
        
        pieChartInstance = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: categoryTotals,
                    backgroundColor: ['#f59e0b', '#6366f1', '#a855f7', '#06b6d4', '#9ca3af'],
                    borderWidth: 4,
                    borderColor: '#131a2e',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: 'easeOutBack' },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 10, padding: 12, font: { size: 11, weight: '500' } }
                    }
                },
                cutout: '75%'
            }
        });
    }

    // --- Monthly Spending Line Chart ---
    const lineCanvas = document.getElementById("monthlyLineChart");
    if (lineCanvas) {
        const ctxLine = lineCanvas.getContext("2d");
        if (barChartInstance) barChartInstance.destroy();

        const gradientFill = ctxLine.createLinearGradient(0, 0, 0, 220);
        gradientFill.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradientFill.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        let baseTrend = [110.00, 145.00, 95.00, 215.00, 140.00, 185.00]; 
        if (appState.expenses.length > 0) {
            baseTrend[5] = parseFloat((baseTrend[5] + appState.expenses[0].amount).toFixed(2));
        }

        barChartInstance = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Dynamic Trend line',
                    data: baseTrend,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#131a2e',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    backgroundColor: gradientFill,
                    tension: 0.38
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.03)' } }
                }
            }
        });
    }
}

// 8. Element Backend Removal Processing
async function deleteExpenseItem(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/delete-expense/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === "success") {
            showToast("Transaction removed from file registry.", "danger");
        }
    } catch (error) {
        appState.expenses = appState.expenses.filter(e => e.id !== id);
        showToast("Server offline. Row deleted from local memory cache.", "danger");
    }
    await initDashboard();
}

// 9. AI Heuristics Analytical Simulation Engine
function runAIEssistantHeuristics(isForcedManual = false) {
    const aiCard = document.getElementById("aiCard");
    const aiStatusText = document.getElementById("aiStatusText");
    const aiCoreIcon = document.getElementById("aiCoreIcon");
    const titleNode = document.getElementById("tipTitle");
    const descNode = document.getElementById("tipDesc");

    if (!aiCard || !titleNode || !descNode) return;

    aiStatusText.textContent = "Processing Core Matrix...";
    titleNode.style.opacity = "0.2";
    descNode.style.opacity = "0.2";

    setTimeout(() => {
        aiCard.className = "tips-card ai-assistant-card";
        
        const totalSpent = appState.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const foodSpent = appState.expenses.filter(e => e.category === "Food").reduce((s, e) => s + e.amount, 0);
        const entSpent = appState.expenses.filter(e => e.category === "Entertainment").reduce((s, e) => s + e.amount, 0);
        const remainingBudget = appState.budget - totalSpent;

        let selectedResponse = {
            state: "normal",
            icon: '<i class="fa-solid fa-brain"></i>',
            status: "Telemetry Balanced",
            title: "System Balanced",
            desc: "Your data consumption velocity matches regular baseline models. No structural leakage trends detected across current pipelines."
        };

        if (foodSpent > (appState.budget * 0.20)) {
            selectedResponse = {
                state: "warning",
                icon: '<i class="fa-solid fa-triangle-exclamation"></i>',
                status: "Anomalous Load",
                title: "High Food Outflow Vector",
                desc: `Dining metrics equal $${foodSpent.toFixed(2)} (${((foodSpent/totalSpent)*100 || 0).toFixed(0)}% of metrics). Suggestion: Transition allocations toward optimization alternatives.`
            };
        } else if (entSpent > 80) {
            selectedResponse = {
                state: "advice",
                icon: '<i class="fa-solid fa-circle-info"></i>',
                status: "Optimization Window",
                title: "Subscription Margin Leakage",
                desc: `Leisure networks verify output structural limits at $${entSpent.toFixed(2)}. Verify structural discount variants to optimize subscription margins before recurring billing updates.`
            };
        } else if (remainingBudget > (appState.budget * 0.50) && appState.expenses.length >= 2) {
            selectedResponse = {
                state: "success",
                icon: '<i class="fa-solid fa-circle-check"></i>',
                status: "Optimal Flow",
                title: "High Capital Runway Preserved",
                desc: "Excellent discipline vectors. Your allocation balance preserves more than 50% threshold parameters. Your operations runway extends past baseline metrics safely."
            };
        }

        if (selectedResponse.state !== "normal") {
            aiCard.classList.add(`ai-state-${selectedResponse.state}`);
        }
        
        aiStatusText.textContent = isForcedManual ? "Re-Indexed" : selectedResponse.status;
        if (aiCoreIcon) aiCoreIcon.innerHTML = selectedResponse.icon;
        titleNode.textContent = selectedResponse.title;
        descNode.textContent = selectedResponse.desc;

        titleNode.style.opacity = "1";
        descNode.style.opacity = "1";
    }, 400);
}

// 10. System Notification Component Banner
function showToast(message, type = 'success') {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'danger') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    if (type === 'info') icon = '<i class="fa-solid fa-bolt"></i>';

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 350);
    }, 3200);
}

// 11. Global Helper Formatters & Sanitizers
function formatCurrency(num) {
    return '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return "N/A";
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
}

function populateDefaultDate() {
    const dateInput = document.getElementById("expDate") || document.getElementById("date");
    if (dateInput) dateInput.valueAsDate = new Date();
}

// XSS Sanitizer Hook
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}