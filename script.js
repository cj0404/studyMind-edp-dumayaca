"use strict";

// ===== STATE =====
let tasks = [];
let currentFilter = "all";
let isSidebarOpen = false;

// ===== DOM REFS =====
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const hamburger = document.getElementById("hamburger");
const closeSidebar = document.getElementById("closeSidebar");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const subjectSelect = document.getElementById("subjectSelect");
const prioritySelect = document.getElementById("prioritySelect");
const durationInput = document.getElementById("durationInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const formError = document.getElementById("formError");
const charCount = document.getElementById("charCount");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const pendingBadge = document.getElementById("pendingBadge");
const clearDoneBtn = document.getElementById("clearDoneBtn");
const dateDisplay = document.getElementById("dateDisplay");
const toast = document.getElementById("toast");
const generateBtn = document.getElementById("generateBtn");
const aiPrompt = document.getElementById("aiPrompt");
const hoursPerDay = document.getElementById("hoursPerDay");
const planDays = document.getElementById("planDays");
const aiOutput = document.getElementById("aiOutput");
const aiLoader = document.getElementById("aiLoader");
const aiCard = document.querySelector(".ai-card");
const scheduleGrid = document.getElementById("scheduleGrid");
const scheduleBadge = document.getElementById("scheduleBadge");
const parallaxBg = document.getElementById("parallaxBg");
const tutorialVideo = document.getElementById("tutorialVideo");
const videoOverlay = document.getElementById("videoOverlay");
const playBtn = document.getElementById("playBtn");
const vidPlay = document.getElementById("vidPlay");
const vidMute = document.getElementById("vidMute");
const progressFill = document.getElementById("progressFill");
const progressWrap = document.getElementById("progressWrap");
const vidTime = document.getElementById("vidTime");
const vidStatus = document.getElementById("vidStatus");
const filterBtns = document.querySelectorAll(".filter-btn");
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");

/* =============================================
   PAGE LOAD — restore from localStorage
   ============================================= */
function init() {
    loadTasks();
    setDateDisplay();
    renderTasks();
    renderSchedule();
    observeSections();
    showToast("📚 Welcome back! Tasks loaded.", 2500);
}

function setDateDisplay() {
    const now = new Date();
    const opts = {weekday: "short", month: "short", day: "numeric"};
    dateDisplay.textContent = now.toLocaleDateString("en-US", opts);
}

/* =============================================
   LOCAL STORAGE
   ============================================= */
function saveTasks() {
    localStorage.setItem("studymind_tasks", JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem("studymind_tasks");
    if (saved) {
        tasks = JSON.parse(saved);
    }
}

/* =============================================
   SIDEBAR — open / close
   ============================================= */
function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    isSidebarOpen = true;
}

function closeSidebarFn() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    isSidebarOpen = false;
}

hamburger.addEventListener("click", openSidebar);
closeSidebar.addEventListener("click", closeSidebarFn);
overlay.addEventListener("click", closeSidebarFn);

// Sidebar nav item clicks
navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        navItems.forEach((n) => n.classList.remove("active"));
        item.classList.add("active");
        const section = item.dataset.section;
        const targetMap = {
            tasks: "tasksSection",
            schedule: "scheduleSection",
            ai: "aiSection",
            video: "videoSection",
        };
        const el = document.getElementById(targetMap[section]);
        if (el) {
            closeSidebarFn();
            setTimeout(() => el.scrollIntoView({behavior: "smooth", block: "start"}), 200);
        }
    });
});

/* =============================================
   KEYBOARD EVENTS
   ============================================= */
document.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName;
    const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);

    // ESC — close sidebar
    if (e.key === "Escape") {
        if (isSidebarOpen) closeSidebarFn();
        return;
    }

    // C — open sidebar (not in input)
    if (e.key === "c" && !inInput && !e.ctrlKey && !e.metaKey) {
        openSidebar();
        return;
    }

    // S — scroll to schedule section (not in input)
    if (e.key === "s" && !inInput && !e.ctrlKey && !e.metaKey) {
        const schedule = document.getElementById("scheduleSection");
        if (schedule) schedule.scrollIntoView({behavior: "smooth", block: "start"});
        showToast("📅 Jumped to Schedule", 1500);
        return;
    }

    // Enter — add task OR generate AI schedule depending on context
    if (e.key === "Enter") {
        const activeEl = document.activeElement;

        // Task form fields → add task
        const isInTaskArea =
            activeEl === taskInput ||
            activeEl === subjectSelect ||
            activeEl === prioritySelect ||
            activeEl === durationInput;

        // AI textarea → Ctrl+Enter or just Enter to generate
        const isInAiArea = activeEl === aiPrompt;

        if (isInTaskArea) {
            e.preventDefault();
            handleAddTask();
        } else if (isInAiArea) {
            // Enter alone in AI textarea generates schedule; Shift+Enter = newline
            if (!e.shiftKey) {
                e.preventDefault();
                triggerGenerate();
            }
        } else if (!inInput && taskInput.value.trim()) {
            // Focused nowhere but task input has content → add task
            e.preventDefault();
            handleAddTask();
        }
    }
});

