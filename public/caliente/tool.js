// Caliente Scoping Tool — stepped quote builder

const serviceMapping = {
    preConstruction:   { label: "Pre-Construction",                       description: "Project assessment, cost estimation, and constructability analysis before breaking ground." },
    designBuild:       { label: "Design-Build",                           description: "Single-source design and construction for faster delivery and integrated planning." },
    generalContracting:{ label: "General Contracting",                    description: "Full project oversight and execution on designs from your architects and engineers." },
    renovations:       { label: "Renovations",                            description: "Updating existing structures while maintaining operations and quality standards." },
    cmar:              { label: "Construction Manager at Risk (CMAR)",    description: "Cost-controlled delivery with a guaranteed maximum price and collaborative planning." },
    joc:               { label: "Job Order Contracting",                  description: "Pre-priced delivery for quick-turnaround repairs, maintenance, and small capital projects." }
};

const SCOPE_STEPS = 6; // 5 questions + contact
let scopeStep = 0;
const scopeAnswers = {};

function openScopingTool(){
    const m = document.getElementById('scopingModal');
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
    scopeStep = 0;
    renderScopeStep();
}
function closeScopingTool(){
    const m = document.getElementById('scopingModal');
    m.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function renderScopeStep(){
    const steps = document.querySelectorAll('.scope-step');
    steps.forEach(s => s.classList.toggle('active', (+s.dataset.step) === scopeStep));

    const numEl = document.getElementById('scopeStepNum');
    if (numEl) numEl.textContent = scopeStep + 1;
    const fill = document.getElementById('scopeBarFill');
    if (fill) fill.style.width = (((scopeStep + 1) / SCOPE_STEPS) * 100) + '%';

    const back = document.getElementById('scopeBack');
    if (back) back.style.visibility = scopeStep === 0 ? 'hidden' : 'visible';
    const isLast = scopeStep === SCOPE_STEPS - 1;
    const submit = document.getElementById('scopeSubmit');
    if (submit) submit.style.display = isLast ? 'inline-flex' : 'none';
    const hint = document.getElementById('scopeHint');
    if (hint) hint.style.display = isLast ? 'none' : 'inline';

    // restore prior selection on the active step
    const active = document.querySelector('.scope-step.active');
    if (active){
        active.querySelectorAll('.opt').forEach(o => {
            const chosen = scopeAnswers[o.dataset.name] === o.dataset.value;
            o.classList.toggle('selected', chosen);
        });
    }
    if (isLast) buildRecommendations();
}

function chooseOpt(btn){
    const name = btn.dataset.name, value = btn.dataset.value;
    scopeAnswers[name] = value;
    btn.parentElement.querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
    setTimeout(() => { if (scopeStep < SCOPE_STEPS - 1){ scopeStep++; renderScopeStep(); } }, 260);
}
function scopeBack(){ if (scopeStep > 0){ scopeStep--; renderScopeStep(); } }

function buildRecommendations(){
    const { projectType, sector, delivery, budget, timeline } = scopeAnswers;
    const recommended = [];
    if (delivery === 'design-build') recommended.push('designBuild');
    else if (delivery === 'cmar') recommended.push('cmar');
    else if (delivery === 'gc') recommended.push('generalContracting');
    if (budget === '5m-20m' || budget === '20m-plus' || timeline === 'immediate'){ if (!recommended.includes('preConstruction')) recommended.push('preConstruction'); }
    if (budget === '5m-20m' || budget === '20m-plus'){ if (!recommended.includes('cmar') && delivery !== 'gc') recommended.push('cmar'); }
    if (projectType === 'renovation'){ if (!recommended.includes('renovations')) recommended.push('renovations'); }
    if (timeline === 'immediate' || budget === 'under-1m'){ if (!recommended.includes('joc')) recommended.push('joc'); }
    if (recommended.length === 0) recommended.push('generalContracting');

    const panel = document.getElementById('recoPanel');
    if (!panel) return;
    if (!projectType){ panel.innerHTML = ''; return; }
    let html = '<span class="reco-kicker">Recommended for your project</span>';
    recommended.slice(0, 3).forEach(k => {
        const s = serviceMapping[k];
        html += `<div class="reco-item"><span class="reco-name">${s.label}</span><span class="reco-desc">${s.description}</span></div>`;
    });
    panel.innerHTML = html;
}

function scopeSubmitForm(){
    const nameEl = document.getElementById('scopeName');
    const emailEl = document.getElementById('scopeEmail');
    const name = (nameEl && nameEl.value.trim()) || 'there';
    const email = (emailEl && emailEl.value.trim()) || '';
    if (!email){ if (emailEl){ emailEl.focus(); emailEl.style.borderColor = '#C2502E'; } return; }
    const success = document.getElementById('scopeSuccess');
    if (success){
        success.textContent = `Thanks ${name}. Your scope is on its way. We'll be in touch at ${email} within one business day.`;
        success.style.display = 'block';
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function toggleDrawer(){
    const c = document.getElementById('drawerContent');
    c.style.display = (c.style.display === 'none') ? 'block' : 'none';
}
function showReveal(){
    const r = document.getElementById('revealModal');
    r.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeReveal(){
    const r = document.getElementById('revealModal');
    r.style.display = 'none';
    document.body.style.overflow = 'auto';
}

document.addEventListener('DOMContentLoaded', function(){
    const modal = document.getElementById('scopingModal');
    if (modal){
        modal.addEventListener('click', function(e){ if (e.target === modal) closeScopingTool(); });
    }
    document.querySelectorAll('.opt').forEach(b => b.addEventListener('click', function(){ chooseOpt(b); }));
});
