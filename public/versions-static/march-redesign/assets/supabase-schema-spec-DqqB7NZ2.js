const n="Supabase Multi-Tenant Schema Spec",e="supabase-schema-spec",i="Technical",a="Steve",t="2026-03-12",o="Mar 12",d=null,s="Supabase schema and auth architecture for multi-tenant dashboard platform.",r=[],E=`<h1>Supabase Schema + Auth Architecture: Multi-Tenant Dashboard</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>Author:</strong> Steve (AI Advisory Lead)
<strong>Status:</strong> COMPLETE. Ready for Bobby when dashboard MVP ships.
<strong>Depends on:</strong> Dashboard MVP (Bobby, in progress), Elon&#39;s security architecture review</p>
<hr>
<h2>Architecture Decision: RLS vs Database-Per-Tenant</h2>
<p>Elon&#39;s security architecture recommends database-per-tenant for CPA financial data (SSNs, tax returns, bank accounts). That&#39;s correct for sensitive data.</p>
<p>But the dashboard is NOT storing financial data. It stores operational metadata: agent statuses, task descriptions, event logs, configuration. This is low-sensitivity data that benefits from Supabase&#39;s native RLS + Realtime capabilities.</p>
<p><strong>Decision: Row-Level Security (RLS) on a shared Supabase database for the dashboard platform.</strong></p>
<p>If a client&#39;s dashboard ever needs to reference sensitive financial data (Phase 3+), that data stays in a separate, isolated database per Elon&#39;s architecture. The dashboard only holds pointers/references, never the sensitive data itself.</p>
<p><strong>Why this is the right call:</strong></p>
<ul>
<li>Supabase Realtime requires shared tables (can&#39;t subscribe across databases)</li>
<li>RLS is Postgres-native, battle-tested, and enforced at the database level</li>
<li>Over-the-air updates (push new automations to all clients) require shared schema</li>
<li>Cost: one Supabase project vs N databases</li>
<li>Complexity: manageable for a 2-person team</li>
<li>SOC 2 compatible: RLS + audit logging satisfies access control requirements</li>
</ul>
<p><strong>When to revisit:</strong> If we start storing actual client financial data in the dashboard (we should not), or if a CPA client&#39;s insurer specifically requires physical database isolation for operational data.</p>
<hr>
<h2>Database Schema</h2>
<h3>Table 1: <code>organizations</code></h3>
<p>The tenant. Each client company is one organization. AOM is also an organization (tenant_id used for internal dashboard).</p>
<pre><code class="language-sql">CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                              -- &quot;Phoenix CPA Group&quot;
  slug TEXT UNIQUE NOT NULL,                       -- &quot;phoenix-cpa-group&quot; (URL-safe)
  plan TEXT NOT NULL DEFAULT &#39;audit&#39;               -- audit | build | platform
    CHECK (plan IN (&#39;audit&#39;, &#39;build&#39;, &#39;platform&#39;)),
  settings JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,     -- dashboard config, branding overrides, feature flags
  is_active BOOLEAN NOT NULL DEFAULT true,         -- soft delete / suspension
  onboarded_at TIMESTAMPTZ,                        -- NULL until onboarding complete
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_active ON public.organizations(is_active) WHERE is_active = true;
</code></pre>
<p><strong><code>settings</code> JSONB structure (example):</strong></p>
<pre><code class="language-json">{
  &quot;branding&quot;: {
    &quot;display_name&quot;: &quot;Phoenix CPA Group AI Operations&quot;,
    &quot;accent_color&quot;: &quot;#22C55E&quot;
  },
  &quot;features&quot;: {
    &quot;realtime_enabled&quot;: true,
    &quot;email_digest&quot;: true,
    &quot;max_automations&quot;: 10
  },
  &quot;notifications&quot;: {
    &quot;blocker_email&quot;: true,
    &quot;daily_digest&quot;: true,
    &quot;digest_time&quot;: &quot;08:00&quot;
  }
}
</code></pre>
<h3>Table 2: <code>profiles</code></h3>
<p>Extends Supabase Auth users with org membership and role. One user can belong to one organization (MVP). Multi-org support is Phase 4.</p>
<pre><code class="language-sql">CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT &#39;viewer&#39;
    CHECK (role IN (&#39;super_admin&#39;, &#39;admin&#39;, &#39;member&#39;, &#39;viewer&#39;)),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,      -- tracked here for dashboard display
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(organization_id, role);
</code></pre>
<p><strong>Roles:</strong></p>
<table>
<thead>
<tr>
<th>Role</th>
<th>Who</th>
<th>Access</th>
</tr>
</thead>
<tbody><tr>
<td><code>super_admin</code></td>
<td>Patrik, AOM ops</td>
<td>Cross-tenant visibility. Platform management. Cannot see client financial data (that&#39;s in separate systems).</td>
</tr>
<tr>
<td><code>admin</code></td>
<td>Client firm owner</td>
<td>Full access to their org&#39;s dashboard, automations, settings. Can invite members.</td>
</tr>
<tr>
<td><code>member</code></td>
<td>Client staff</td>
<td>Can view dashboard, interact with automations. Cannot change settings or invite.</td>
</tr>
<tr>
<td><code>viewer</code></td>
<td>Read-only stakeholders</td>
<td>Dashboard view only. No automation interaction.</td>
</tr>
</tbody></table>
<h3>Table 3: <code>agents</code></h3>
<p>The automations/agents that appear on a client&#39;s dashboard. For AOM internal, these are Bobby, Steffen, Elmo, etc. For clients, these are their AI automations.</p>
<pre><code class="language-sql">CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                              -- &quot;Bobby&quot; or &quot;Email Triage&quot;
  slug TEXT NOT NULL,                              -- &quot;bobby&quot; or &quot;email-triage&quot;
  role_description TEXT,                           -- &quot;Web Dev&quot; or &quot;Sorts inbox, drafts replies&quot;
  agent_type TEXT NOT NULL DEFAULT &#39;custom&#39;
    CHECK (agent_type IN (&#39;internal&#39;, &#39;email&#39;, &#39;calendar&#39;, &#39;lead_response&#39;, &#39;invoice&#39;, &#39;scheduling&#39;, &#39;custom&#39;)),
  status TEXT NOT NULL DEFAULT &#39;idle&#39;
    CHECK (status IN (&#39;working&#39;, &#39;idle&#39;, &#39;blocked&#39;, &#39;paused&#39;, &#39;done&#39;, &#39;waiting&#39;)),
  current_task TEXT,                               -- one-line description of what it&#39;s doing now
  config JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,       -- agent-specific settings
  icon TEXT,                                       -- icon identifier or URL
  sort_order INTEGER NOT NULL DEFAULT 0,           -- display order on dashboard
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, slug)
);

-- Indexes
CREATE INDEX idx_agents_org ON public.agents(organization_id);
CREATE INDEX idx_agents_org_active ON public.agents(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_agents_status ON public.agents(organization_id, status);
</code></pre>
<h3>Table 4: <code>missions</code></h3>
<p>What agents are working on. Maps to active-missions.md for AOM internal. For clients, these are automation tasks.</p>
<pre><code class="language-sql">CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,                       -- &quot;Fix /book form (Elmo FAIL x2)&quot;
  status TEXT NOT NULL DEFAULT &#39;running&#39;
    CHECK (status IN (&#39;running&#39;, &#39;completed&#39;, &#39;failed&#39;, &#39;cancelled&#39;)),
  launched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result TEXT,                                     -- completion summary
  commit_hash TEXT,                                -- git commit if applicable
  commit_url TEXT,                                 -- link to GitHub commit
  metadata JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,     -- source file refs, blocker details, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_missions_org ON public.missions(organization_id);
CREATE INDEX idx_missions_agent ON public.missions(agent_id);
CREATE INDEX idx_missions_status ON public.missions(organization_id, status);
CREATE INDEX idx_missions_running ON public.missions(organization_id, status) WHERE status = &#39;running&#39;;
CREATE INDEX idx_missions_recent ON public.missions(organization_id, completed_at DESC NULLS LAST);
</code></pre>
<h3>Table 5: <code>events</code></h3>
<p>The activity feed. Every meaningful action gets logged here. Powers the Pipeline Feed (Command View) and Activity Log (Individual View). Also serves as the SOC 2 audit trail.</p>
<pre><code class="language-sql">CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      &#39;mission_started&#39;, &#39;mission_completed&#39;, &#39;mission_failed&#39;,
      &#39;status_change&#39;, &#39;commit&#39;, &#39;file_changed&#39;,
      &#39;action_taken&#39;, &#39;blocker_added&#39;, &#39;blocker_resolved&#39;,
      &#39;error&#39;, &#39;info&#39;, &#39;user_action&#39;
    )),
  description TEXT NOT NULL,                       -- human-readable: &quot;Committed: fix form attrs (a3f21bc)&quot;
  metadata JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,     -- structured data: files touched, commit details, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_org ON public.events(organization_id);
CREATE INDEX idx_events_agent ON public.events(agent_id);
CREATE INDEX idx_events_org_recent ON public.events(organization_id, created_at DESC);
CREATE INDEX idx_events_type ON public.events(organization_id, event_type);
CREATE INDEX idx_events_mission ON public.events(mission_id);

-- Partition by time for performance (events table will grow fast)
-- Phase 2: convert to partitioned table by month
-- For MVP, the indexes above are sufficient
</code></pre>
<h3>Table 6: <code>blockers</code></h3>
<p>Active blockers. Separate from events for fast querying. When a blocker is resolved, it gets a <code>resolved_at</code> timestamp (not deleted).</p>
<pre><code class="language-sql">CREATE TABLE public.blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  description TEXT NOT NULL,                       -- &quot;Docker Desktop not installed (blocking Postiz)&quot;
  severity TEXT NOT NULL DEFAULT &#39;medium&#39;
    CHECK (severity IN (&#39;low&#39;, &#39;medium&#39;, &#39;high&#39;, &#39;critical&#39;)),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_blockers_org_active ON public.blockers(organization_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_blockers_agent ON public.blockers(agent_id);
</code></pre>
<h3>Table 7: <code>audit_log</code></h3>
<p>Immutable access log for SOC 2 compliance. Every data access and mutation gets recorded. This table is append-only (no UPDATE or DELETE policies).</p>
<pre><code class="language-sql">CREATE TABLE public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,                            -- &#39;read&#39;, &#39;create&#39;, &#39;update&#39;, &#39;delete&#39;, &#39;login&#39;, &#39;mfa_verify&#39;
  resource_type TEXT NOT NULL,                     -- &#39;agent&#39;, &#39;mission&#39;, &#39;event&#39;, &#39;settings&#39;, &#39;profile&#39;
  resource_id TEXT,                                -- UUID of the affected record
  details JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,      -- what changed, old/new values for updates
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_org ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON public.audit_log(resource_type, resource_id);

-- NO UPDATE OR DELETE POLICIES on this table. Append-only.
</code></pre>
<hr>
<h2>Row-Level Security Policies</h2>
<p>Every table gets RLS enabled. Users can only see data for their own organization. Super admins can see everything.</p>
<pre><code class="language-sql">-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get the current user&#39;s organization_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function: check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = &#39;super_admin&#39;
  );
$$;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

-- Users can read their own org
CREATE POLICY &quot;Users can view own organization&quot;
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id() OR public.is_super_admin());

-- Only super_admin can create orgs
CREATE POLICY &quot;Super admins can create organizations&quot;
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Admins can update their own org settings; super_admin can update any
CREATE POLICY &quot;Admins can update own organization&quot;
  ON public.organizations FOR UPDATE
  USING (
    (id = public.get_user_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    ))
    OR public.is_super_admin()
  );

-- ============================================================
-- PROFILES
-- ============================================================

-- Users can see profiles in their own org
CREATE POLICY &quot;Users can view profiles in own org&quot;
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

-- Users can update their own profile
CREATE POLICY &quot;Users can update own profile&quot;
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins can insert profiles (invite users) for their org
CREATE POLICY &quot;Admins can invite users to own org&quot;
  ON public.profiles FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- ============================================================
-- AGENTS
-- ============================================================

CREATE POLICY &quot;Users can view agents in own org&quot;
  ON public.agents FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Admins can manage agents in own org&quot;
  ON public.agents FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- ============================================================
-- MISSIONS
-- ============================================================

CREATE POLICY &quot;Users can view missions in own org&quot;
  ON public.missions FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Members+ can create missions in own org&quot;
  ON public.missions FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

CREATE POLICY &quot;Members+ can update missions in own org&quot;
  ON public.missions FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- ============================================================
-- EVENTS
-- ============================================================

CREATE POLICY &quot;Users can view events in own org&quot;
  ON public.events FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

-- Events are created by the system (service role) or members+
CREATE POLICY &quot;Members+ can create events in own org&quot;
  ON public.events FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- Events are immutable (no update/delete policies for regular users)

-- ============================================================
-- BLOCKERS
-- ============================================================

CREATE POLICY &quot;Users can view blockers in own org&quot;
  ON public.blockers FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Members+ can manage blockers in own org&quot;
  ON public.blockers FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- ============================================================
-- AUDIT LOG
-- ============================================================

-- Only super_admin can read audit logs (or admin for their own org)
CREATE POLICY &quot;Admins can view audit log for own org&quot;
  ON public.audit_log FOR SELECT
  USING (
    (organization_id = public.get_user_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    ))
    OR public.is_super_admin()
  );

-- Audit log inserts happen via service role (server-side), not client
-- No INSERT policy for regular users
CREATE POLICY &quot;Service role can insert audit logs&quot;
  ON public.audit_log FOR INSERT
  WITH CHECK (true);  -- Only reachable via service_role key (server-side)

-- No UPDATE or DELETE policies. Ever. Append-only.
</code></pre>
<hr>
<h2>Supabase Realtime Subscriptions (Phase 2)</h2>
<p>Enable Realtime on these tables for live dashboard updates:</p>
<pre><code class="language-sql">-- Enable Realtime publication on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blockers;
</code></pre>
<p>Client subscribes per-org:</p>
<pre><code class="language-typescript">// Example: subscribe to agent status changes for current org
const channel = supabase
  .channel(&#39;agent-status&#39;)
  .on(&#39;postgres_changes&#39;, {
    event: &#39;UPDATE&#39;,
    schema: &#39;public&#39;,
    table: &#39;agents&#39;,
    filter: \`organization_id=eq.\${orgId}\`,
  }, (payload) =&gt; {
    // Update agent card in real-time
    updateAgentStatus(payload.new);
  })
  .subscribe();
</code></pre>
<p>RLS ensures a client can only subscribe to their own org&#39;s changes. Supabase enforces this at the database level.</p>
<hr>
<h2>Auth Flow</h2>
<h3>Signup Flow (New Client Onboarding)</h3>
<pre><code>1. AOM admin creates organization in Supabase (via admin panel or API)
   -&gt; INSERT INTO organizations (name, slug, plan)

2. AOM admin invites client via email
   -&gt; Supabase Auth: supabase.auth.admin.inviteUserByEmail()
   -&gt; Creates auth.users record with email confirmation pending
   -&gt; INSERT INTO profiles (id, organization_id, role, display_name, email)

3. Client receives email with magic link / set-password link
   -&gt; Clicks link, sets password
   -&gt; Supabase Auth confirms email, activates account

4. Client logs in for first time
   -&gt; Redirect to MFA enrollment (TOTP via authenticator app)
   -&gt; Supabase Auth MFA: supabase.auth.mfa.enroll({ factorType: &#39;totp&#39; })
   -&gt; Client scans QR code with Google Authenticator / Authy / 1Password
   -&gt; Verifies with 6-digit code
   -&gt; profiles.mfa_enabled = true

5. MFA verified -&gt; redirect to /dashboard
   -&gt; RLS kicks in: client only sees their org&#39;s agents, missions, events
   -&gt; Dashboard loads with their automations
</code></pre>
<h3>Login Flow (Returning User)</h3>
<pre><code>1. User visits /login
   -&gt; Email + password form

2. Supabase Auth: supabase.auth.signInWithPassword({ email, password })
   -&gt; If MFA enrolled: returns session with aal1 (first factor only)

3. MFA Challenge
   -&gt; supabase.auth.mfa.challenge({ factorId })
   -&gt; User enters 6-digit TOTP code
   -&gt; supabase.auth.mfa.verify({ factorId, challengeId, code })
   -&gt; Session upgraded to aal2 (both factors verified)

4. Redirect to /dashboard
   -&gt; All API calls include the aal2 session token
   -&gt; RLS enforces org isolation automatically
</code></pre>
<h3>Session Management</h3>
<pre><code>- Access token lifetime: 15 minutes (Supabase default, keep it)
- Refresh token lifetime: 7 days
- Auto-refresh: Supabase JS client handles this automatically
- Inactive timeout: 15 minutes for screens showing operational data
  (longer than security doc&#39;s recommendation because dashboard data
   is not financial data; revisit if we add sensitive data views)
- MFA requirement: enforce aal2 for all dashboard access
</code></pre>
<h3>MFA Enforcement (Middleware)</h3>
<pre><code class="language-typescript">// Next.js middleware: enforce MFA on all /dashboard routes
import { createMiddlewareClient } from &#39;@supabase/auth-helpers-nextjs&#39;;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL(&#39;/login&#39;, req.url));
  }

  // Check if MFA is verified (aal2)
  const { data: { currentLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (currentLevel !== &#39;aal2&#39;) {
    // User logged in but hasn&#39;t completed MFA
    return NextResponse.redirect(new URL(&#39;/login/mfa&#39;, req.url));
  }

  return res;
}

export const config = {
  matcher: [&#39;/dashboard/:path*&#39;],
};
</code></pre>
<h3>Password Policy</h3>
<p>Enforced via Supabase Auth config (project settings):</p>
<ul>
<li>Minimum 8 characters (Supabase enforced)</li>
<li>Application-side validation for 12+ characters (matching security architecture recommendation)</li>
<li>No password reuse check in Supabase free tier (add in Phase 2 via custom hook)</li>
<li>Account lockout: Supabase handles rate limiting (10 attempts per IP per minute)</li>
</ul>
<hr>
<h2>AOM Internal Dashboard: Migration Path</h2>
<p>The MVP dashboard (Phase 1) uses GitHub API polling. When Phase 2 ships, AOM&#39;s internal dashboard migrates to Supabase too:</p>
<h3>How AOM&#39;s Agents Write to Supabase</h3>
<p>A bridge script (run by Mom after every agent commit) syncs agent status from markdown files to Supabase:</p>
<pre><code>1. Agent commits work (Bobby pushes code)
2. Mom launches automatically (per CLAUDE.md rules)
3. Mom reads active-missions.md + current-priorities.md
4. Mom calls Supabase API via service_role key:
   - UPDATE agents SET status, current_task WHERE org = &#39;aom&#39;
   - INSERT INTO missions (if new mission started)
   - UPDATE missions SET status = &#39;completed&#39; (if mission finished)
   - INSERT INTO events (commit event, status change, etc.)
5. Dashboard receives Realtime update instantly
</code></pre>
<p>This means AOM gets the same Realtime dashboard experience as clients. Dogfooding.</p>
<h3>AOM Org Bootstrap Data</h3>
<pre><code class="language-sql">-- AOM organization (created once, manually)
INSERT INTO public.organizations (name, slug, plan, settings)
VALUES (
  &#39;AOM Studio&#39;,
  &#39;aom&#39;,
  &#39;platform&#39;,
  &#39;{
    &quot;branding&quot;: {
      &quot;display_name&quot;: &quot;AOM MISSION CONTROL&quot;,
      &quot;accent_color&quot;: &quot;#FF6B00&quot;
    },
    &quot;features&quot;: {
      &quot;realtime_enabled&quot;: true,
      &quot;github_polling&quot;: true,
      &quot;max_automations&quot;: 50
    }
  }&#39;::jsonb
);

-- AOM agents (13 total, matching dashboard MVP brief)
-- Bobby
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Bobby&#39;, &#39;bobby&#39;, &#39;Web Dev&#39;, &#39;internal&#39;, 1
);
-- Colton
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Colton&#39;, &#39;colton&#39;, &#39;Backup Builder&#39;, &#39;internal&#39;, 2
);
-- Elmo
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Elmo&#39;, &#39;elmo&#39;, &#39;QA Gate&#39;, &#39;internal&#39;, 3
);
-- Steffen
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Steffen&#39;, &#39;steffen&#39;, &#39;Creative Director&#39;, &#39;internal&#39;, 4
);
-- Jacob
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Jacob&#39;, &#39;jacob&#39;, &#39;Outreach&#39;, &#39;internal&#39;, 5
);
-- Elon
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Elon&#39;, &#39;elon&#39;, &#39;Systems&#39;, &#39;internal&#39;, 6
);
-- Alex
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Alex&#39;, &#39;alex&#39;, &#39;Strategy&#39;, &#39;internal&#39;, 7
);
-- Steve
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Steve&#39;, &#39;steve&#39;, &#39;AI Advisory&#39;, &#39;internal&#39;, 8
);
-- Cleo
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Cleo&#39;, &#39;cleo&#39;, &#39;Content&#39;, &#39;internal&#39;, 9
);
-- Tony
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Tony&#39;, &#39;tony&#39;, &#39;Social Media&#39;, &#39;internal&#39;, 10
);
-- Paige
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Paige&#39;, &#39;paige&#39;, &#39;Client Success&#39;, &#39;internal&#39;, 11
);
-- Pixel
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Pixel&#39;, &#39;pixel&#39;, &#39;Extension&#39;, &#39;internal&#39;, 12
);
-- Mom
INSERT INTO public.agents (organization_id, name, slug, role_description, agent_type, sort_order)
VALUES (
  (SELECT id FROM organizations WHERE slug = &#39;aom&#39;),
  &#39;Mom&#39;, &#39;mom&#39;, &#39;Orchestrator&#39;, &#39;internal&#39;, 13
);
</code></pre>
<hr>
<h2>Migration SQL (Full, Run-Ready)</h2>
<p>Bobby runs this in the Supabase SQL editor to bootstrap the schema. One file, run once.</p>
<pre><code class="language-sql">-- ============================================================
-- AOM Multi-Tenant Dashboard Schema
-- Version: 1.0
-- Date: 2026-03-12
-- Author: Steve (AI Advisory Lead)
-- ============================================================

-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT &#39;audit&#39; CHECK (plan IN (&#39;audit&#39;, &#39;build&#39;, &#39;platform&#39;)),
  settings JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT &#39;viewer&#39; CHECK (role IN (&#39;super_admin&#39;, &#39;admin&#39;, &#39;member&#39;, &#39;viewer&#39;)),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role_description TEXT,
  agent_type TEXT NOT NULL DEFAULT &#39;custom&#39; CHECK (agent_type IN (&#39;internal&#39;, &#39;email&#39;, &#39;calendar&#39;, &#39;lead_response&#39;, &#39;invoice&#39;, &#39;scheduling&#39;, &#39;custom&#39;)),
  status TEXT NOT NULL DEFAULT &#39;idle&#39; CHECK (status IN (&#39;working&#39;, &#39;idle&#39;, &#39;blocked&#39;, &#39;paused&#39;, &#39;done&#39;, &#39;waiting&#39;)),
  current_task TEXT,
  config JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT &#39;running&#39; CHECK (status IN (&#39;running&#39;, &#39;completed&#39;, &#39;failed&#39;, &#39;cancelled&#39;)),
  launched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result TEXT,
  commit_hash TEXT,
  commit_url TEXT,
  metadata JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    &#39;mission_started&#39;, &#39;mission_completed&#39;, &#39;mission_failed&#39;,
    &#39;status_change&#39;, &#39;commit&#39;, &#39;file_changed&#39;,
    &#39;action_taken&#39;, &#39;blocker_added&#39;, &#39;blocker_resolved&#39;,
    &#39;error&#39;, &#39;info&#39;, &#39;user_action&#39;
  )),
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT &#39;medium&#39; CHECK (severity IN (&#39;low&#39;, &#39;medium&#39;, &#39;high&#39;, &#39;critical&#39;)),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB NOT NULL DEFAULT &#39;{}&#39;::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(organization_id, role);

CREATE INDEX IF NOT EXISTS idx_agents_org ON public.agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_org_active ON public.agents(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_missions_org ON public.missions(organization_id);
CREATE INDEX IF NOT EXISTS idx_missions_agent ON public.missions(agent_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON public.missions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_missions_running ON public.missions(organization_id, status) WHERE status = &#39;running&#39;;
CREATE INDEX IF NOT EXISTS idx_missions_recent ON public.missions(organization_id, completed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_events_org ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_agent ON public.events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_org_recent ON public.events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_mission ON public.events(mission_id);

CREATE INDEX IF NOT EXISTS idx_blockers_org_active ON public.blockers(organization_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blockers_agent ON public.blockers(agent_id);

CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_log(resource_type, resource_id);

-- 3. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = &#39;super_admin&#39;
  );
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_agents
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, organization_id, role, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data-&gt;&gt;&#39;organization_id&#39;)::uuid,
      (SELECT id FROM organizations WHERE slug = &#39;aom&#39; LIMIT 1)
    ),
    COALESCE(NEW.raw_user_meta_data-&gt;&gt;&#39;role&#39;, &#39;viewer&#39;),
    COALESCE(NEW.raw_user_meta_data-&gt;&gt;&#39;display_name&#39;, split_part(NEW.email, &#39;@&#39;, 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY &quot;Users can view own organization&quot;
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Super admins can create organizations&quot;
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY &quot;Admins can update own organization&quot;
  ON public.organizations FOR UPDATE
  USING (
    (id = public.get_user_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    )) OR public.is_super_admin()
  );

-- Profiles
CREATE POLICY &quot;Users can view profiles in own org&quot;
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Users can update own profile&quot;
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY &quot;Admins can invite users to own org&quot;
  ON public.profiles FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- Agents
CREATE POLICY &quot;Users can view agents in own org&quot;
  ON public.agents FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Admins can manage agents&quot;
  ON public.agents FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- Missions
CREATE POLICY &quot;Users can view missions in own org&quot;
  ON public.missions FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Members can create missions&quot;
  ON public.missions FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

CREATE POLICY &quot;Members can update missions&quot;
  ON public.missions FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- Events
CREATE POLICY &quot;Users can view events in own org&quot;
  ON public.events FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Members can create events&quot;
  ON public.events FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- Blockers
CREATE POLICY &quot;Users can view blockers in own org&quot;
  ON public.blockers FOR SELECT
  USING (organization_id = public.get_user_org_id() OR public.is_super_admin());

CREATE POLICY &quot;Members can manage blockers&quot;
  ON public.blockers FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;member&#39;, &#39;admin&#39;, &#39;super_admin&#39;)
    )
  );

-- Audit Log (append-only, read by admins only)
CREATE POLICY &quot;Admins can view audit log for own org&quot;
  ON public.audit_log FOR SELECT
  USING (
    (organization_id = public.get_user_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (&#39;admin&#39;, &#39;super_admin&#39;)
    )) OR public.is_super_admin()
  );

-- Service role handles audit log inserts (no user policy needed)

-- 5. REALTIME (Phase 2, uncomment when ready)
-- ============================================================

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.blockers;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
</code></pre>
<hr>
<h2>Supabase Project Setup Checklist (for Bobby)</h2>
<ol>
<li>Create Supabase project (supabase.com/dashboard)</li>
<li>Copy project URL + anon key + service_role key</li>
<li>Add to Vercel env vars:<ul>
<li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
<li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
<li><code>SUPABASE_SERVICE_ROLE_KEY</code> (server-side only, never exposed to client)</li>
</ul>
</li>
<li>Run the migration SQL above in SQL Editor</li>
<li>Enable MFA in Auth settings (Dashboard &gt; Authentication &gt; MFA)</li>
<li>Set email templates for invite + password reset</li>
<li>Run the AOM bootstrap data (organizations + agents inserts)</li>
<li>Create Patrik&#39;s user account via admin API with <code>super_admin</code> role</li>
</ol>
<hr>
<h2>Client Onboarding: Adding a New Tenant</h2>
<pre><code class="language-typescript">// Server-side only (API route or admin action)
// Uses SUPABASE_SERVICE_ROLE_KEY

async function onboardClient(clientName: string, clientEmail: string, plan: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Create organization
  const { data: org } = await supabase
    .from(&#39;organizations&#39;)
    .insert({
      name: clientName,
      slug: slugify(clientName),
      plan: plan,
    })
    .select()
    .single();

  // 2. Invite user (sends email with set-password link)
  const { data: authUser } = await supabase.auth.admin.inviteUserByEmail(clientEmail, {
    data: {
      organization_id: org.id,
      role: &#39;admin&#39;,
      display_name: clientName,
    },
  });

  // 3. Create default automations based on plan
  const defaultAutomations = getDefaultAutomations(plan, org.id);
  await supabase.from(&#39;agents&#39;).insert(defaultAutomations);

  // 4. Log the onboarding event
  await supabase.from(&#39;audit_log&#39;).insert({
    organization_id: org.id,
    user_id: null, // system action
    action: &#39;create&#39;,
    resource_type: &#39;organization&#39;,
    resource_id: org.id,
    details: { plan, invited_email: clientEmail },
  });

  return org;
}
</code></pre>
<hr>
<h2>Phase Roadmap (Schema Perspective)</h2>
<table>
<thead>
<tr>
<th>Phase</th>
<th>What Changes in Schema</th>
<th>When</th>
</tr>
</thead>
<tbody><tr>
<td>Phase 1 (MVP)</td>
<td>Nothing. Dashboard uses GitHub API. Schema exists but is not connected.</td>
<td>Now</td>
</tr>
<tr>
<td>Phase 2 (Client-Ready)</td>
<td>Schema goes live. AOM + first client tenant. Realtime enabled. Bridge script syncs AOM data.</td>
<td>Weeks 3-4</td>
</tr>
<tr>
<td>Phase 3 (Platform)</td>
<td>Add: <code>subscription</code> table (Stripe), <code>reports</code> table (weekly digests), <code>notification_preferences</code> table. Partition events table by month.</td>
<td>Month 2</td>
</tr>
<tr>
<td>Phase 4 (Scale)</td>
<td>Add: <code>automation_templates</code> table (marketplace), <code>api_keys</code> table (client API access), <code>usage_metrics</code> table.</td>
<td>Month 3+</td>
</tr>
</tbody></table>
<hr>
<p><em>Schema complete. Bobby: run the migration SQL when you&#39;re ready for Phase 2. The MVP dashboard (Phase 1) does not need Supabase. This is here and ready for when it does.</em></p>
`,l={title:n,slug:e,category:i,agent:a,date:t,dateFormatted:o,updated:null,summary:s,tags:r,content:E};export{a as agent,i as category,E as content,t as date,o as dateFormatted,l as default,e as slug,s as summary,r as tags,n as title,d as updated};