/* =============================================
   CHAR COUNT
   ============================================= */
taskInput.addEventListener("input", () => {
    const len = taskInput.value.length;
    charCount.textContent = `${len}/80`;
    charCount.style.color = len > 70 ? "var(--warn)" : "var(--text-muted)";
});

/* =============================================
   FORM SUBMISSION & VALIDATION
   ============================================= */
taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleAddTask();
});

function handleAddTask() {
    const text = taskInput.value.trim();
    const subject = subjectSelect.value;
    const priority = prioritySelect.value;
    const duration = durationInput.value ? parseInt(durationInput.value) : null;

    // Validation
    formError.textContent = "";

    if (!text) {
        showFormError("⚠️ Please enter a task name.");
        taskInput.focus();
        return;
    }

    if (text.length < 3) {
        showFormError("⚠️ Task must be at least 3 characters.");
        taskInput.focus();
        return;
    }

    if (duration !== null && (duration < 5 || duration > 480)) {
        showFormError("⚠️ Duration must be between 5 and 480 minutes.");
        durationInput.focus();
        return;
    }

    // Create task
    const task = {
        id: Date.now().toString(),
        text,
        subject: subject || null,
        priority,
        duration,
        done: false,
        createdAt: new Date().toISOString(),
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();
    renderSchedule();
    updateStats();

    // Reset form
    taskInput.value = "";
    subjectSelect.value = "";
    prioritySelect.value = "medium";
    durationInput.value = "";
    charCount.textContent = "0/80";

    showToast("✅ Task added!", 2000);
    taskInput.focus();
}

function showFormError(msg) {
    formError.textContent = msg;
    formError.style.animation = "none";
    requestAnimationFrame(() => {
        formError.style.animation = "slideIn 0.3s ease";
    });
}

/* =============================================
   RENDER TASKS
   ============================================= */
function getFilteredTasks() {
    switch (currentFilter) {
        case "pending":
            return tasks.filter((t) => !t.done);
        case "done":
            return tasks.filter((t) => t.done);
        case "high":
            return tasks.filter((t) => t.priority === "high");
        default:
            return tasks;
    }
}

function renderTasks() {
    const filtered = getFilteredTasks();
    taskList.innerHTML = "";

    if (filtered.length === 0) {
        const empty = document.createElement("li");
        empty.className = "task-empty";
        empty.innerHTML = `<div class="empty-icon">📚</div><p>${
            currentFilter === "all"
                ? "No tasks yet. Add one above!"
                : currentFilter === "done"
                ? "No completed tasks."
                : currentFilter === "high"
                ? "No high priority tasks."
                : "No pending tasks. Great work! 🎉"
        }</p>`;
        taskList.appendChild(empty);
        return;
    }

    filtered.forEach((task, index) => {
        const li = document.createElement("li");
        li.className = `task-item priority-${task.priority}${task.done ? " done" : ""}`;
        li.dataset.id = task.id;
        li.style.animationDelay = `${index * 0.04}s`;

        const dateStr = new Date(task.createdAt).toLocaleDateString("en-US", {month: "short", day: "numeric"});

        li.innerHTML = `
      <button class="task-check" data-id="${task.id}" aria-label="${task.done ? "Mark incomplete" : "Mark complete"}">
        ${task.done ? "✓" : ""}
      </button>
      <div class="task-info">
        <div class="task-text">${escapeHtml(task.text)}</div>
        <div class="task-meta">
          ${task.subject ? `<span class="task-tag subject">${task.subject}</span>` : ""}
          <span class="task-tag priority-${task.priority}">${
            task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
        }</span>
          ${task.duration ? `<span class="task-tag duration">⏱ ${task.duration}m</span>` : ""}
        </div>
      </div>
      <span class="task-date">${dateStr}</span>
      <button class="task-delete" data-id="${task.id}" aria-label="Delete task">✕</button>
    `;

        taskList.appendChild(li);
    });

    // Attach hover events for highlight
    taskList.querySelectorAll(".task-item").forEach((item) => {
        item.addEventListener("mouseenter", () => {
            item.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
        });
        item.addEventListener("mouseleave", () => {
            item.style.boxShadow = "";
        });
    });

    updateStats();
}

// Event delegation for check and delete
taskList.addEventListener("click", (e) => {
    const checkBtn = e.target.closest(".task-check");
    const deleteBtn = e.target.closest(".task-delete");

    if (checkBtn) {
        const id = checkBtn.dataset.id;
        toggleTask(id);
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        deleteTask(id);
    }
});

function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
        task.done = !task.done;
        saveTasks();
        renderTasks();
        renderSchedule();
        showToast(task.done ? "✅ Task completed!" : "↩️ Marked incomplete", 1800);
    }
}

