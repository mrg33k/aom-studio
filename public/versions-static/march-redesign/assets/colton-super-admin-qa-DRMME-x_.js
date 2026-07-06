const e="Super Admin Photo Replace QA",o="colton-super-admin-qa",t="Audits",s="Elmo",n="2026-03-09",r="Mar 9",l=null,i="Full audit of super admin mode, image replacement, video upload, and admin auth.",a=[],d=`<h1>Super Admin Photo Replace QA Report</h1>
<p><strong>Agent:</strong> Colton (Bobby&#39;s backup builder)
<strong>Date:</strong> 2026-03-09
<strong>Scope:</strong> Full audit of super admin mode, image/photo replacement, video upload, admin auth
<strong>Commit:</strong> 0759f4c (AMBITION repo)</p>
<hr>
<h2>Architecture Summary</h2>
<p>The super admin system is a comprehensive in-page editing layer built on:</p>
<ul>
<li><strong>SuperAdminContext</strong> (state, locking, draft management, publish queue)</li>
<li><strong>SuperAdminCommandBar</strong> (floating toolbar: edit/pause, discard, publish, exit)</li>
<li><strong>SuperAdminDrawer</strong> (side panel: section order, field editing, image/video uploads)</li>
<li><strong>SuperAdminUnlockModal</strong> (password gate or bypass)</li>
<li><strong>EditableRegion</strong> (clickable overlay wrappers on page sections)</li>
<li><strong>ImageUploader</strong> (dropzone + Firebase Storage upload + WebP compression)</li>
<li><strong>VideoUploader</strong> (dropzone + Firebase Storage upload, max 200 MB)</li>
<li><strong>SimpleInput</strong> (renders text/url/boolean fields with inline image upload for image-like fields)</li>
<li><strong>ArrayFieldEditor</strong> (array items with drag reorder, per-item editing)</li>
<li><strong>FieldRenderer</strong> (routes schema fields to SimpleInput or ArrayFieldEditor)</li>
<li><strong>AiAdminAssistantPanel</strong> (AI chat for conversational page editing)</li>
</ul>
<p><strong>Activation:</strong> Cmd+Shift+E (or Ctrl+Shift+E) opens the unlock modal. Password is read from <code>VITE_SUPER_ADMIN_PASSWORD</code> env var. Empty = no password required.</p>
<p><strong>Persistence flow:</strong> Edit field -&gt; local draft state -&gt; dirty flag -&gt; publish queue -&gt; &quot;Publish&quot; button (or auto-publish for image uploads) -&gt; Firestore write via <code>savePageContent</code>/<code>updateProject</code>/<code>saveSiteSettings</code>.</p>
<p><strong>Locking:</strong> Resource-level locks prevent two editors from clobbering each other. Heartbeat every 15s, stale after 10 min. Force unlock available.</p>
<hr>
<h2>Bugs Found and Fixed</h2>
<h3>1. CRITICAL: No file size limit on ImageUploader</h3>
<p><strong>Problem:</strong> <code>ImageUploader</code> had no <code>maxSize</code> on the dropzone. Users could attempt to upload files of any size. While <code>browser-image-compression</code> handles compression, very large raw files (100+ MB) could cause the browser to hang or crash during compression.</p>
<p><strong>Fix:</strong> Added a 25 MB max file size limit to the dropzone config. Added rejection handling in <code>onDrop</code> that shows a clear error message when a file is too large.</p>
<p><strong>File:</strong> <code>src/components/editor/ImageUploader.jsx</code></p>
<h3>2. CRITICAL: Video uploads not auto-publishing to Firestore</h3>
<p><strong>Problem:</strong> In <code>SuperAdminDrawer</code>, when a project video uploaded successfully, the callback used <code>applyChange()</code> which only updates the local draft state. Image uploads correctly used <code>applyImageUpload()</code> which also calls <code>publishAll()</code> to persist to Firestore. This meant uploaded video URLs would be lost on page reload.</p>
<p><strong>Fix:</strong> Changed the video upload <code>onUploadComplete</code> callback to use <code>applyImageUpload()</code> so videos auto-persist like images do.</p>
<p><strong>File:</strong> <code>src/components/super-admin/SuperAdminDrawer.jsx</code>, line ~605</p>
<h3>3. MEDIUM: Logo URL state collision with project image draft</h3>
<p><strong>Problem:</strong> The site settings &quot;Logo URL&quot; input field used the <code>projectImageDraft</code> state variable, which is also used by the project &quot;Featured Image URL&quot; field. If an admin edited a project image URL, then navigated to site settings, the logo input would show the project&#39;s draft URL instead of the actual logo URL.</p>
<p><strong>Fix:</strong> Added a separate <code>logoUrlDraft</code> state variable for the logo URL field, plus a <code>useEffect</code> that syncs it when entering the site settings region.</p>
<p><strong>File:</strong> <code>src/components/super-admin/SuperAdminDrawer.jsx</code></p>
<h3>4. LOW: No upload success feedback on ImageUploader</h3>
<p><strong>Problem:</strong> After a successful image upload, there was no visual confirmation. The preview showed the local blob URL but nothing indicated whether the upload completed or was still in progress.</p>
<p><strong>Fix:</strong> Added an <code>uploadSuccess</code> state and a small green &quot;Uploaded&quot; badge that appears on the preview thumbnail after successful upload.</p>
<p><strong>File:</strong> <code>src/components/editor/ImageUploader.jsx</code></p>
<hr>
<h2>Issues Reviewed (No Fix Needed)</h2>
<h3>Firebase API key in source code</h3>
<p>The Firebase config (API key, project ID, etc.) is hardcoded in <code>src/utils/firebase.js</code>. This is standard for Firebase web apps since the API key is inherently public and security is enforced via Firestore/Storage rules, not the API key itself. Not a bug, but worth noting.</p>
<h3>Auth bypass in dev mode</h3>
<p><code>AuthContext.jsx</code> has a <code>DEV_BYPASS_ENABLED</code> flag that skips Firebase auth in local dev. This is gated behind <code>import.meta.env.DEV</code> so it only activates in Vite dev mode. Production builds are not affected.</p>
<h3>Super admin password stored in env var</h3>
<p>The password for super admin unlock is read from <code>VITE_SUPER_ADMIN_PASSWORD</code>. If empty, the modal shows a &quot;Bypass Login&quot; button. This is fine for the current use case (internal tool for Patrik/Bobby). If this needs to be client-facing in the future, it should move to a proper auth flow.</p>
<h3>ImageUploader always converts to WebP</h3>
<p>All uploaded images are compressed and converted to WebP format. This is good for performance but means the original file format is lost. Logos with transparency (PNG) will lose their alpha channel if they rely on non-WebP transparency support in older browsers. WebP transparency is well-supported in modern browsers, so this is low-risk.</p>
<h3>SimpleInput draftValue sync</h3>
<p><code>SimpleInput</code> uses a local <code>draftValue</code> state for &quot;explicit URL add&quot; fields (image fields). This syncs from the parent <code>value</code> via <code>useEffect</code>. There&#39;s a theoretical race condition where an upload completes and sets <code>value</code> while the user is typing in the text input, but in practice the <code>useEffect</code> sync resolves this within one render cycle. Not worth fixing unless users report issues.</p>
<hr>
<h2>What Works Well</h2>
<ul>
<li>The entire editing flow (unlock -&gt; select region -&gt; edit fields -&gt; publish) is solid.</li>
<li>Resource locking prevents concurrent edit conflicts. Heartbeat + stale detection + force unlock covers all edge cases.</li>
<li>Image compression to WebP is automatic and uses web workers for performance.</li>
<li>The publish queue with per-entity dirty tracking is well-architected.</li>
<li>The AI assistant panel is a nice touch for conversational editing.</li>
<li>Drag-and-drop section reordering works correctly.</li>
<li>The drawer UI is clean and follows the dark theme consistently.</li>
<li>Schema-driven field rendering means new page sections automatically get editing support.</li>
</ul>
<hr>
<h2>Pre-existing Build Issue (Not Related to Super Admin)</h2>
<p><code>src/pages/About.jsx</code> has a pre-existing build error (JSX syntax issue at line 104). This is from other uncommitted changes in the repo, not related to the super admin system. Build succeeds when this file is reverted.</p>
<hr>
<h2>Verdict</h2>
<p>Three real bugs fixed (two critical, one medium), one UX improvement added. The core photo replace flow works correctly after fixes. The system is well-built overall with good separation of concerns.</p>
<p><strong>Status: PASS (with fixes committed)</strong></p>
`,c={title:e,slug:o,category:t,agent:s,date:n,dateFormatted:r,updated:null,summary:i,tags:a,content:d};export{s as agent,t as category,d as content,n as date,r as dateFormatted,c as default,o as slug,i as summary,a as tags,e as title,l as updated};
