// ✅ Manually Curated Doctor Dataset with FULL CHATBOT URLs
const allDoctors = [
    {
        name: "Dr. Mahabal",
        specialization: "Depressive Disorder",
        clinic: "Yash Brain Clinic & Vertigo Centre",
        address: "B6, 2nd Floor, Shangrila Garden Complex, Bund Garden Road, Pune, Maharashtra",
        fees: "₹500 per session",
        chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_XQPHpI7o&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09 "
    },
    {
        name: "Dr. Kulkarni",
        specialization: "Obsessive Compulsive Disorder",
        clinic: "Mastishka Neurology Clinic",
        address: "Tilak Road, Pune, Maharashtra",
        fees: "₹1,000 per session",
        chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_tfiAEAwF&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09 "
    },
    {
        name: "Dr. Snehlata",
        specialization: "Panic Disorder",
        clinic: "Dr. Khade's Centre for Neurology",
        address: "Mangeshkar Nagar, Main Road, Manganwlar Peth, Kolhapur, Maharashtra",
        fees: "₹500 per hour",
        chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_0QsyeT4r&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09 "
    },
    {
        name: "Dr. Sujit",
        specialization: "Adjustment Disorder",
        clinic: "Jagtap Clinic and Research Centre",
        address: "303, Mangalmurti Complex, Hirabaug Chowk, Dadawadi, Pune, Maharashtra",
        fees: "₹1,500 per session",
        chatbotUrl: "https://studio.d-id.com/agents/share?id=agt_3IKk5qws&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09 "
    }
];

// ✅ Main AI Chatbot (Bottom-Right Corner)
const mainChatbotUrl = "https://studio.d-id.com/agents/share?id=agt_NVjYp-gk&utm_source=copy&key=WVhWMGFEQjhOamRrWkdZMk1EVTJaVFpsWXpJMU5tUmhOekpsWkdRM09rZDJRbVl5WkZWdVpraDRURGhFVGpRNFpHTlJRZz09 ";


// ✅ Fetch & Display Doctor Cards
function displayDoctors() {
    let doctorContainer = document.getElementById("doctor-list");
    doctorContainer.innerHTML = "";

    allDoctors.forEach(doctor => {
        let doctorCard = document.createElement("div");
        doctorCard.classList.add("doctor-card");

        doctorCard.innerHTML = `
            <h3>👨‍⚕️ ${doctor.name}</h3>
            <p><strong>Specialization:</strong> ${doctor.specialization}</p>
            <p><strong>Clinic:</strong> ${doctor.clinic}</p>
            <p><strong>Address:</strong> ${doctor.address}</p>
            <p><strong>Consultation Fees:</strong> ${doctor.fees}</p>
            <button class="chat-btn" onclick="openDoctorChat('${doctor.chatbotUrl}', '${doctor.name}')">💬 Chat with Dr. ${doctor.name}</button>
            <div id="chatbox-${doctor.name}" class="doctor-chatbox hidden"></div>
        `;

        doctorContainer.appendChild(doctorCard);
    });

    document.getElementById("doctor-recommendation").classList.remove("hidden");
}


// ✅ Open Doctor Chatbot (Bottom-Left or Below Doctor Card)
function openDoctorChat(chatbotUrl, doctorName) {
    let chatContainer = document.getElementById(`chatbox-${doctorName}`);

    if (!chatContainer) {
        console.error("Chat container not found for", doctorName);
        return;
    }

    if (chatContainer.innerHTML.trim() === "") {
        chatContainer.innerHTML = `
            <iframe
                src="${chatbotUrl}"
                width="300px" height="400px"
                style="border:none; border-radius:10px;">
            </iframe>
        `;
    }

    chatContainer.classList.toggle("hidden");
}

// ✅ Open Main AI Chatbot (Bottom-Right)
document.getElementById("main-chatbot-button").addEventListener("click", function() {
    let chatbotBox = document.getElementById("main-chatbot-box");
    chatbotBox.classList.toggle("active");
});

// ✅ Predict Anxiety & Open Main Chatbot
function predictAnxiety() {
    let beta = parseFloat(document.getElementById("beta").value);
    let gamma = parseFloat(document.getElementById("gamma").value);
    let delta = parseFloat(document.getElementById("delta").value);
    let alpha = parseFloat(document.getElementById("alpha").value);
    let theta = parseFloat(document.getElementById("theta").value);

    if (isNaN(beta) || isNaN(gamma) || isNaN(delta) || isNaN(alpha) || isNaN(theta)) {
        alert("Please enter all EEG values!");
        return;
    }

    fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beta, gamma, delta, alpha, theta })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("Error: " + data.error);
        } else {
            document.getElementById("result").classList.remove("hidden");
            document.getElementById("predictionText").innerText = `Predicted Disorder: ${data.prediction}`;

            // ✅ Open Main Chatbot with Query
            let query = encodeURIComponent(`What are the remedies for ${data.prediction}?`);
            document.getElementById("main-chatbot-iframe").src = `${mainChatbotUrl}&q=${query}`;
            document.getElementById("main-chatbot-box").style.display = "block";
        }
    })
    .catch(error => console.error("Error:", error));
}

// ✅ Display Doctors on Page Load
displayDoctors();