function deleteTask(id) {
    const item = taskList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.style.transition = "opacity 0.2s, transform 0.2s";
        item.style.opacity = "0";
        item.style.transform = "translateX(20px)";
        setTimeout(() => {
            tasks = tasks.filter((t) => t.id !== id);
            saveTasks();
            renderTasks();
            renderSchedule();
        }, 200);
    }
    showToast("🗑️ Task deleted", 1500);
}

// Clear done tasks
clearDoneBtn.addEventListener("click", () => {
    const count = tasks.filter((t) => t.done).length;
    if (count === 0) {
        showToast("No completed tasks to clear.", 1500);
        return;
    }
    tasks = tasks.filter((t) => !t.done);
    saveTasks();
    renderTasks();
    renderSchedule();
    showToast(`🧹 Cleared ${count} completed task${count > 1 ? "s" : ""}`, 2000);
});

/* =============================================
   FILTER BAR
   ============================================= */
filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

/* =============================================
   UPDATE STATS
   ============================================= */
function updateStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const pending = total - done;

    totalCount.textContent = total;
    doneCount.textContent = done;
    pendingBadge.textContent = `${pending} pending`;
}

/* =============================================
   SCHEDULE SECTION
   ============================================= */
function renderSchedule() {
    const pending = tasks.filter((t) => !t.done);

    if (pending.length === 0) {
        scheduleGrid.innerHTML = '<div class="schedule-empty">No tasks scheduled yet. Add tasks above!</div>';
        scheduleBadge.textContent = "Auto-organized";
        return;
    }

    const timeSlots = generateTimeSlots(pending);
    scheduleGrid.innerHTML = "";

    timeSlots.forEach((slot) => {
        const card = document.createElement("div");
        card.className = "schedule-card";
        card.innerHTML = `
      <div class="schedule-time">${slot.time}</div>
      <div class="schedule-task">${escapeHtml(slot.task.text)}</div>
      ${slot.task.subject ? `<div class="schedule-subject">${slot.task.subject}</div>` : ""}
      <div class="schedule-dur">⏱ ${slot.task.duration ? slot.task.duration + " min" : "30 min"}</div>
    `;
        scheduleGrid.appendChild(card);
    });

    scheduleBadge.textContent = `${pending.length} task${pending.length > 1 ? "s" : ""} today`;
}

function generateTimeSlots(taskArr) {
    const startHour = 8; // 8:00 AM
    let currentMinutes = startHour * 60;

    return taskArr.slice(0, 6).map((task) => {
        const dur = task.duration || 30;
        const hh = Math.floor(currentMinutes / 60);
        const mm = currentMinutes % 60;
        const ampm = hh < 12 ? "AM" : "PM";
        const displayHour = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
        const time = `${displayHour}:${mm.toString().padStart(2, "0")} ${ampm}`;

        currentMinutes += dur + 10; // 10 min break

        return {time, task};
    });
}

/* =============================================
   SCROLL EVENTS — parallax + section animation
   ============================================= */
function handleScroll() {
    const scrollY = window.scrollY;

    // Parallax layers
    const layer1 = parallaxBg.querySelector(".layer-1");
    const layer2 = parallaxBg.querySelector(".layer-2");
    const layer3 = parallaxBg.querySelector(".layer-3");

    if (layer1) layer1.style.transform = `translateY(${scrollY * 0.15}px)`;
    if (layer2) layer2.style.transform = `translateY(${-scrollY * 0.1}px) translateX(${scrollY * 0.05}px)`;
    if (layer3) layer3.style.transform = `translateY(${scrollY * 0.08}px) rotate(${scrollY * 0.02}deg)`;
}

window.addEventListener("scroll", handleScroll, {passive: true});

// Intersection Observer for scroll-animate sections
function observeSections() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            });
        },
        {threshold: 0.1, rootMargin: "0px 0px -40px 0px"}
    );

    sections.forEach((s) => observer.observe(s));
}

/* =============================================
   WINDOW RESIZE — responsive adjustments
   ============================================= */
