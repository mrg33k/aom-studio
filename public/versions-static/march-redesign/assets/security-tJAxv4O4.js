const t="Security Architecture",n="security",e="Audits",i="Elon",a="2026-03-10",r="Mar 10",d=null,o="Security posture review and SOC 2 readiness assessment.",s=[],l=`<h1>AOM Multi-Tenant Dashboard: Security Architecture</h1>
<blockquote>
<p>Elon | 2026-03-10
Status: Research complete. Ready for Patrik review.</p>
</blockquote>
<p>CPAs handle the most sensitive financial data that exists: SSNs, tax returns, bank accounts, financial statements. One breach and AOM is finished. This document covers what we&#39;re up against, what we need to build, and what order to do it in.</p>
<hr>
<h2>1. Regulatory Landscape: What CPA Vendors Must Meet</h2>
<h3>1.1 FTC Safeguards Rule (GLBA)</h3>
<p>This is the big one. Under the Gramm-Leach-Bliley Act, <strong>tax preparers are legally classified as financial institutions.</strong> Any vendor handling their client data inherits obligations.</p>
<p><strong>What the law requires:</strong></p>
<ul>
<li>Written Information Security Plan (WISP) appropriate to business size/complexity</li>
<li>Designated security coordinator (a named human, not &quot;the team&quot;)</li>
<li>Regular risk assessments</li>
<li>Multi-factor authentication for ALL access to customer information</li>
<li>Encryption of customer data in transit and at rest</li>
<li>Annual penetration testing + vulnerability scans every 6 months</li>
<li>Incident response plan</li>
<li>Service provider oversight (that&#39;s us -- CPAs must vet their vendors)</li>
<li>Breach notification to FTC within 30 days if 500+ consumers affected (since May 2024)</li>
</ul>
<p><strong>Penalties:</strong> Up to $100,000 per violation for organizations, $10,000 per violation for individual executives. Per day.</p>
<h3>1.2 IRS Publication 4557: Safeguarding Taxpayer Data</h3>
<p>The IRS requires all tax professionals to follow Pub 4557. Key requirements that affect AOM as a vendor:</p>
<ul>
<li>CPAs must select service providers that &quot;maintain appropriate safeguards&quot;</li>
<li>Contracts must require vendor compliance with security standards</li>
<li>CPAs must document due diligence for all third-party vendors accessing taxpayer info</li>
<li>This includes cloud providers, software vendors, and IT service providers</li>
<li>Vendor security assessments are required, not optional</li>
</ul>
<p><strong>Translation:</strong> Every CPA client will (or should) ask us for documentation proving we meet these standards before they sign. If they don&#39;t ask, their insurance company or the IRS will ask them why they didn&#39;t.</p>
<h3>1.3 AICPA / SOC 2</h3>
<p>SOC 2 is the gold standard attestation for SaaS vendors serving financial services. Developed by the AICPA.</p>
<p><strong>Five Trust Services Criteria:</strong></p>
<ol>
<li><strong>Security</strong> (mandatory) -- protect systems from unauthorized access</li>
<li><strong>Availability</strong> -- systems stay operational</li>
<li><strong>Processing Integrity</strong> -- accurate data processing</li>
<li><strong>Confidentiality</strong> -- protect sensitive information</li>
<li><strong>Privacy</strong> -- personal information handling</li>
</ol>
<p><strong>For AOM, we need at minimum:</strong> Security + Confidentiality + Availability.</p>
<p><strong>Two report types:</strong></p>
<ul>
<li><strong>Type I:</strong> Point-in-time snapshot. &quot;Your controls exist.&quot; (2-4 months to obtain)</li>
<li><strong>Type II:</strong> Operating effectiveness over 6-12 months. &quot;Your controls actually work.&quot; (6-12 months)</li>
</ul>
<p><strong>Cost reality:</strong></p>
<ul>
<li>Compliance platform (Vanta/Drata): $7,500-$10,000/year</li>
<li>Type I audit: $7,500-$15,000</li>
<li>Type II audit: $12,000-$50,000</li>
<li>Total first year: $17,000-$44,000 for a small company</li>
<li>Timeline to Type I: 3-4 months if we start clean</li>
</ul>
<h3>1.4 What the Big CPA Vendors Do</h3>
<table>
<thead>
<tr>
<th>Vendor</th>
<th>Security Standard</th>
</tr>
</thead>
<tbody><tr>
<td>Intuit ProConnect</td>
<td>AES-256 encryption, MFA mandatory, continuous monitoring, SOC 2 compliant</td>
</tr>
<tr>
<td>Thomson Reuters</td>
<td>AES-256, MFA, intrusion prevention, SOC 2 + SSAE-16 + HIPAA + PCI-DSS data centers</td>
</tr>
<tr>
<td>Wolters Kluwer</td>
<td>SOC 2 Type II, encryption at rest/transit, MFA, annual pen testing</td>
</tr>
</tbody></table>
<p><strong>This is our competitive bar.</strong> CPAs are used to this level of security from their vendors. We can&#39;t show up with less.</p>
<h3>1.5 Arizona State Requirements</h3>
<p>Arizona doesn&#39;t have CPA-specific tech vendor security laws beyond federal requirements. The Arizona State Board of Accountancy (azaccountancy.gov) defers to AICPA standards and federal regulations (GLBA/FTC). However, Arizona does have a data breach notification law (ARS 18-552) requiring notification within 45 days.</p>
<h3>1.6 Insurance Requirements</h3>
<p>CPA firms carry cyber liability and E&amp;O insurance. Their insurers now require:</p>
<ul>
<li>Full MFA (not just email -- all systems touching client data)</li>
<li>Formal documented risk assessments</li>
<li>Encryption everywhere</li>
<li>Vendor oversight documentation</li>
<li>Vendors must carry their own Tech E&amp;O and cyber coverage</li>
<li>Vendor policy must name the CPA firm as additional insured</li>
<li>Coverage must extend 5 years past contract end</li>
</ul>
<p><strong>What this means for AOM:</strong> We need our own cyber liability insurance before signing CPA clients. Their insurers will ask.</p>
<hr>
<h2>2. Multi-Tenant Security Architecture</h2>
<h3>2.1 Data Isolation Strategy</h3>
<p><strong>Recommendation: Database-per-tenant with shared application layer.</strong></p>
<p>Three options exist:</p>
<table>
<thead>
<tr>
<th>Model</th>
<th>Isolation</th>
<th>Cost</th>
<th>Complexity</th>
<th>Right for CPAs?</th>
</tr>
</thead>
<tbody><tr>
<td>Shared DB, shared schema (tenant_id column)</td>
<td>Low</td>
<td>Lowest</td>
<td>Lowest</td>
<td>NO. One query bug leaks all clients.</td>
</tr>
<tr>
<td>Shared DB, separate schemas</td>
<td>Medium</td>
<td>Medium</td>
<td>Medium</td>
<td>Maybe for non-sensitive data only.</td>
</tr>
<tr>
<td><strong>Database per tenant</strong></td>
<td><strong>High</strong></td>
<td>Higher</td>
<td>Higher</td>
<td><strong>YES. The only acceptable answer for tax data.</strong></td>
</tr>
</tbody></table>
<p><strong>Why database-per-tenant is mandatory for CPA data:</strong></p>
<ul>
<li>A single SQL injection or ORM bug in shared-schema exposes every client&#39;s SSNs</li>
<li>Per-tenant databases mean a breach of one client&#39;s data doesn&#39;t compromise others</li>
<li>Each CPA firm gets their own isolated database</li>
<li>Easier to comply with data deletion requests (drop the database)</li>
<li>Easier to provide per-client encryption keys</li>
<li>Easier to audit access per client</li>
</ul>
<p><strong>Implementation:</strong></p>
<ul>
<li>Each CPA firm gets a dedicated PostgreSQL database (or equivalent)</li>
<li>Connection routing at the application layer based on authenticated tenant</li>
<li>Shared application code, but database connections are tenant-scoped</li>
<li>No cross-tenant queries are physically possible (different databases)</li>
<li>Tenant metadata (firm name, subscription tier, config) lives in a separate admin database that never stores client financial data</li>
</ul>
<h3>2.2 Encryption</h3>
<p><strong>At rest:</strong></p>
<ul>
<li>AES-256 encryption for all databases</li>
<li>Per-tenant encryption keys (unique key per CPA firm)</li>
<li>Keys stored in a managed key vault (AWS KMS, GCP KMS, or HashiCorp Vault)</li>
<li>Never store encryption keys alongside the data they protect</li>
<li>Consider BYOK (Bring Your Own Key) for enterprise clients</li>
</ul>
<p><strong>In transit:</strong></p>
<ul>
<li>TLS 1.3 for all connections (API, web, database)</li>
<li>No exceptions, no fallback to unencrypted</li>
<li>HSTS headers on all web endpoints</li>
<li>Certificate pinning for mobile apps (if we build them)</li>
</ul>
<p><strong>Key management:</strong></p>
<ul>
<li>AWS KMS or HashiCorp Vault for key storage</li>
<li>Automatic key rotation (90-day cycle minimum)</li>
<li>Key access logged and auditable</li>
<li>Separate keys for different data classifications</li>
</ul>
<h3>2.3 Access Control</h3>
<p><strong>RBAC (Role-Based Access Control):</strong></p>
<table>
<thead>
<tr>
<th>Role</th>
<th>Access</th>
<th>Example</th>
</tr>
</thead>
<tbody><tr>
<td>AOM Super Admin</td>
<td>Platform management, no client data</td>
<td>Patrik, system maintenance</td>
</tr>
<tr>
<td>AOM Support</td>
<td>Specific tenant data with audit trail, time-limited</td>
<td>Support tickets</td>
</tr>
<tr>
<td>CPA Firm Admin</td>
<td>Full access to their firm&#39;s data only</td>
<td>Firm owner</td>
</tr>
<tr>
<td>CPA Staff</td>
<td>Scoped access within their firm</td>
<td>Accountants, bookkeepers</td>
</tr>
<tr>
<td>CPA Client</td>
<td>Read-only to their own records</td>
<td>End taxpayer</td>
</tr>
<tr>
<td>AI Agent</td>
<td>Defined data scope, no PII unless explicitly permitted</td>
<td>Dashboard agents</td>
</tr>
</tbody></table>
<p><strong>Authentication:</strong></p>
<ul>
<li>MFA mandatory. No exceptions. No &quot;optional for now.&quot;</li>
<li>Support SSO (SAML/OIDC) for larger firms</li>
<li>Session timeouts: 15 minutes inactive for any screen showing financial data</li>
<li>Password policy: 12+ characters, complexity requirements, no reuse of last 10</li>
<li>Account lockout after 5 failed attempts</li>
</ul>
<p><strong>Audit logging:</strong></p>
<ul>
<li>Every data access logged: who, what, when, from where</li>
<li>Logs immutable (append-only, write to separate system)</li>
<li>Retain logs for 7 years minimum (IRS record retention)</li>
<li>Real-time alerting on anomalous access patterns</li>
<li>Admin access to client data requires explicit justification (logged)</li>
</ul>
<h3>2.4 AI Agent Data Boundaries</h3>
<p>This is unique to AOM. Our agents are a feature, but they&#39;re also a risk surface.</p>
<p><strong>Hard rules for AI agents:</strong></p>
<ul>
<li>Agents NEVER have direct database access to client financial data</li>
<li>Agents interact through a controlled API layer with strict permissions</li>
<li>No PII (SSNs, EINs, bank accounts) passes through AI model context</li>
<li>Agent actions on client data are logged identically to human actions</li>
<li>Agents operate within the tenant boundary, never cross-tenant</li>
<li>AI model providers (Anthropic, OpenAI) never receive raw client data</li>
<li>If agents need to reference financial data, use tokenized/anonymized representations</li>
</ul>
<p><strong>What agents CAN do:</strong></p>
<ul>
<li>Generate reports from pre-aggregated, anonymized data</li>
<li>Manage scheduling, reminders, workflow status</li>
<li>Process non-sensitive metadata (project names, deadlines, task status)</li>
<li>Analyze patterns across anonymized/aggregated data sets</li>
</ul>
<p><strong>What agents CANNOT do:</strong></p>
<ul>
<li>Read or store SSNs, EINs, or bank account numbers</li>
<li>Send client financial data to external APIs</li>
<li>Access data outside their assigned tenant scope</li>
<li>Make changes to financial records without human approval</li>
<li>Store client data in agent memory/context files</li>
</ul>
<h3>2.5 AOM Admin Access</h3>
<p><strong>Problem:</strong> AOM needs to maintain the platform without compromising client isolation.</p>
<p><strong>Solution: Break-glass access model.</strong></p>
<ul>
<li>AOM admins do NOT have standing access to client data</li>
<li>Access requires: explicit reason + time-limited grant + full audit trail</li>
<li>&quot;Break glass&quot; emergency access exists but triggers immediate alerts to the CPA firm</li>
<li>All admin actions on client data are logged to an immutable audit trail the client can review</li>
<li>Support access requires client-initiated consent (they unlock it from their side)</li>
<li>Regular access reviews (quarterly) to ensure no standing permissions exist</li>
</ul>
<h3>2.6 Backup and Disaster Recovery</h3>
<ul>
<li>Per-tenant encrypted backups (same per-tenant key)</li>
<li>Backups stored in a separate geographic region</li>
<li>Daily automated backups, 30-day retention minimum</li>
<li>Annual backup restoration test (documented)</li>
<li>RPO (Recovery Point Objective): 24 hours maximum</li>
<li>RTO (Recovery Time Objective): 4 hours maximum</li>
<li>Backups encrypted at rest with separate backup encryption keys</li>
<li>Client can request their backup at any time (data portability)</li>
</ul>
<h3>2.7 Infrastructure</h3>
<p><strong>Recommended stack for security:</strong></p>
<ul>
<li>Cloud provider: AWS or GCP (both have SOC 2 compliant infrastructure)</li>
<li>Container orchestration: Kubernetes with network policies isolating tenant workloads</li>
<li>WAF (Web Application Firewall) on all public endpoints</li>
<li>DDoS protection (AWS Shield or Cloudflare)</li>
<li>VPC/private networking for all internal services</li>
<li>No public-facing database endpoints</li>
<li>Secrets management: AWS Secrets Manager or HashiCorp Vault (not .env files)</li>
</ul>
<hr>
<h2>3. What We Need BEFORE the First CPA Client</h2>
<h3>3.1 Security Policy Document</h3>
<p>A written document that states what we promise. Must include:</p>
<ul>
<li>Data classification policy (what&#39;s sensitive, what&#39;s not)</li>
<li>Acceptable use policy</li>
<li>Access control policy</li>
<li>Encryption policy</li>
<li>Incident response policy</li>
<li>Data retention and deletion policy</li>
<li>Vendor management policy (for our own vendors)</li>
<li>Employee security training requirements</li>
</ul>
<h3>3.2 Written Information Security Plan (WISP)</h3>
<p>Required by GLBA/FTC. Must cover:</p>
<ul>
<li>Named security coordinator</li>
<li>Risk assessment methodology and results</li>
<li>Safeguards for identified risks (administrative, technical, physical)</li>
<li>Service provider oversight procedures</li>
<li>Evaluation and adjustment process</li>
<li>Employee training program</li>
</ul>
<h3>3.3 Data Handling Procedures</h3>
<p>Operational documentation covering:</p>
<ul>
<li>How data enters the system (ingestion controls)</li>
<li>How data is stored (encryption, isolation)</li>
<li>Who can access what data and how access is granted/revoked</li>
<li>How data is transmitted (TLS, no email, no unencrypted channels)</li>
<li>How data is backed up and recovered</li>
<li>How data is deleted when a client leaves (verifiable destruction)</li>
<li>How we handle data subject access requests</li>
</ul>
<h3>3.4 Incident Response Plan</h3>
<p>What happens when something goes wrong:</p>
<ul>
<li>Detection: How we identify a breach (monitoring, alerts, reports)</li>
<li>Containment: Immediate steps to limit damage</li>
<li>Assessment: Determine scope and impact</li>
<li>Notification timeline:<ul>
<li>Internal team: immediately</li>
<li>Affected CPA firm: within 24 hours</li>
<li>FTC: within 30 days (if 500+ consumers)</li>
<li>Arizona AG: within 45 days (state law)</li>
<li>Affected individuals: per state law requirements</li>
</ul>
</li>
<li>Recovery: Steps to restore service</li>
<li>Post-incident: Root cause analysis, remediation, documentation</li>
<li>Roles and responsibilities during an incident</li>
<li>External contacts (legal counsel, cyber insurance, forensics firm)</li>
</ul>
<h3>3.5 Client-Facing Security FAQ</h3>
<p>What CPAs will ask and what we answer:</p>
<table>
<thead>
<tr>
<th>Question</th>
<th>Our Answer</th>
</tr>
</thead>
<tbody><tr>
<td>Where is my data stored?</td>
<td>[Cloud provider], US-based data centers, SOC 2 certified infrastructure</td>
</tr>
<tr>
<td>Is my data encrypted?</td>
<td>Yes. AES-256 at rest, TLS 1.3 in transit. Per-tenant encryption keys.</td>
</tr>
<tr>
<td>Who can access my data?</td>
<td>Only your authorized users. AOM admin access requires your consent.</td>
</tr>
<tr>
<td>Do you have SOC 2?</td>
<td>[Type I in progress / Type II after 6 months]</td>
</tr>
<tr>
<td>What happens if there&#39;s a breach?</td>
<td>Notification within 24 hours. Full incident response plan. Cyber insurance coverage.</td>
</tr>
<tr>
<td>Can I get my data out?</td>
<td>Yes. Full data export available anytime. Data deleted on request after contract ends.</td>
</tr>
<tr>
<td>Do your AI agents see my data?</td>
<td>No PII passes through AI models. Agents work with anonymized data only.</td>
</tr>
<tr>
<td>Do you have cyber insurance?</td>
<td>Yes. [Policy details]</td>
</tr>
<tr>
<td>What about your subprocessors?</td>
<td>Full list available. All vetted and contractually bound.</td>
</tr>
</tbody></table>
<h3>3.6 Terms of Service / Data Processing Agreement</h3>
<p>Legal documents covering:</p>
<ul>
<li>Data ownership (client owns their data, we process it)</li>
<li>Data processing scope and limitations</li>
<li>Subprocessor list and notification of changes</li>
<li>Data breach notification obligations</li>
<li>Data deletion upon termination</li>
<li>Liability and indemnification</li>
<li>Compliance responsibilities (shared responsibility model)</li>
<li>Jurisdiction and governing law</li>
</ul>
<h3>3.7 BAA (Business Associate Agreement)</h3>
<p>Not required unless we touch health-related data (HIPAA). CPAs occasionally handle medical deductions but that&#39;s the taxpayer&#39;s data on their return, not health records. <strong>Low priority but keep on radar.</strong> If any CPA client also does bookkeeping for medical practices, this becomes relevant fast.</p>
<hr>
<h2>4. What We Need to Fix in Our Own System FIRST</h2>
<h3>4.1 CRITICAL: Exposed Credentials</h3>
<p><strong>Status: Still in git history.</strong> Previous audit identified these but rotation hasn&#39;t happened.</p>
<table>
<thead>
<tr>
<th>Secret</th>
<th>Location</th>
<th>Fix Required</th>
</tr>
</thead>
<tbody><tr>
<td>GitHub PAT</td>
<td><code>.claude/settings.json</code> (env var ref)</td>
<td>Currently uses <code>\${GITHUB_TOKEN}</code> which is OK, but the original commit may have had the raw value. Check git history.</td>
</tr>
<tr>
<td>Apify token</td>
<td><code>.claude/settings.json</code> (env var ref)</td>
<td>Same -- verify no raw value in history.</td>
</tr>
<tr>
<td>Apollo API key</td>
<td><code>.claude/skills/outreach/SKILL.md</code></td>
<td>Was redacted 2026-03-10 but <strong>still in git history</strong>. Needs BFG scrub + rotation.</td>
</tr>
<tr>
<td>LinkedIn creds</td>
<td><code>projects/ambition-mechanical/AGENT.md</code></td>
<td>Was redacted 2026-03-10 but <strong>still in git history</strong>. Needs BFG scrub + password change.</td>
</tr>
</tbody></table>
<p><strong>Required actions:</strong></p>
<ol>
<li>Rotate ALL exposed tokens immediately (even if redacted in current files, old commits have the values)</li>
<li>Run <code>git filter-repo</code> or BFG Repo-Cleaner to scrub secrets from git history</li>
<li>Force-push cleaned history (coordinate with Ash if he has local clones)</li>
<li>Move all secrets to environment variables or <code>.claude/settings.local.json</code> (gitignored)</li>
<li>Add a pre-commit hook that scans for secrets (use <code>gitleaks</code> or <code>trufflehog</code>)</li>
<li>Document the credential rotation in decisions/log.md</li>
</ol>
<h3>4.2 Architecture Patterns That Won&#39;t Scale to Client Data</h3>
<table>
<thead>
<tr>
<th>Current Pattern</th>
<th>Problem for Client Data</th>
<th>Fix</th>
</tr>
</thead>
<tbody><tr>
<td>Credentials in skill files</td>
<td>Secrets in repo = breach waiting to happen</td>
<td>Vault or env vars only</td>
</tr>
<tr>
<td><code>Bash(*)</code> permission for all agents</td>
<td>Unrestricted shell = agents can read anything on disk</td>
<td>Scope agent permissions per role</td>
</tr>
<tr>
<td>Relay files (JSONL) in repo</td>
<td>Messages in git history forever</td>
<td>Relay should not contain client data; add guardrails</td>
</tr>
<tr>
<td>Agent context files reference local paths</td>
<td><code>/Users/patrik/...</code> paths leak system info</td>
<td>Use relative paths or env vars</td>
</tr>
<tr>
<td>No access logging</td>
<td>Can&#39;t audit who accessed what</td>
<td>Add structured access logs</td>
</tr>
<tr>
<td>Gmail tokens on disk</td>
<td>OAuth tokens are sensitive credentials</td>
<td>Move to OS keychain or vault</td>
</tr>
<tr>
<td>All agents share one permission model</td>
<td>No isolation between agent capabilities</td>
<td>Per-agent permission scoping</td>
</tr>
</tbody></table>
<h3>4.3 Agent Information Handling</h3>
<p>Current agents were built for internal AOM use. For client data, every agent needs:</p>
<ul>
<li><strong>Data classification awareness:</strong> Agents must know what&#39;s sensitive and what&#39;s not</li>
<li><strong>Scoped access:</strong> Bobby doesn&#39;t need to see financial data. Jacob doesn&#39;t need to see tax returns.</li>
<li><strong>No client PII in context files:</strong> Agent memory (AGENT.md, MEMORY.md) must never contain client PII</li>
<li><strong>No client data in git:</strong> Nothing client-related goes in the AOM-EA repo</li>
<li><strong>Separate repos/systems for client platform vs internal EA:</strong> The dashboard product is NOT this repo</li>
</ul>
<hr>
<h2>5. Minimum Viable Security for CPA Pilot Client</h2>
<h3>5.1 Day 1 Mandatory (Cannot Launch Without)</h3>
<table>
<thead>
<tr>
<th>Requirement</th>
<th>Why</th>
<th>Effort</th>
<th>Cost</th>
</tr>
</thead>
<tbody><tr>
<td>Database-per-tenant architecture</td>
<td>Client isolation is non-negotiable</td>
<td>2-3 weeks dev</td>
<td>Hosting costs</td>
</tr>
<tr>
<td>AES-256 encryption at rest</td>
<td>Legal requirement (GLBA/FTC)</td>
<td>Built into cloud DB</td>
<td>$0 (included)</td>
</tr>
<tr>
<td>TLS 1.3 everywhere</td>
<td>Legal requirement</td>
<td>SSL certs + config</td>
<td>$0-50/mo</td>
</tr>
<tr>
<td>MFA for all users</td>
<td>Legal requirement, insurance requirement</td>
<td>Auth provider integration</td>
<td>$0-100/mo (Auth0 free tier)</td>
</tr>
<tr>
<td>RBAC with audit logging</td>
<td>Legal requirement, SOC 2 requirement</td>
<td>1-2 weeks dev</td>
<td>$0 (build it)</td>
</tr>
<tr>
<td>Written security policy + WISP</td>
<td>Legal requirement (GLBA)</td>
<td>1-2 days writing</td>
<td>$0</td>
</tr>
<tr>
<td>Incident response plan</td>
<td>Legal requirement, insurance requirement</td>
<td>1 day writing</td>
<td>$0</td>
</tr>
<tr>
<td>Terms of service with data handling</td>
<td>Legal requirement</td>
<td>Lawyer review recommended</td>
<td>$500-2,000</td>
</tr>
<tr>
<td>Cyber liability insurance</td>
<td>CPA insurance requirement</td>
<td>Apply, get quoted</td>
<td>$1,000-3,000/yr</td>
</tr>
<tr>
<td>Fix exposed credentials</td>
<td>Immediate risk</td>
<td>2-4 hours</td>
<td>$0</td>
</tr>
<tr>
<td>Pre-commit secret scanning</td>
<td>Prevent future exposure</td>
<td>1 hour setup</td>
<td>$0 (gitleaks is free)</td>
</tr>
<tr>
<td>Separate infrastructure for client platform</td>
<td>Cannot mix client data with internal EA</td>
<td>Architecture decision</td>
<td>Varies</td>
</tr>
</tbody></table>
<p><strong>Estimated Day 1 cost: $1,500-5,000 one-time + $100-300/month ongoing</strong>
<strong>Estimated Day 1 time: 4-6 weeks to build properly</strong></p>
<h3>5.2 Within 90 Days (Before Scaling)</h3>
<table>
<thead>
<tr>
<th>Requirement</th>
<th>Why</th>
<th>Cost</th>
</tr>
</thead>
<tbody><tr>
<td>SOC 2 Type I preparation</td>
<td>CPAs will ask</td>
<td>$7,500-15,000</td>
</tr>
<tr>
<td>Compliance automation platform (Vanta or Drata)</td>
<td>Streamlines SOC 2 process</td>
<td>$7,500-10,000/yr</td>
</tr>
<tr>
<td>Annual penetration test</td>
<td>FTC Safeguards Rule</td>
<td>$5,000-15,000</td>
</tr>
<tr>
<td>Vulnerability scanning (6-month cycle)</td>
<td>FTC Safeguards Rule</td>
<td>$0-500/mo</td>
</tr>
<tr>
<td>Formal risk assessment</td>
<td>WISP requirement, SOC 2 requirement</td>
<td>Internal effort</td>
</tr>
<tr>
<td>Employee security training</td>
<td>WISP requirement</td>
<td>$0-500</td>
</tr>
</tbody></table>
<p><strong>Estimated 90-day cost: $20,000-40,000</strong></p>
<h3>5.3 Can Defer (Nice to Have, Not Day 1)</h3>
<table>
<thead>
<tr>
<th>Item</th>
<th>When</th>
</tr>
</thead>
<tbody><tr>
<td>SOC 2 Type II</td>
<td>After 6 months of Type I controls operating</td>
</tr>
<tr>
<td>BYOK (customer-managed keys)</td>
<td>Enterprise tier feature</td>
</tr>
<tr>
<td>SSO (SAML/OIDC)</td>
<td>When larger firms request it</td>
</tr>
<tr>
<td>BAA for health data</td>
<td>Only if a CPA client handles medical practices</td>
</tr>
<tr>
<td>SOC 2 + HIPAA combined audit</td>
<td>Only if health data becomes relevant</td>
</tr>
<tr>
<td>Bug bounty program</td>
<td>After product is mature</td>
</tr>
<tr>
<td>ISO 27001</td>
<td>International clients or enterprise positioning</td>
</tr>
</tbody></table>
<h3>5.4 Fastest Path to &quot;Secure Enough&quot;</h3>
<p><strong>Week 1-2: Foundation</strong></p>
<ul>
<li>Fix exposed credentials (BFG scrub + rotation)</li>
<li>Set up pre-commit secret scanning</li>
<li>Write security policy + WISP + incident response plan</li>
<li>Choose cloud provider and set up tenant-isolated infrastructure</li>
<li>Choose auth provider (Auth0, Clerk, or WorkOS for MFA + RBAC)</li>
</ul>
<p><strong>Week 3-4: Build</strong></p>
<ul>
<li>Implement database-per-tenant architecture</li>
<li>Set up encryption (at rest via cloud provider, TLS for transit)</li>
<li>Build RBAC system with audit logging</li>
<li>Build tenant onboarding flow with security defaults</li>
</ul>
<p><strong>Week 5-6: Harden</strong></p>
<ul>
<li>Security review of all API endpoints</li>
<li>Set up monitoring and alerting</li>
<li>Run internal vulnerability scan</li>
<li>Write client-facing security FAQ</li>
<li>Get Terms of Service reviewed by a lawyer</li>
<li>Apply for cyber liability insurance</li>
</ul>
<p><strong>Week 7-8: Validate</strong></p>
<ul>
<li>Have someone outside AOM attempt to access cross-tenant data</li>
<li>Test incident response plan with a tabletop exercise</li>
<li>Finalize all documentation</li>
<li>Begin SOC 2 Type I preparation</li>
</ul>
<hr>
<h2>6. Cost Summary</h2>
<h3>Minimum to Launch (pilot CPA client)</h3>
<table>
<thead>
<tr>
<th>Item</th>
<th>Cost</th>
</tr>
</thead>
<tbody><tr>
<td>Infrastructure (cloud hosting, DB)</td>
<td>$100-300/mo</td>
</tr>
<tr>
<td>Auth provider (MFA, RBAC)</td>
<td>$0-100/mo</td>
</tr>
<tr>
<td>Legal review of ToS/DPA</td>
<td>$500-2,000 one-time</td>
</tr>
<tr>
<td>Cyber liability insurance</td>
<td>$1,000-3,000/yr</td>
</tr>
<tr>
<td>Secret scanning tools</td>
<td>$0 (open source)</td>
</tr>
<tr>
<td><strong>Total Year 1 (minimum)</strong></td>
<td><strong>$4,000-8,000</strong></td>
</tr>
</tbody></table>
<h3>To Become Truly Competitive (SOC 2 ready)</h3>
<table>
<thead>
<tr>
<th>Item</th>
<th>Cost</th>
</tr>
</thead>
<tbody><tr>
<td>Everything above</td>
<td>$4,000-8,000</td>
</tr>
<tr>
<td>Compliance platform (Vanta/Drata)</td>
<td>$7,500-10,000/yr</td>
</tr>
<tr>
<td>SOC 2 Type I audit</td>
<td>$7,500-15,000</td>
</tr>
<tr>
<td>Penetration test</td>
<td>$5,000-15,000</td>
</tr>
<tr>
<td><strong>Total Year 1 (SOC 2 path)</strong></td>
<td><strong>$24,000-48,000</strong></td>
</tr>
</tbody></table>
<h3>Revenue Math</h3>
<p>At $3,000/month per CPA retainer, 2-3 clients covers the SOC 2 investment in year 1. After that, it&#39;s a competitive advantage that justifies the price point. CPAs expect to pay more for vendors who take security seriously.</p>
<hr>
<h2>7. Key Decisions Needed from Patrik</h2>
<ol>
<li><strong>Cloud provider:</strong> AWS vs GCP vs something else? (Recommendation: AWS for broadest SOC 2 tooling ecosystem)</li>
<li><strong>Budget for SOC 2 path:</strong> Go full SOC 2 from day 1, or MVP security first and add SOC 2 within 6 months?</li>
<li><strong>Lawyer for ToS/DPA:</strong> Do we have one, or need to find one?</li>
<li><strong>Cyber insurance:</strong> Get quotes? (Recommendation: yes, immediately)</li>
<li><strong>Credential rotation:</strong> Green light to rotate all exposed tokens and scrub git history?</li>
<li><strong>Separate repo/infrastructure for client platform:</strong> The dashboard product should NOT live in AOM-EA. Confirm this is the plan.</li>
<li><strong>Auth provider preference:</strong> Auth0, Clerk, WorkOS, or build custom?</li>
</ol>
<hr>
<h2>8. Bottom Line</h2>
<p>The security investment is real but manageable. The regulatory requirements (GLBA, FTC Safeguards, IRS Pub 4557) are not optional. CPA firms are legally required to vet their vendors, and their insurance companies enforce it.</p>
<p><strong>The good news:</strong> Most of the Day 1 requirements are free or cheap (encryption is built into cloud providers, MFA is built into auth providers, policies are documents we write). The expensive part (SOC 2) can come in Phase 2 once we have paying clients to fund it.</p>
<p><strong>The non-negotiable:</strong> Database-per-tenant isolation, encryption everywhere, MFA, audit logging, and written security policies. Without these, no CPA should trust us, and we shouldn&#39;t ask them to.</p>
<p><strong>The competitive advantage:</strong> Most small agencies pitching to CPAs have NONE of this. If AOM shows up with a real security architecture, documented policies, and a SOC 2 timeline, we&#39;re immediately more credible than 90% of the competition.</p>
<hr>
<h2>Sources</h2>
<ul>
<li><a href="https://scytale.ai/center/soc-2/the-soc-2-compliance-checklist/">SOC 2 Compliance Checklist 2026 (Scytale)</a></li>
<li><a href="https://www.brightdefense.com/resources/soc-2-controls-list/">SOC 2 Controls List 2026 (Bright Defense)</a></li>
<li><a href="https://secureframe.com/blog/soc-2-compliance-checklist">SOC 2 Compliance Checklist (Secureframe)</a></li>
<li><a href="https://www.irs.gov/pub/irs-pdf/p4557.pdf">IRS Publication 4557 (PDF)</a></li>
<li><a href="https://verito.com/irs-pub-4557">IRS Pub 4557 Compliance Guide (Verito)</a></li>
<li><a href="https://bellatorcyber.com/blog/irs-publication-4557/">IRS Pub 4557 Ultimate Guide (Bellator Cyber)</a></li>
<li><a href="https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services">AICPA SOC Suite of Services</a></li>
<li><a href="https://www.ftc.gov/legal-library/browse/rules/safeguards-rule">FTC Safeguards Rule</a></li>
<li><a href="https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know">FTC Safeguards Rule: What Your Business Needs to Know</a></li>
<li><a href="https://www.aicpa-cima.com/resources/landing/gramm-leach-bliley-act-glba-and-the-safeguards-rule">GLBA and FTC Safeguards Rule (AICPA)</a></li>
<li><a href="https://bellatorcyber.com/blog/wisp-requirements-2025">WISP Requirements 2025 (Bellator Cyber)</a></li>
<li><a href="https://www.itfusiontech.com/blog/cyber-insurance-requirements-cpa-firm/">Cyber Insurance Requirements for CPA Firms 2026</a></li>
<li><a href="https://www.cpai.com/Plans/My-Firm/Cyber-Liability">CPA Cyber Liability Insurance (AICPA)</a></li>
<li><a href="https://redis.io/blog/data-isolation-multi-tenant-saas/">Multi-Tenant Data Isolation Architecture (Redis)</a></li>
<li><a href="https://ve3.global/blog/the-multi-tenancy-manifesto-why-a-database-per-tenant-model-is-the-new-standard-for-saas">Database-Per-Tenant SaaS Standard (VE3)</a></li>
<li><a href="https://www.pilotlab.net/blog/multitenant-saas-architecture-2025">Multi-Tenant SaaS Architecture 2025 (PilotLab)</a></li>
<li><a href="https://www.zipsec.com/blog/how-much-does-soc-2-compliance-really-cost-a-clear-guide">SOC 2 Compliance Cost Guide (Zip Security)</a></li>
<li><a href="https://drata.com/grc-central/soc-2/how-much-does-a-soc-2-audit-cost">SOC 2 Audit Cost (Drata)</a></li>
<li><a href="https://cavanex.com/blog/soc-2-compliance-cost-2026">SOC 2 Compliance Cost 2026 (Cavanex)</a></li>
<li><a href="https://www.secureleap.tech/blog/vanta-review-pricing-top-alternatives-for-compliance-automation">Vanta Pricing 2026</a></li>
<li><a href="https://www.acecloudhosting.com/blog/intuit-proconnect-features/">Intuit ProConnect Security (Ace Cloud)</a></li>
<li><a href="https://verito.com/blog/cybersecurity-for-accounting-firms-guide/">Cybersecurity for Accounting Firms Guide (Verito)</a></li>
</ul>
`,c={title:t,slug:n,category:e,agent:i,date:a,dateFormatted:r,updated:null,summary:o,tags:s,content:l};export{i as agent,e as category,l as content,a as date,r as dateFormatted,c as default,n as slug,o as summary,s as tags,t as title,d as updated};
