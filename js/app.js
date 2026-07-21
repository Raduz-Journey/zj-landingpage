// ===================== PASTE YOUR KEYS HERE
// ==========================================================================
const RAW_SUPABASE_URL = "https://egngfclhfeeregttnnju.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_fyESfeL7jdVqA9RPdtrWXg_A9Xx1tYn";

// Foolproof URL cleanup: strips trailing slashes AND extra /rest/v1 paths if copied by accident
const SUPABASE_URL = RAW_SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

// Track when the script loads to catch fast-acting automated bot scripts
const PAGE_LOAD_TIME = Date.now();

document.addEventListener("DOMContentLoaded", () => {
    const formContainer = document.querySelector(".waitlist-form");
    const submitButton = document.getElementById("submit-btn");
    
    if (!formContainer || !submitButton) return;

    // Listen directly to the button click rather than a form submission
    submitButton.addEventListener("click", async () => {
        const emailInput = formContainer.querySelector("input[type='email']");
        const email = emailInput.value.trim();
        
        // Native browser validation doesn't block a div container, so we validate manually here:
        if (!email) {
            alert("Please enter an email address.");
            return;
        }

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

            // 3. SECURELY CHECK FOR REPETITIVE IP FLOODING (Max 2 Signups Forever rule)
            const checkIpUrl = `${SUPABASE_URL}/rest/v1/signups?ip_address=eq.${visitorIp}&select=id`;
            
            const ipCheckRes = await fetch(checkIpUrl, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (!ipCheckRes.ok) {
                const errData = await ipCheckRes.json().catch(() => ({}));
                throw new Error(`IP Check Failed (${ipCheckRes.status}): ${errData.message || 'Check table name'}`);
            }
            
            const existingEntries = await ipCheckRes.json();
            console.log("Total entries found for this IP:", existingEntries.length);

            // Strict check: Convert it directly to a number to leave no room for errors
            if (Number(existingEntries.length) >= 2) {
                throw new Error(`Limit reached! You already have ${existingEntries.length} signups from this network.`);
            }

            // 4. FREE REAL-TIME CHECK FOR FAKE/DISPOSABLE EMAILS (No Key Required!)
            const openCheckUrl = `https://open.kickbox.com/v1/disposable/${encodeURIComponent(email)}`;
            const apiRes = await fetch(openCheckUrl);
            const apiData = await apiRes.json();

            if (apiData.disposable === true) {
                throw new Error("Temporary or fake emails are not allowed. Please use a real email address.");
            }

            // 5. ALL CHECKS PASSED: SAVE DATA TO SUPABASE
            const response = await fetch(`${SUPABASE_URL}/rest/v1/signups`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    email: email, // Fixed: changed from userEmail to email
                    ip_address: visitorIp // Fixed: matches your corrected Supabase column
                })
            });

            // IF THE SYSTEM REJECTS IT (Errors or duplicates)
            if (!response.ok) {
                const errorText = await response.text();
                
                // Check if the database complains about your unique constraint rule
                if (errorText.includes("unique_email") || errorText.includes("23505") || response.status === 409) {
                    throw new Error("This email address has already signed up!");
                }
                
                throw new Error(`Submission failed: ${errorText || response.statusText}`);
            }

            // SUCCESS! Smoothly redirect them to your referral target page
            window.location.href = "pages/refferal.html";

        } catch (error) {
            // Any validation error or duplicate error ends up right here safely
            alert(error.message);
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });
});