function handleResize() {
    const width = window.innerWidth;

    // Auto-close sidebar on small screen resize
    if (width >= 1024 && isSidebarOpen) {
        // keep it open on large screens if they resize in
    }

    // On very small screens, hide sidebar overlay
    if (width < 480 && isSidebarOpen) {
        closeSidebarFn();
    }
}

window.addEventListener("resize", handleResize, {passive: true});

/* =============================================
   AI SCHEDULE GENERATOR — Smart Local Engine
   No API key needed. Works fully offline.
   ============================================= */

// ── Subject intelligence bank ──
const SUBJECT_DATA = {
    math: {
        label: "Math",
        icon: "📐",
        color: "#6eb5ff",
        tips: [
            "Practice problems > re-reading notes",
            "Work hardest problems first while fresh",
            "Write out each step — don't skip mentally",
        ],
    },
    science: {
        label: "Science",
        icon: "🔬",
        color: "#a78bfa",
        tips: [
            "Draw diagrams to visualize concepts",
            "Connect new facts to things you already know",
            "Use flashcards for formulas & definitions",
        ],
    },
    physics: {
        label: "Physics",
        icon: "⚛️",
        color: "#a78bfa",
        tips: [
            "Derive formulas yourself instead of memorizing",
            "Sketch free-body diagrams for every problem",
            "Units check: always verify dimensional analysis",
        ],
    },
    chemistry: {
        label: "Chemistry",
        icon: "⚗️",
        color: "#34d399",
        tips: [
            "Balance equations step by step",
            "Memorize the periodic table in groups",
            "Use mnemonics for reaction types",
        ],
    },
    biology: {
        label: "Biology",
        icon: "🧬",
        color: "#34d399",
        tips: [
            "Use the Cornell note method",
            "Create concept maps linking systems",
            "Quiz yourself on terminology daily",
        ],
    },
    english: {
        label: "English",
        icon: "📖",
        color: "#fbbf24",
        tips: [
            "Read actively — annotate as you go",
            "Outline essays before writing",
            "Read your draft aloud to catch errors",
        ],
    },
    history: {
        label: "History",
        icon: "🏛️",
        color: "#f97316",
        tips: [
            "Build a timeline for each era",
            "Understand causes → events → effects",
            "Use story-mode to make dates stick",
        ],
    },
    geography: {
        label: "Geography",
        icon: "🗺️",
        color: "#f97316",
        tips: [
            "Draw maps from memory",
            "Link physical features to historical events",
            "Use mnemonic devices for capitals",
        ],
    },
    cs: {
        label: "CS",
        icon: "💻",
        color: "#c8f564",
        tips: [
            "Code every concept — don't just read it",
            "Debug by explaining code aloud (rubber duck)",
            "Break problems into smaller sub-problems",
        ],
    },
    programming: {
        label: "Programming",
        icon: "💻",
        color: "#c8f564",
        tips: [
            "Build mini-projects for each topic",
            "Read others' code to learn patterns",
            "Test edge cases, not just happy paths",
        ],
    },
    literature: {
        label: "Literature",
        icon: "📚",
        color: "#fbbf24",
        tips: [
            "Track themes, symbols, and motifs",
            "Connect characters to their context",
            "Quote directly when analyzing",
        ],
    },
    economics: {
        label: "Economics",
        icon: "📈",
        color: "#34d399",
        tips: [
            "Draw supply/demand curves by hand",
            "Relate theory to real-world examples",
            'Focus on the "why" behind each model',
        ],
    },
    filipino: {
        label: "Filipino",
        icon: "🇵🇭",
        color: "#fbbf24",
        tips: [
            "Read Filipino literature daily",
            "Practice writing essays in Filipino",
            "Review grammar rules through examples",
        ],
    },
    araling: {
        label: "Araling Panlipunan",
        icon: "🌏",
        color: "#f97316",
        tips: ["Study events chronologically", "Relate history to present-day issues", "Use maps and timelines"],
    },
    mapeh: {
        label: "MAPEH",
        icon: "🎨",
        color: "#f472b6",
        tips: [
            "Review theory + practice separately",
            "Use visuals for art and music concepts",
            "Relate PE lessons to real sports rules",
        ],
    },
    tle: {
        label: "TLE",
        icon: "🔧",
        color: "#94a3b8",
        tips: ["Focus on practical application", "Review safety procedures", "Study tools and their uses carefully"],
    },
    values: {
        label: "Values Ed",
        icon: "🌱",
        color: "#34d399",
        tips: [
            "Reflect on real-life scenarios",
            "Connect lessons to personal experiences",
            "Review key concepts with examples",
        ],
    },
    review: {
        label: "General Review",
        icon: "🔁",
        color: "#94a3b8",
        tips: [
            "Practice past exams under timed conditions",
            "Focus on weak areas first",
            "Summarize each topic in one page",
        ],
    },
    exam: {
        label: "Exam Prep",
        icon: "📝",
        color: "#ff6b6b",
        tips: [
            "Simulate exam conditions while practicing",
            "Review mistakes — don't just redo correct ones",
            "Get 8h sleep the night before",
        ],
    },
    essay: {
        label: "Essay Writing",
        icon: "✍️",
        color: "#fbbf24",
        tips: [
            "Outline: intro → 3 body points → conclusion",
            "State your thesis in the first paragraph",
            "Cite evidence for every claim",
        ],
    },
    thesis: {
        label: "Thesis",
        icon: "📄",
        color: "#a78bfa",
        tips: [
            "Write daily — even 200 words counts",
            "Start with the section you find easiest",
            "Keep a running log of your sources",
        ],
    },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STUDY_STRATEGIES = [
    {name: "Pomodoro", desc: "25 min focus → 5 min break. After 4 rounds, take a 20 min break."},
    {name: "Active Recall", desc: "Close your notes, write everything you remember, then check."},
    {name: "Spaced Repetition", desc: "Review material after 1 day, 3 days, 1 week, then 2 weeks."},
    {name: "Feynman Technique", desc: "Explain the concept as if teaching a 10-year-old. Gaps = study more."},
    {name: "Mind Mapping", desc: "Draw a central concept and branch out sub-topics visually."},
];

const URGENCY_KEYWORDS = {
    high: [
        "tomorrow",
        "tonight",
        "today",
        "urgent",
        "asap",
        "due soon",
        "in a few hours",
        "this morning",
        "this afternoon",
    ],
    medium: ["this week", "in 2 days", "in 3 days", "few days", "by friday", "by thursday", "by wednesday"],
    low: ["next week", "next month", "eventually", "later", "when i have time", "no rush"],
};

const EXAM_KEYWORDS = ["exam", "test", "quiz", "midterm", "final", "assessment", "board", "licensure", "entrance"];
const ESSAY_KEYWORDS = ["essay", "paper", "report", "write", "writing", "thesis", "research paper", "term paper"];
const DEADLINE_PATTERN = /in\s+(\d+)\s+(day|days|week|weeks)/i;

// ── NLP: extract subjects from freetext ──
function extractSubjects(text) {
    const lower = text.toLowerCase();
    const found = [];

    Object.keys(SUBJECT_DATA).forEach((key) => {
        const label = SUBJECT_DATA[key].label.toLowerCase();
        if (lower.includes(key) || lower.includes(label)) {
            if (!found.find((f) => f.key === key)) found.push({key, ...SUBJECT_DATA[key]});
        }
    });

    // Detect exam/essay intent even without explicit subject
    if (found.length === 0) {
        if (EXAM_KEYWORDS.some((k) => lower.includes(k))) found.push({key: "exam", ...SUBJECT_DATA.exam});
        if (ESSAY_KEYWORDS.some((k) => lower.includes(k))) found.push({key: "essay", ...SUBJECT_DATA.essay});
    }

    // Add generic review if still nothing found
    if (found.length === 0) found.push({key: "review", ...SUBJECT_DATA.review});

    return found;
}

// ── NLP: detect urgency per subject mention ──
function detectUrgency(text, subjectLabel) {
    const lower = text.toLowerCase();
    const subjectIdx = lower.indexOf(subjectLabel.toLowerCase());
    // look at the 60 chars around the subject mention
    const context = lower.slice(Math.max(0, subjectIdx - 30), subjectIdx + 60);

    if (URGENCY_KEYWORDS.high.some((k) => context.includes(k) || lower.includes(k))) return "high";
    if (URGENCY_KEYWORDS.medium.some((k) => context.includes(k) || lower.includes(k))) return "medium";
    return "low";
}

// ── Detect explicit deadline in days ──
function extractDeadlineDays(text) {
    const m = text.match(DEADLINE_PATTERN);
    if (!m) return null;
    const num = parseInt(m[1]);
    return m[2].startsWith("week") ? num * 7 : num;
}

// ── Pick study strategy based on urgency mix ──
function pickStrategy(subjects) {
    const urgencies = subjects.map((s) => s.urgency);
    if (urgencies.includes("high")) return STUDY_STRATEGIES[0]; // Pomodoro for crunch
    if (subjects.length > 3) return STUDY_STRATEGIES[2]; // Spaced rep for many subjects
    return STUDY_STRATEGIES[Math.floor(Math.random() * STUDY_STRATEGIES.length)];
}

// ── Allocate minutes per subject per day based on urgency ──
function allocateTime(subjects, totalMinutesPerDay) {
    const weights = {high: 3, medium: 2, low: 1};
    const totalWeight = subjects.reduce((s, sub) => s + weights[sub.urgency], 0);
    return subjects.map((sub) => ({
        ...sub,
        minutes: Math.round((weights[sub.urgency] / totalWeight) * totalMinutesPerDay),
    }));
}

// ── Format minutes → readable time ──
function fmtMins(mins) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60),
        m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Add minutes to a time string like "8:00 AM" ──
