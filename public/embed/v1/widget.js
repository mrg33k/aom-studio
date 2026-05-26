/*
 * Corner Embeddable Agents — widget.js (v1, centered inline variant)
 *
 * Drop on any page with:
 *   <script src="https://aheadofmarket.com/embed/v1/widget.js"
 *           data-embed-id="emb_xxxxxx"
 *           data-mount="#some-element"></script>
 *
 * Two mount modes (placement.mode):
 *   - "inline"  -> mounts inside the element named by data-mount or #corner-embed
 *   - "bubble"  -> mounts as a floating bottom-right bubble (default)
 *
 * The widget JS is untrusted. The bridge enforces origin allowlist, layers
 * the context overlay server-side, persists every turn.
 */
(function () {
  'use strict'

  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName('script')
      return s[s.length - 1]
    })()

  var embedId = script.getAttribute('data-embed-id')
  if (!embedId) {
    console.warn('[corner-embed] missing data-embed-id')
    return
  }

  var mountSelector = script.getAttribute('data-mount') || '#corner-embed'
  var BRIDGE_BASE = script.getAttribute('data-bridge') || ''
  // Optional: data-visitor-id overrides the generated localStorage id.
  // Useful when the host page knows the user (e.g. tenant world dashboards
  // pass "support-<worldId>" so conversations are scoped per tenant).
  var VISITOR_ID_OVERRIDE = script.getAttribute('data-visitor-id') || ''
  // Optional: data-force-inline=1 overrides config.placement.mode so the
  // widget always mounts inside data-mount (#corner-embed) instead of
  // spawning a fixed bottom-right launcher. Used by CornerSupportModal's
  // bare-mode iframe so the widget fills the modal instead of rendering a
  // second floating bubble on top of the test-page scaffold.
  var FORCE_INLINE = script.getAttribute('data-force-inline') === '1'
  // Optional: data-theme=light flips the widget's color tokens to a light
  // surface so it matches a host page that's in light theme (e.g. the
  // dashboard CornerSupportModal forwarding ?theme=light).
  var THEME = (script.getAttribute('data-theme') || '').toLowerCase()
  if (THEME !== 'light' && THEME !== 'dark') THEME = ''

  var VISITOR_KEY = 'corner_embed_visitor_v1'
  function visitorId() {
    // Explicit override wins (tenant-scoped support threads).
    if (VISITOR_ID_OVERRIDE) return VISITOR_ID_OVERRIDE
    try {
      var v = localStorage.getItem(VISITOR_KEY)
      if (v) return v
      v =
        'v_' +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36)
      localStorage.setItem(VISITOR_KEY, v)
      return v
    } catch (e) {
      return 'v_anon_' + Date.now().toString(36)
    }
  }
  var vid = visitorId()

  function getConfig() {
    return fetch(
      BRIDGE_BASE + '/api/embed/config?id=' + encodeURIComponent(embedId),
      { headers: { Accept: 'application/json' } }
    ).then(function (r) {
      if (!r.ok) throw new Error('config ' + r.status)
      return r.json()
    })
  }

  function postChat(content) {
    return fetch(BRIDGE_BASE + '/api/embed/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embed_id: embedId,
        visitor_id: vid,
        host_origin: window.location.origin,
        content: content,
      }),
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('chat ' + r.status + ': ' + t)
        })
      }
      return r.json()
    })
  }

  function pollMessages(sinceTs) {
    return fetch(
      BRIDGE_BASE +
        '/api/embed/messages?embed_id=' +
        encodeURIComponent(embedId) +
        '&visitor_id=' +
        encodeURIComponent(vid) +
        '&since=' +
        encodeURIComponent(sinceTs)
    ).then(function (r) {
      if (!r.ok) throw new Error('poll ' + r.status)
      return r.json()
    })
  }

  function pollSteps(parentMessageId) {
    return fetch(
      BRIDGE_BASE +
        '/api/embed/steps?embed_id=' +
        encodeURIComponent(embedId) +
        '&parent_message_id=' +
        encodeURIComponent(parentMessageId)
    ).then(function (r) {
      if (!r.ok) throw new Error('steps ' + r.status)
      return r.json()
    })
  }

  // Long-poll the bridge for assistant replies. No timeout: agents can take
  // 30s, 3 minutes, or longer (especially when they do real research). The
  // visitor's tab is the natural lifetime — close the tab, polling stops.
  // Returns a handle with cancel() so a new submit can replace the previous
  // poller cleanly.
  function waitForReply(sinceTs, onReply, opts) {
    var intervalMs = (opts && opts.intervalMs) || 2000
    var cancelled = false
    var cursor = sinceTs
    function tick() {
      if (cancelled) return
      pollMessages(cursor)
        .then(function (resp) {
          if (cancelled) return
          var msgs = (resp && resp.messages) || []
          if (msgs.length) {
            onReply(null, msgs)
            // Advance the cursor past the latest rendered reply so we don't
            // re-render it on the next tick. Then keep ticking so later
            // streaming assistant rows in the same conversation still flow.
            var last = msgs[msgs.length - 1]
            if (last && last.timestamp) cursor = last.timestamp
          }
          setTimeout(tick, intervalMs)
        })
        .catch(function () {
          // Transient network blip — retry. Polling will heal on its own once
          // the bridge or network recovers.
          setTimeout(tick, intervalMs)
        })
    }
    setTimeout(tick, 600)
    return { cancel: function () { cancelled = true } }
  }

  function mount(config) {
    if (config.offline) {
      console.info('[corner-embed]', embedId, 'is offline')
      return
    }

    var inline = FORCE_INLINE || (config.placement && config.placement.mode === 'inline')
    var host = inline
      ? document.querySelector(mountSelector)
      : (function () {
          var h = document.createElement('div')
          h.style.cssText =
            'position:fixed;z-index:2147483647;bottom:20px;right:20px;'
          document.body.appendChild(h)
          return h
        })()

    if (!host) {
      console.warn('[corner-embed] mount target not found:', mountSelector)
      return
    }

    var accent =
      (config.placement &&
        config.placement.theme &&
        config.placement.theme.accent) ||
      '#0EA5E9'
    var label =
      (config.placement &&
        config.placement.theme &&
        config.placement.theme.label) ||
      config.surface_name ||
      'Chat'
    var opening =
      (config.placement && config.placement.opening_prompt) ||
      'How can I help?'

    var shadow = host.attachShadow({ mode: 'open' })
    var style = document.createElement('style')
    style.textContent = STYLES.replace(/__ACCENT__/g, accent)
    shadow.appendChild(style)

    var panel = document.createElement('div')
    var panelClasses = inline ? 'ce-panel ce-panel-inline' : 'ce-panel ce-panel-bubble'
    if (THEME === 'light') panelClasses += ' ce-theme-light'
    panel.className = panelClasses
    panel.innerHTML = [
      '<div class="ce-header">',
      '  <span class="ce-dot"></span>',
      '  <span class="ce-title"></span>',
      '</div>',
      '<div class="ce-log" role="log"></div>',
      '<form class="ce-input">',
      '  <textarea rows="1" placeholder="Type a message..." aria-label="Message"></textarea>',
      '  <button type="submit" aria-label="Send">→</button>',
      '</form>',
      '<div class="ce-footer">powered by Corner</div>',
    ].join('')
    shadow.appendChild(panel)

    var titleEl = panel.querySelector('.ce-title')
    var logEl = panel.querySelector('.ce-log')
    var form = panel.querySelector('.ce-input')
    var textarea = form.querySelector('textarea')
    var sendBtn = form.querySelector('button')

    titleEl.textContent = label

    function addMsg(role, content) {
      var row = document.createElement('div')
      row.className = 'ce-msg ce-msg-' + role
      row.textContent = content
      logEl.appendChild(row)
      logEl.scrollTop = logEl.scrollHeight
      return row
    }

    function setTyping(on) {
      var existing = logEl.querySelector('.ce-typing')
      if (on && !existing) {
        var t = document.createElement('div')
        t.className = 'ce-msg ce-msg-agent ce-typing'
        t.innerHTML = '<span></span><span></span><span></span>'
        logEl.appendChild(t)
        logEl.scrollTop = logEl.scrollHeight
      } else if (!on && existing) {
        existing.remove()
      }
    }

    // Live step thread: shows the agent's real progress (real tool-use steps
    // emitted by the bridge-daemon, same source the dashboard live chain
    // reads). Returns { update(stepsArr), settle(), remove() }.
    function makeStepThread() {
      var wrap = document.createElement('div')
      wrap.className = 'ce-steps'
      logEl.appendChild(wrap)
      logEl.scrollTop = logEl.scrollHeight
      var seen = new Map() // index -> { row, text, status }
      return {
        update: function (steps) {
          if (!steps || !steps.length) return
          // Sort by index ascending so order stays stable
          steps.sort(function (a, b) { return a.index - b.index })
          // First pass: dim every prior step EXCEPT the most-recent in_progress
          var latestActiveIdx = -1
          for (var i = steps.length - 1; i >= 0; i--) {
            if (steps[i].status === 'in_progress') {
              latestActiveIdx = steps[i].index
              break
            }
          }
          steps.forEach(function (s) {
            var prev = seen.get(s.index)
            var renderStatus = s.status
            if (renderStatus === 'in_progress' && s.index !== latestActiveIdx) {
              renderStatus = 'done' // older "in_progress" → render as done so only one breathes
            }
            if (!prev) {
              var row = document.createElement('div')
              row.className = 'ce-step ce-step-' + renderStatus
              row.innerHTML = '<span class="ce-step-dot"></span><span class="ce-step-text"></span>'
              row.querySelector('.ce-step-text').textContent = s.text
              wrap.appendChild(row)
              seen.set(s.index, { row: row, text: s.text, status: renderStatus })
            } else {
              if (prev.text !== s.text) {
                prev.row.querySelector('.ce-step-text').textContent = s.text
                prev.text = s.text
              }
              if (prev.status !== renderStatus) {
                prev.row.className = 'ce-step ce-step-' + renderStatus
                prev.status = renderStatus
              }
            }
          })
          logEl.scrollTop = logEl.scrollHeight
        },
        settle: function () {
          // Flip everything to done — agent is finished.
          wrap.classList.add('ce-steps-settled')
          seen.forEach(function (e) {
            e.row.className = 'ce-step ce-step-done'
          })
        },
        remove: function () {
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap)
        },
      }
    }

    // Long-poll the steps endpoint until the assistant reply lands. cancel() stops.
    function watchSteps(parentMessageId, thread, intervalMs) {
      intervalMs = intervalMs || 1500
      var cancelled = false
      function tick() {
        if (cancelled) return
        pollSteps(parentMessageId)
          .then(function (resp) {
            if (cancelled) return
            thread.update((resp && resp.steps) || [])
            setTimeout(tick, intervalMs)
          })
          .catch(function () { setTimeout(tick, intervalMs) })
      }
      setTimeout(tick, 400)
      return { cancel: function () { cancelled = true } }
    }

    addMsg('agent', opening)

    textarea.addEventListener('input', function () {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    })
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        form.requestSubmit()
      }
    })

    var activeReplyPoller = null
    var activeStepWatcher = null
    var activeStepThread = null

    function tearDownActiveTurn() {
      if (activeReplyPoller) { activeReplyPoller.cancel(); activeReplyPoller = null }
      if (activeStepWatcher) { activeStepWatcher.cancel(); activeStepWatcher = null }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var content = textarea.value.trim()
      if (!content) return
      // New send replaces the previous turn's pollers + thread cleanly.
      tearDownActiveTurn()
      addMsg('visitor', content)
      textarea.value = ''
      textarea.style.height = 'auto'
      sendBtn.disabled = false

      // Spin up the step thread immediately so the visitor sees activity
      // even before the bridge-daemon has emitted its first step.
      activeStepThread = makeStepThread()
      activeStepThread.update([{ index: 0, text: 'Sent to the EA', status: 'done' }])
      activeStepThread.update([{ index: 1, text: 'Thinking', status: 'in_progress' }])

      postChat(content)
        .then(function (resp) {
          // Start real step polling against the bridge-daemon's events.
          activeStepWatcher = watchSteps(resp.message_id, activeStepThread, 1500)
          activeReplyPoller = waitForReply(
            resp.since_ts,
            function (err, msgs) {
              if (err && (!msgs || !msgs.length)) {
                if (activeStepWatcher) activeStepWatcher.cancel()
                if (activeStepThread) activeStepThread.settle()
                addMsg('agent', 'Hit a wall. Try once more?')
                return
              }
              // Reply landed: stop step polling, settle the thread, render.
              if (activeStepWatcher) activeStepWatcher.cancel()
              if (activeStepThread) activeStepThread.settle()
              msgs.forEach(function (m) { addMsg('agent', m.text) })
            },
            { intervalMs: 2000 }
          )
        })
        .catch(function (err) {
          if (activeStepWatcher) activeStepWatcher.cancel()
          if (activeStepThread) activeStepThread.settle()
          addMsg('agent', 'Connection error. Try again in a moment.')
          console.warn('[corner-embed]', err)
        })
    })

    setTimeout(function () { textarea.focus() }, 100)
  }

  getConfig()
    .then(mount)
    .catch(function (err) {
      console.warn('[corner-embed] init failed:', err)
      var fallback = document.querySelector(mountSelector)
      if (fallback) {
        fallback.innerHTML =
          '<div style="padding:20px;color:#9aa3ad;font-family:sans-serif;text-align:center">Embed unavailable.</div>'
      }
    })

  var STYLES = [
    ':host{all:initial;font-family:"Hanken Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '*{box-sizing:border-box;}',
    '.ce-panel{display:flex;flex-direction:column;background:#0f141a;color:#e8edf3;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 70px rgba(0,0,0,0.45),0 2px 8px rgba(0,0,0,0.25);}',
    '.ce-panel-inline{width:100%;height:560px;max-height:80vh;}',
    '.ce-panel-bubble{width:380px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 40px);}',
    '.ce-header{display:flex;align-items:center;gap:10px;padding:16px 20px;background:linear-gradient(180deg,rgba(229,69,31,0.18) 0%,rgba(15,20,26,0.0) 100%);border-bottom:1px solid rgba(255,255,255,0.06);}',
    '.ce-dot{width:8px;height:8px;border-radius:50%;background:__ACCENT__;box-shadow:0 0 12px __ACCENT__;}',
    '.ce-title{font-family:"Oswald","Hanken Grotesk",sans-serif;font-weight:500;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#f3f5f8;}',
    '.ce-log{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:10px;background:#0b1015;}',
    '.ce-msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}',
    '.ce-msg-visitor{align-self:flex-end;background:__ACCENT__;color:#fff;border-bottom-right-radius:4px;}',
    '.ce-msg-agent{align-self:flex-start;background:rgba(255,255,255,0.04);color:#e8edf3;border:1px solid rgba(255,255,255,0.06);border-bottom-left-radius:4px;}',
    '.ce-typing{display:flex;gap:5px;align-items:center;}',
    '.ce-typing span{width:6px;height:6px;border-radius:50%;background:#7b8694;animation:ce-blink 1.2s infinite;}',
    '.ce-typing span:nth-child(2){animation-delay:.18s;}',
    '.ce-typing span:nth-child(3){animation-delay:.36s;}',
    '@keyframes ce-blink{0%,80%,100%{opacity:.2;}40%{opacity:1;}}',
    /* live step thread */
    '.ce-steps{align-self:flex-start;display:flex;flex-direction:column;gap:6px;padding:6px 4px 6px 14px;font-size:12px;line-height:1.35;max-width:90%;}',
    '.ce-step{display:flex;align-items:center;gap:9px;color:#7c8693;transition:color .25s ease,opacity .25s ease;}',
    '.ce-step-dot{width:6px;height:6px;border-radius:50%;background:#3f4854;flex-shrink:0;transition:background .25s ease,box-shadow .25s ease;}',
    '.ce-step-text{font-family:"Hanken Grotesk",sans-serif;font-weight:400;letter-spacing:0.005em;}',
    '.ce-step-done{color:#5a6571;opacity:.72;}',
    '.ce-step-done .ce-step-dot{background:#4a5360;}',
    '.ce-step-in_progress{color:#e8edf3;}',
    '.ce-step-in_progress .ce-step-dot{background:__ACCENT__;box-shadow:0 0 10px __ACCENT__;animation:ce-breathe 1.5s ease-in-out infinite;}',
    '@keyframes ce-breathe{0%,100%{opacity:.55;transform:scale(0.92);}50%{opacity:1;transform:scale(1.12);}}',
    '.ce-steps-settled .ce-step{opacity:.5;}',
    '.ce-input{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06);background:#0d1219;}',
    '.ce-input textarea{flex:1;resize:none;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:#e8edf3;border-radius:12px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;max-height:120px;line-height:1.4;}',
    '.ce-input textarea::placeholder{color:#6b7785;}',
    '.ce-input textarea:focus{border-color:__ACCENT__;background:rgba(255,255,255,0.05);}',
    '.ce-input button{appearance:none;border:0;background:__ACCENT__;color:#fff;width:40px;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;}',
    '.ce-input button:disabled{opacity:.4;cursor:not-allowed;}',
    '.ce-footer{padding:8px 14px;font-size:10px;color:#5a6571;text-align:center;border-top:1px solid rgba(255,255,255,0.04);letter-spacing:0.06em;text-transform:uppercase;}',
    /* corner:embeddable-agents/support N3-r2 — light-theme overrides.
       Triggered when the widget script tag has data-theme="light", which
       adds .ce-theme-light to the panel. Tokens flip from the default
       deep-ink dark surface to a clean light surface that matches the
       dashboard's light theme. Accent stays the same per host config. */
    '.ce-panel.ce-theme-light{background:#ffffff;color:#0f172a;border:1px solid rgba(15,23,42,0.08);box-shadow:0 24px 60px rgba(15,23,42,0.18),0 2px 6px rgba(15,23,42,0.06);}',
    '.ce-panel.ce-theme-light .ce-header{background:linear-gradient(180deg,rgba(229,69,31,0.08) 0%,rgba(255,255,255,0) 100%);border-bottom:1px solid rgba(15,23,42,0.06);}',
    '.ce-panel.ce-theme-light .ce-title{color:#0f172a;}',
    '.ce-panel.ce-theme-light .ce-log{background:#f8fafc;}',
    '.ce-panel.ce-theme-light .ce-msg-agent{background:#ffffff;color:#0f172a;border:1px solid rgba(15,23,42,0.08);}',
    '.ce-panel.ce-theme-light .ce-input{background:#ffffff;border-top:1px solid rgba(15,23,42,0.06);}',
    '.ce-panel.ce-theme-light .ce-input textarea{background:#f1f5f9;border:1px solid rgba(15,23,42,0.10);color:#0f172a;}',
    '.ce-panel.ce-theme-light .ce-input textarea::placeholder{color:#94a3b8;}',
    '.ce-panel.ce-theme-light .ce-input textarea:focus{background:#ffffff;}',
    '.ce-panel.ce-theme-light .ce-footer{color:#94a3b8;border-top:1px solid rgba(15,23,42,0.05);}',
    '.ce-panel.ce-theme-light .ce-step{color:#94a3b8;}',
    '.ce-panel.ce-theme-light .ce-step-done{color:#cbd5e1;}',
    '.ce-panel.ce-theme-light .ce-step-done .ce-step-dot{background:#cbd5e1;}',
    '.ce-panel.ce-theme-light .ce-step-in_progress{color:#0f172a;}',
    '.ce-panel.ce-theme-light .ce-typing span{background:#94a3b8;}',
  ].join('')
})()
