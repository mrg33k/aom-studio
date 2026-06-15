// Caliente Scoping Tool Logic

const serviceMapping = {
    // Pre-Construction
    preConstruction: {
        label: "Pre-Construction",
        description: "Comprehensive project assessment, cost estimation, and constructability analysis before breaking ground."
    },
    // Design-Build
    designBuild: {
        label: "Design-Build",
        description: "Single-source responsibility combining design and construction for faster delivery and integrated planning."
    },
    // General Contracting
    generalContracting: {
        label: "General Contracting",
        description: "Full project oversight and execution on designs prepared by your architects and engineers."
    },
    // Renovations
    renovations: {
        label: "Renovations",
        description: "Specialized expertise in updating existing structures while maintaining operations and quality standards."
    },
    // CMAR
    cmar: {
        label: "Construction Manager at Risk (CMAR)",
        description: "Cost-controlled delivery model with guaranteed maximum price and collaborative project planning."
    },
    // Job Order Contracting
    joc: {
        label: "Job Order Contracting",
        description: "Pre-priced service model for quick-turnaround repairs, maintenance, and small capital projects."
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
    const projectType = document.querySelector('input[name="projectType"]:checked')?.value;
    const sector = document.querySelector('input[name="sector"]:checked')?.value;
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
    const budget = document.querySelector('input[name="budget"]:checked')?.value;
    const timeline = document.querySelector('input[name="timeline"]:checked')?.value;

    // If all fields filled, show recommendations
    if (projectType && sector && delivery && budget && timeline) {
        showRecommendations(projectType, sector, delivery, budget, timeline);
    }
}

function showRecommendations(projectType, sector, delivery, budget, timeline) {
    const resultsDiv = document.getElementById('results');
    const recommendedServicesDiv = document.getElementById('recommendedServices');
    const recommended = [];

    // Recommendation logic:
    // projectType: 'new-build' | 'tenant-improvement' | 'renovation' | 'pre-construction'
    // sector: 'commercial' | 'industrial' | 'education' | 'healthcare' | 'hospitality'
    // delivery: 'design-build' | 'cmar' | 'general-contracting' | 'unsure'
    // budget: 'under-1m' | '1-5m' | '5-20m' | 'over-20m'
    // timeline: 'immediate' | 'soon' | 'planning' | 'exploring'

    // If delivery method is specified, recommend it
    if (delivery === 'design-build') {
        recommended.push('designBuild');
    } else if (delivery === 'cmar') {
        recommended.push('cmar');
    } else if (delivery === 'general-contracting') {
        recommended.push('generalContracting');
    }

    // Pre-construction always valuable if budget is large or timeline is immediate
    if (budget === '5-20m' || budget === 'over-20m' || timeline === 'immediate') {
        if (!recommended.includes('preConstruction')) {
            recommended.push('preConstruction');
        }
    }

    // CMAR is ideal for large budgets and collaborative control
    if (budget === '5-20m' || budget === 'over-20m') {
        if (!recommended.includes('cmar') && delivery !== 'general-contracting') {
            recommended.push('cmar');
        }
    }

    // Renovations if project type is renovation
    if (projectType === 'renovation') {
        if (!recommended.includes('renovations')) {
            recommended.push('renovations');
        }
    }

    // Job Order Contracting ideal for quick turnaround or small budget
    if (timeline === 'immediate' || budget === 'under-1m') {
        if (!recommended.includes('joc')) {
            recommended.push('joc');
        }
    }

    // If nothing recommended yet, default to general contracting
    if (recommended.length === 0) {
        recommended.push('generalContracting');
    }

    // Render recommendations
    recommendedServicesDiv.innerHTML = '';
    recommended.forEach(serviceKey => {
        const service = serviceMapping[serviceKey];
        const serviceDiv = document.createElement('div');
        serviceDiv.style.cssText = 'margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #2a2a2a;';
        serviceDiv.innerHTML = `
            <div style="font-weight: 600; color: #D97706; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px;">${service.label}</div>
            <div style="color: #9A9590; font-size: 1rem; line-height: 1.6;">${service.description}</div>
        `;
        recommendedServicesDiv.appendChild(serviceDiv);
    });

    resultsDiv.style.display = 'block';
}

function toggleDrawer() {
    const drawerContent = document.getElementById('drawerContent');
    if (drawerContent.style.display === 'none') {
        drawerContent.style.display = 'block';
    } else {
        drawerContent.style.display = 'none';
    }
}

function showReveal() {
    const revealModal = document.getElementById('revealModal');
    revealModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeReveal() {
    const revealModal = document.getElementById('revealModal');
    revealModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

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
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = form.querySelector('input[placeholder="Your Name"]')?.value || 'there';
            const email = form.querySelector('input[placeholder="Your Email"]')?.value;

            // Inline success message (no blocking dialog)
            const success = document.getElementById('scopeSuccess');
            if (success) {
                success.textContent = `Thanks ${name}. We'll be in touch at ${email} within 24 hours.`;
                success.style.display = 'block';
                success.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // Close drawer by clicking X
    const drawerClose = document.getElementById('drawerClose');
    if (drawerClose) {
        drawerClose.addEventListener('click', function() {
            const drawer = document.getElementById('reportCardDrawer');
            drawer.classList.remove('expanded');
        });
    }
});