function addMinutes(timeStr, mins) {
    const [time, ampm] = timeStr.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const total = h * 60 + m + mins;
    let nh = Math.floor(total / 60) % 24,
        nm = total % 60;
    const nAmpm = nh < 12 ? "AM" : "PM";
    if (nh > 12) nh -= 12;
    if (nh === 0) nh = 12;
    return `${nh}:${nm.toString().padStart(2, "0")} ${nAmpm}`;
}

// ── Detect preferred study time from text ──
function detectStudyTime(text) {
    const lower = text.toLowerCase();
    if (lower.includes("morning") || lower.includes("early")) return "7:00 AM";
    if (lower.includes("afternoon")) return "1:00 PM";
    if (lower.includes("evening") || lower.includes("night")) return "6:00 PM";
    return "8:00 AM";
}

// ── Main generator — returns { html, slots, tasksToAdd } ──
function runLocalAI(prompt, hours, days) {
    const subjects = extractSubjects(prompt);
    const startTime = detectStudyTime(prompt);
    const totalMins = hours * 60;
    const deadlineDays = extractDeadlineDays(prompt);

    subjects.forEach((sub) => {
        sub.urgency = detectUrgency(prompt, sub.label);
        if (deadlineDays !== null && deadlineDays <= 2) sub.urgency = "high";
    });
    subjects.sort((a, b) => ({high: 0, medium: 1, low: 2}[a.urgency] - {high: 0, medium: 1, low: 2}[b.urgency]));

    const allocated = allocateTime(subjects, totalMins);
    const strategy = pickStrategy(subjects);
    const today = new Date();
    const slots = [];
    const tasksToAdd = [];

    let html = '<div class="ai-result">';
    html += "<h4>\u2726 Your Personalized " + days + "-Day Plan</h4>";
    html +=
        '<p style="margin-bottom:12px;color:var(--text-muted);font-size:0.82rem;">Detected <strong style="color:var(--text)">' +
        subjects.length +
        " subject" +
        (subjects.length > 1 ? "s" : "") +
        '</strong> \u00b7 Strategy: <strong style="color:var(--accent)">' +
        strategy.name +
        "</strong></p>";

    for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        const dayName = DAY_NAMES[date.getDay()];
        const dateStr = date.toLocaleDateString("en-US", {month: "short", day: "numeric"});
        const isExamCrunch = deadlineDays !== null && d >= deadlineDays - 2;

        html += "<h4>Day " + (d + 1) + " \u2014 " + dayName + ", " + dateStr + "</h4>";
        let currentTime = startTime;

        if (isExamCrunch) {
            const crunchSlots = [
                {
                    label: "Full Review of All Topics",
                    icon: "\uD83D\uDD01",
                    mins: Math.round(totalMins * 0.5),
                    subject: "Review",
                    urgency: "high",
                },
                {
                    label: "Practice Exam / Past Papers",
                    icon: "\uD83D\uDCDD",
                    mins: Math.round(totalMins * 0.35),
                    subject: "Exam Prep",
                    urgency: "high",
                },
                {
                    label: "Error Review & Weak Spots",
                    icon: "\uD83C\uDFAF",
                    mins: Math.round(totalMins * 0.15),
                    subject: "Review",
                    urgency: "high",
                },
            ];
            html += "<p>\uD83D\uDD34 <strong>Crunch Mode</strong> \u2014 Final push before deadline</p>";
            crunchSlots.forEach((cs) => {
                html +=
                    "<p>\u2022 " +
                    currentTime +
                    " \u2014 " +
                    cs.icon +
                    " " +
                    cs.label +
                    ": " +
                    fmtMins(cs.mins) +
                    "</p>";
                slots.push({
                    time: currentTime,
                    task: cs.icon + " " + cs.label,
                    subject: cs.subject,
                    duration: cs.mins,
                    day: d + 1,
                    dayName,
                    urgency: cs.urgency,
                });
                if (d === 0)
                    tasksToAdd.push({
                        text: cs.icon + " " + cs.label,
                        subject: cs.subject,
                        priority: "high",
                        duration: cs.mins,
                    });
                currentTime = addMinutes(currentTime, cs.mins + 10);
            });
        } else {
            allocated.forEach((sub, i) => {
                const rotated = allocated[(i + d) % allocated.length];
                const urgencyIcon =
                    rotated.urgency === "high"
                        ? "\uD83D\uDD34"
                        : rotated.urgency === "medium"
                        ? "\uD83D\uDFE1"
                        : "\uD83D\uDFE2";
                const tip = rotated.tips[d % rotated.tips.length];
                const taskLabel = rotated.icon + " " + rotated.label + " Study";

                html +=
                    "<p>" +
                    urgencyIcon +
                    " " +
                    currentTime +
                    " \u2014 <strong>" +
                    rotated.icon +
                    " " +
                    rotated.label +
                    "</strong>: " +
                    fmtMins(rotated.minutes) +
                    "</p>";
                html +=
                    '<p style="margin-left:16px;color:var(--text-muted);font-size:0.8rem;">\uD83D\uDCA1 ' +
                    tip +
                    "</p>";

                slots.push({
                    time: currentTime,
                    task: taskLabel,
                    subject: rotated.label,
                    duration: rotated.minutes,
                    day: d + 1,
                    dayName,
                    urgency: rotated.urgency,
                });
                if (d === 0)
                    tasksToAdd.push({
                        text: taskLabel,
                        subject: rotated.label,
                        priority: rotated.urgency === "high" ? "high" : rotated.urgency === "medium" ? "medium" : "low",
                        duration: rotated.minutes,
                    });
                currentTime = addMinutes(currentTime, rotated.minutes + 10);
            });
            html += "<p>\uD83D\uDD01 " + currentTime + " \u2014 Quick recap: 15 min</p>";
            slots.push({
                time: currentTime,
                task: "\uD83D\uDD01 Quick Recap",
                subject: "Review",
                duration: 15,
                day: d + 1,
                dayName,
                urgency: "low",
            });
        }
    }

    html += "<h4>\u26A1 Recommended: " + strategy.name + "</h4><p>" + strategy.desc + "</p>";
    html += "<h4>\uD83D\uDCCC Subject Tips</h4>";
    subjects.forEach((sub) => {
        html += "<p><strong>" + sub.icon + " " + sub.label + ":</strong> " + sub.tips[0] + "</p>";
    });
    html += "</div>";

    return {html, slots, tasksToAdd};
}

