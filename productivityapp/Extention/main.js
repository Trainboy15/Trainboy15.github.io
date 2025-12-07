const SERVER_URL = 'https://turbo-lamp-wrvgxj7wgxv5256xv-8000.app.github.dev';
let sessionTimerInterval = null;

function getSessionToken() {
    return localStorage.getItem('sessionToken');
}

function startSessionTimer() {
    // Update session time every 5 minutes
    sessionTimerInterval = setInterval(async () => {
        const token = getSessionToken();
        if (!token) {
            clearInterval(sessionTimerInterval);
            return;
        }
        
        try {
            await fetch(SERVER_URL + '/analytics/update-session-time', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
        } catch (error) {
            console.error('Error updating session time:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
}

function stopSessionTimer() {
    if (sessionTimerInterval) {
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = null;
    }
}

async function fetchUserData(username) {
    try {
        const response = await fetch(SERVER_URL + '/analytics/all-users', {
            headers: { 'Authorization': 'Bearer ' + getSessionToken() }
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.users)) {
            return data.users.find(u => u.uname === username);
        }
        return null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const sessionToken = getSessionToken();
    const loginSection = document.getElementById('loginSection');
    const dataSection = document.getElementById('dataSection');
    const authButton = document.getElementById('authButton');
    const logoutButton = document.getElementById('logoutButton');
    const userDataDiv = document.getElementById('userData');
    
    if (sessionToken) {
        // Validate token and get user info
        try {
            const response = await fetch(SERVER_URL + '/validate-token', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + sessionToken }
            });
            const validData = await response.json();
            
            if (validData.success) {
                // Decode JWT payload to get username
                const payload = JSON.parse(atob(sessionToken.split('.')[1]));
                const username = payload.uname;
                
                // Start session timer to track extension usage
                startSessionTimer();
                
                // Fetch full user data
                const userData = await fetchUserData(username);
                
                // Show data section
                loginSection.style.display = 'none';
                dataSection.style.display = 'block';
                
                if (userData) {
                    userDataDiv.innerHTML = `
                        <div class="user-info">
                            <p class="info-row"><span class="label">Username:</span> <span class="value">${userData.uname}</span></p>
                            <p class="info-row"><span class="label">Time Online:</span> <span class="value">${userData.time_online || 0} min</span></p>
                            <p class="info-row"><span class="label">Questions Right:</span> <span class="value">${userData.questions_right || 0}</span></p>
                            ${userData.admin ? '<p class="info-row"><span class="badge">Admin</span></p>' : ''}
                            ${userData.parent ? '<p class="info-row"><span class="badge">Parent</span></p>' : ''}
                            ${userData.child ? '<p class="info-row"><span class="badge">Child</span></p>' : ''}
                        </div>
                    `;
                } else {
                    userDataDiv.innerHTML = '<p class="error">Could not load user data.</p>';
                }
            } else {
                // Token invalid
                localStorage.removeItem('sessionToken');
                loginSection.style.display = 'block';
                dataSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error validating token:', error);
            localStorage.removeItem('sessionToken');
            loginSection.style.display = 'block';
            dataSection.style.display = 'none';
        }
        
        // Logout handler
        logoutButton.addEventListener('click', async () => {
            stopSessionTimer();
            try {
                await fetch(SERVER_URL + '/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + sessionToken }
                });
            } catch (e) {}
            localStorage.removeItem('sessionToken');
            location.reload();
        });
    } else {
        // User is not logged in - show login section
        loginSection.style.display = 'block';
        dataSection.style.display = 'none';
        
        // Authenticate handler
        authButton.addEventListener('click', () => {
            window.location.href = 'https://turbo-lamp-wrvgxj7wgxv5256xv-3000.app.github.dev/Web/';
        });
    }
});
