const questionTitle = document.getElementById("questionTitle");
const question = document.getElementById("question");
const answersDiv = document.getElementById("answers");
const form = document.getElementById("answerForm");
const loginSection = document.getElementById("loginSection");
const mainContainer = document.getElementById("mainContainer");
const feedbackDiv = document.getElementById("feedback");
const loginBtn = document.getElementById("loginBtn");

const SERVER_URL = 'https://turbo-lamp-wrvgxj7wgxv5256xv-8000.app.github.dev';

let questions = [];
let currentIndex = 0;
let correctAnswer = "";
let currentType = "";
let sessionToken = null;
let currentUsername = null;
let correctCount = 0;
let totalCount = 0;
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

function checkAuthentication() {
  sessionToken = getSessionToken();
  
  if (!sessionToken) {
    loginSection.style.display = 'block';
    mainContainer.style.display = 'none';
    
    loginBtn.addEventListener('click', () => {
      window.location.href = 'https://turbo-lamp-wrvgxj7wgxv5256xv-3000.app.github.dev/Web/index.html?redirect=https://turbo-lamp-wrvgxj7wgxv5256xv-3000.app.github.dev/Extension/questions.html';
    });
    return false;
  }
  
  // Validate token
  try {
    const payload = JSON.parse(atob(sessionToken.split('.')[1]));
    currentUsername = payload.uname;
    loginSection.style.display = 'none';
    mainContainer.style.display = 'block';
    // Display username
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
      usernameDisplay.textContent = currentUsername;
    }
    if (payload.admin == true) {
      alert("Admin's Cannot Access Questions Section!");
      window.location.href = 'https://turbo-lamp-wrvgxj7wgxv5256xv-3000.app.github.dev/Web/';
      return false;
    }
    startSessionTimer();
    return true;
  } catch (e) {
    console.error('Invalid token:', e);
    localStorage.removeItem('sessionToken');
    loginSection.style.display = 'block';
    mainContainer.style.display = 'none';
    return false;
  }
}

function updateUserStats(isCorrect) {
  if (!currentUsername || !sessionToken) return;
  
  totalCount++;
  if (isCorrect) {
    correctCount++;
  }
  
  // Update in database
  const endpoint = `${SERVER_URL}/analytics/update-user-stats`;
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({
      username: currentUsername,
      correct: isCorrect ? 1 : 0
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      console.error('Failed to update stats:', data.message);
    }
  })
  .catch(err => console.error('Error updating stats:', err));
}

function loadQuestions() {
  fetch("https://api.npoint.io/5048143f6c10c99cbef0")
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Questions loaded successfully:", data);
      questions = Object.keys(data);
      if (questions.length === 0) {
        question.textContent = "No questions found.";
        return;
      }
      showQuestion(data);

      form.onsubmit = function (e) {
        e.preventDefault();

        let userAnswer = "";

        if (currentType === "mcq") {
          const radios = document.getElementsByName("answer");
          for (let r of radios) {
            if (r.checked) {
              userAnswer = r.value;
              break;
            }
          }
        } else if (currentType === "typed") {
          userAnswer = document.getElementById("typedAnswer").value.trim();
        }

        const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        updateUserStats(isCorrect);
        
        // Show feedback
        feedbackDiv.style.display = 'block';
        if (isCorrect) {
          feedbackDiv.style.background = '#d4edda';
          feedbackDiv.style.color = '#155724';
          feedbackDiv.textContent = "Correct!";
          console.log("Correct!");
        } else {
          feedbackDiv.style.background = '#f8d7da';
          feedbackDiv.style.color = '#721c24';
          feedbackDiv.textContent = `Incorrect! Correct answer: ${correctAnswer}`;
          console.log("Incorrect! Correct answer was:", correctAnswer);
        }

        currentIndex++;
        if (currentIndex < questions.length) {
          setTimeout(() => {
            feedbackDiv.style.display = 'none';
            showQuestion(data);
          }, 2000);
        } else {
          questionTitle.textContent = "Quiz finished!";
          question.textContent = `Well done! You got ${correctCount}/${totalCount} questions correct.`;
          answersDiv.innerHTML = "";
          form.style.display = 'none';
          feedbackDiv.style.display = 'block';
          feedbackDiv.style.background = '#d4edda';
          feedbackDiv.style.color = '#155724';
          feedbackDiv.textContent = `Quiz Complete: ${correctCount}/${totalCount} correct`;
          stopSessionTimer();
          window.location.href = 'https://turbo-lamp-wrvgxj7wgxv5256xv-3000.app.github.dev/Web/';
        }
      };
    })
    .catch(error => {
      console.error("Error loading questions:", error);
      questionTitle.textContent = "Error";
      question.textContent = "Failed to load questions. Please check the console.";
    });
}

function showQuestion(data) {
  const qKey = questions[currentIndex];
  const qData = data[qKey];

  questionTitle.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  question.textContent = qData.question;
  correctAnswer = qData.correct;
  currentType = qData.type;

  // clear previous answers
  answersDiv.innerHTML = "";
  feedbackDiv.style.display = 'none';

  if (qData.type === "mcq") {
    const shuffled = shuffleArray(qData.answers);
    shuffled.forEach((ans, idx) => {
      const div = document.createElement("div");
      const input = document.createElement("input");
      input.type = "radio";
      input.id = `answer${idx}`;
      input.name = "answer";
      input.value = ans;

      const label = document.createElement("label");
      label.setAttribute("for", `answer${idx}`);
      label.textContent = ans;

      div.appendChild(input);
      div.appendChild(label);
      answersDiv.appendChild(div);
    });
  } else if (qData.type === "typed") {
    const label = document.createElement("label");
    label.setAttribute("for", "typedAnswer");
    label.textContent = "Type your answer:";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "typedAnswer";
    input.name = "typedAnswer";

    answersDiv.appendChild(label);
    answersDiv.appendChild(input);
  }
}

// helper: shuffle array
function shuffleArray(arr) {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

// Initialize
if (checkAuthentication()) {
  loadQuestions();
}