// ── Render AI slots into the Schedule section grid ──
function renderAISchedule(slots) {
    scheduleGrid.innerHTML = "";
    if (!slots || slots.length === 0) {
        scheduleGrid.innerHTML = '<div class="schedule-empty">No slots generated.</div>';
        return;
    }
    const byDay = {};
    slots.forEach((s) => {
        const key = "Day " + s.day + " \u2014 " + s.dayName;
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(s);
    });
    Object.entries(byDay).forEach(([dayLabel, daySlots]) => {
        const header = document.createElement("div");
        header.className = "schedule-day-header";
        header.textContent = dayLabel;
        scheduleGrid.appendChild(header);
        daySlots.forEach((slot) => {
            const card = document.createElement("div");
            card.className = "schedule-card ai-generated";
            const urgencyDot =
                slot.urgency === "high" ? "\uD83D\uDD34" : slot.urgency === "medium" ? "\uD83D\uDFE1" : "\uD83D\uDFE2";
            card.innerHTML =
                '<div class="schedule-time">' +
                slot.time +
                "</div>" +
                '<div class="schedule-task">' +
                slot.task +
                "</div>" +
                '<div class="schedule-subject">' +
                urgencyDot +
                " " +
                slot.subject +
                "</div>" +
                '<div class="schedule-dur">\u23F1 ' +
                fmtMins(slot.duration) +
                "</div>";
            scheduleGrid.appendChild(card);
        });
    });
    scheduleBadge.textContent = slots.length + " AI-generated slots";
}

