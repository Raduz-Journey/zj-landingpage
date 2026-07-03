// ==========================================================================
// CONFIGURATION: PASTE YOUR KEYS HERE
// ==========================================================================
const SUPABASE_URL = "https://egngfclhfeeregttnnju.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_fyESfeL7jdVqA9RPdtrWXg_A9Xx1tYn";

// Foolproof URL cleanup: strips trailing slashes AND extra /rest/v1 paths if copied by accident
const SUPABASE_URL = RAW_SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

// Track when the script loads to catch fast-acting automated bot scripts
const PAGE_LOAD_TIME = Date.now();

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".waitlist-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Stop page from instantly redirecting

        const emailInput = form.querySelector("input[type='email']");
        const submitButton = form.querySelector("button[type='submit']");
        const email = emailInput.value.trim();
        
        // Visual feedback for the user
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = "Verifying...";
        submitButton.disabled = true;

        try {
            // 1. ANTI-BOT TIMESTAMP CHECK
            const submissionTime = Date.now();
            if (submissionTime - PAGE_LOAD_TIME < 1500) {
                throw new Error("Spam bot activity detected. Please try again.");
            }

            // 1b. STRICT EMAIL FORMAT CHECK (.com, .net, etc.)
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                throw new Error("Please enter a valid email address ending in a proper domain (e.g., .com, .io).");
            }

            // 2. FETCH VISITOR'S PUBLIC IP ADDRESS
            const ipResponse = await fetch("https://api.ipify.org?format=json");
            if (!ipResponse.ok) throw new Error("Could not verify your network connection.");
            const ipData = await ipResponse.json();
            const visitorIp = ipData.ip;

            // 3. SECURELY CHECK FOR REPETITIVE IP FLOODING (5-Min Anti-Fraud rule)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const checkIpUrl = `${SUPABASE_URL}/rest/v1/signups?ip_address=eq.${visitorIp}&created_at=gte.${fiveMinutesAgo}&select=id`;
            
            const ipCheckRes = await fetch(checkIpUrl, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const existingEntries = await ipCheckRes.json();
            
            if (existingEntries && existingEntries.length >= 3) {
                throw new Error("Too many signups from this network. Please try again in 5 minutes.");
            }

            // 4. FREE REAL-TIME CHECK FOR FAKE/DISPOSABLE EMAILS (No Key Required!)
            const openCheckUrl = `https://open.kickbox.com/v1/disposable/${encodeURIComponent(email)}`;
            const apiRes = await fetch(openCheckUrl);
            const apiData = await apiRes.json();

            if (apiData.disposable === true) {
                throw new Error("Temporary or fake emails are not allowed. Please use a real email address.");
            }

            // 5. ALL CHECKS PASSED: SAVE DATA TO SUPABASE
            const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/signups`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    email: email,
                    ip_address: visitorIp
                })
            });

            if (!saveRes.ok) {
    const errData = await saveRes.json().catch(() => ({}));
    throw new Error(`Supabase Error (${saveRes.status}): ${errData.message || 'Check RLS policies or column names'}`);
}

            // SUCCESS! Smoothly redirect them to your referral target page
            window.location.href = form.getAttribute("action");

        } catch (error) {
            alert(error.message);
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });
});