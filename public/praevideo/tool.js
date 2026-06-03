// Praevideo Scoping Tool Logic

const serviceMapping = {
    // cameras
    cameras: {
        label: "Cameras",
        description: "Professional camera systems with AI-powered monitoring tailored to your property size and concerns."
    },
    // trailers
    trailers: {
        label: "Surveillance Trailers",
        description: "Mobile surveillance solution ideal for temporary installations and high-security needs."
    },
    // access control
    access: {
        label: "Access Control",
        description: "Entry point management with credential verification and audit trails."
    },
    // project management
    management: {
        label: "Project Management",
        description: "Full coordination from assessment through installation and ongoing support."
    }
};

function openScopingTool() {
    const modal = document.getElementById('scopingModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeScopingTool() {
    const modal = document.getElementById('scopingModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updateResults() {
    const propertyType = document.querySelector('input[name="propertyType"]:checked')?.value;
    const installationType = document.querySelector('input[name="installationType"]:checked')?.value;
    const concern = document.querySelector('input[name="concern"]:checked')?.value;
    const entryPoints = document.querySelector('input[name="entryPoints"]:checked')?.value;
    const size = document.querySelector('input[name="size"]:checked')?.value;

    // If all fields filled, show recommendations
    if (propertyType && installationType && concern && entryPoints && size) {
        showRecommendations(propertyType, installationType, concern, entryPoints, size);
    }
}

function showRecommendations(propertyType, installationType, concern, entryPoints, size) {
    const resultsDiv = document.getElementById('results');
    const recommendedServicesDiv = document.getElementById('recommendedServices');
    const recommended = [];

    // Logic: Always recommend cameras
    recommended.push('cameras');

    // Recommend trailers if temporary
    if (installationType === 'temporary') {
        recommended.push('trailers');
    }

    // Recommend access control if concern is access-related or if large
    if (concern === 'access' || size === 'large' || size === 'xlarge') {
        recommended.push('access');
    }

    // Always recommend project management for full implementation
    recommended.push('management');

    // Render recommendations
    recommendedServicesDiv.innerHTML = '';
    recommended.forEach(serviceKey => {
        const service = serviceMapping[serviceKey];
        const p = document.createElement('p');
        p.textContent = `• ${service.label} — ${service.description}`;
        recommendedServicesDiv.appendChild(p);
    });

    resultsDiv.style.display = 'block';
}

// Hide video reveal after 2 seconds (fallback if video doesn't load)
setTimeout(function() {
    const videoReveal = document.getElementById('videoReveal');
    if (videoReveal) {
        videoReveal.style.opacity = '0';
        videoReveal.style.visibility = 'hidden';
        videoReveal.style.pointerEvents = 'none';
    }
}, 2000);

// Close modal on background click
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('scopingModal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeScopingTool();
        }
    });

    // Handle form submission
    const form = document.getElementById('scopingForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = form.querySelector('input[placeholder="Your Name"]').value;
        const email = form.querySelector('input[placeholder="Your Email"]').value;
        const phone = form.querySelector('input[placeholder="Your Phone"]').value;

        // For now, just show a success message
        alert(`Thanks ${name}! We'll be in touch at ${email} within 24 hours.`);
        closeScopingTool();
        form.reset();
    });
});