// ── Inject today\'s sessions into My Tasks ──
function injectAITasks(tasksToAdd) {
    tasks = tasks.filter((t) => !t.aiGenerated);
    tasksToAdd.forEach((t) => {
        tasks.unshift({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            text: t.text,
            subject: t.subject || null,
            priority: t.priority || "medium",
            duration: t.duration || null,
            done: false,
            aiGenerated: true,
            createdAt: new Date().toISOString(),
        });
    });
    saveTasks();
    renderTasks();
    updateStats();
}

// ── Button click handler ──
generateBtn.addEventListener("click", () => triggerGenerate());

function triggerGenerate() {
    const prompt = aiPrompt.value.trim();
    const hours = parseInt(hoursPerDay.value) || 4;
    const days = parseInt(planDays.value) || 7;

    if (!prompt) {
        aiOutput.innerHTML =
            '<div class="ai-placeholder"><div class="ai-placeholder-icon">\uD83D\uDCA1</div><p>Please describe your study goals first.</p></div>';
        showToast("\u26A0\uFE0F Describe your goals first", 2000);
        return;
    }

    generateBtn.disabled = true;
    aiLoader.classList.add("active");
    aiCard.style.opacity = "0.7";
    aiOutput.innerHTML = "";

    setTimeout(() => {
        try {
            const result = runLocalAI(prompt, hours, days);
            aiOutput.innerHTML = result.html;
            renderAISchedule(result.slots);
            injectAITasks(result.tasksToAdd);
            setTimeout(() => {
                document.getElementById("scheduleSection").scrollIntoView({behavior: "smooth", block: "start"});
            }, 500);
            showToast("\u2726 Schedule synced! " + result.tasksToAdd.length + " tasks added for today.", 3500);
        } catch (err) {
            console.error("Generator error:", err);
            aiOutput.innerHTML =
                '<div class="ai-result"><h4>\u26A0\uFE0F Something went wrong</h4><p>Please try rephrasing your study goals.</p></div>';
        } finally {
            generateBtn.disabled = false;
            aiLoader.classList.remove("active");
            aiCard.style.opacity = "1";
        }
    }, 1200);
}

/* =============================================
   VIDEO EVENTS
   ============================================= */
// Big play button
playBtn.addEventListener("click", () => {
    tutorialVideo.play();
    videoOverlay.classList.add("hidden");
    updateVidStatus("playing");
});

// Controls play/pause toggle
vidPlay.addEventListener("click", () => {
    if (tutorialVideo.paused) {
        tutorialVideo.play();
        vidPlay.textContent = "⏸";
        updateVidStatus("playing");
    } else {
        tutorialVideo.pause();
        vidPlay.textContent = "▶";
        updateVidStatus("paused");
    }
});

// Mute toggle
vidMute.addEventListener("click", () => {
    tutorialVideo.muted = !tutorialVideo.muted;
    vidMute.textContent = tutorialVideo.muted ? "🔇" : "🔊";
});

// Progress bar update
tutorialVideo.addEventListener("timeupdate", () => {
    if (tutorialVideo.duration) {
        const pct = (tutorialVideo.currentTime / tutorialVideo.duration) * 100;
        progressFill.style.width = pct + "%";
        vidTime.textContent = formatTime(tutorialVideo.currentTime);
    }
});

// Seek on click
progressWrap.addEventListener("click", (e) => {
    const rect = progressWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    tutorialVideo.currentTime = pct * tutorialVideo.duration;
});

// Video end event
tutorialVideo.addEventListener("ended", () => {
    videoOverlay.classList.remove("hidden");
    playBtn.textContent = "↺";
    vidPlay.textContent = "▶";
    updateVidStatus("ended");
    showToast("🎬 Video finished!", 2000);
});

// Video start event
tutorialVideo.addEventListener("play", () => {
    updateVidStatus("playing");
    vidPlay.textContent = "⏸";
});

tutorialVideo.addEventListener("pause", () => {
    if (!tutorialVideo.ended) {
        updateVidStatus("paused");
        vidPlay.textContent = "▶";
    }
});

function updateVidStatus(state) {
    const statusMap = {
        playing: {text: "▶ Playing", cls: "playing"},
        paused: {text: "⏸ Paused", cls: ""},
        ended: {text: "✔ Finished", cls: "ended"},
    };
    const s = statusMap[state] || {text: "⏸ Not started", cls: ""};
    vidStatus.textContent = s.text;
    vidStatus.className = `vid-event-pill ${s.cls}`;
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* =============================================
   HOVER EVENTS — Button highlights (beyond CSS)
   ============================================= */
document.querySelectorAll(".btn-add, .btn-ai").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
        btn.style.letterSpacing = "0.02em";
    });
    btn.addEventListener("mouseleave", () => {
        btn.style.letterSpacing = "";
    });
});

/* =============================================
   TOAST NOTIFICATION
   ============================================= */
let toastTimer = null;
function showToast(msg, duration = 2500) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

/* =============================================
   UTILITY
   ============================================= */
function escapeHtml(str) {
    return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =============================================
   BOOT
   ============================================= */
document.addEventListener("DOMContentLoaded", init);
