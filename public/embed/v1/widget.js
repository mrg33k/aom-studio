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

  var VISITOR_KEY = 'corner_embed_visitor_v1'
  function visitorId() {
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

  function waitForReply(sinceTs, onReply, opts) {
    var t0 = Date.now()
    var maxMs = (opts && opts.maxMs) || 60000
    var intervalMs = (opts && opts.intervalMs) || 1500
    var cancelled = false
    function tick() {
      if (cancelled) return
      pollMessages(sinceTs)
        .then(function (resp) {
          var msgs = (resp && resp.messages) || []
          if (msgs.length) {
            onReply(null, msgs)
            return
          }
          if (Date.now() - t0 > maxMs) {
            onReply(new Error('timeout'), [])
            return
          }
          setTimeout(tick, intervalMs)
        })
        .catch(function (err) {
          if (Date.now() - t0 > maxMs) {
            onReply(err, [])
            return
          }
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

    var inline = config.placement && config.placement.mode === 'inline'
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
    panel.className = inline ? 'ce-panel ce-panel-inline' : 'ce-panel ce-panel-bubble'
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

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var content = textarea.value.trim()
      if (!content) return
      addMsg('visitor', content)
      textarea.value = ''
      textarea.style.height = 'auto'
      sendBtn.disabled = true
      setTyping(true)

      postChat(content)
        .then(function (resp) {
          waitForReply(
            resp.since_ts,
            function (err, msgs) {
              setTyping(false)
              sendBtn.disabled = false
              if (err && (!msgs || !msgs.length)) {
                addMsg(
                  'agent',
                  err.message === 'timeout'
                    ? "The EA didn't respond in time. The message was logged — try again or check back in a minute."
                    : 'Hit a wall. Try once more?'
                )
                return
              }
              msgs.forEach(function (m) {
                addMsg('agent', m.text)
              })
            },
            { maxMs: 60000, intervalMs: 1500 }
          )
        })
        .catch(function (err) {
          setTyping(false)
          sendBtn.disabled = false
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
    '.ce-input{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06);background:#0d1219;}',
    '.ce-input textarea{flex:1;resize:none;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:#e8edf3;border-radius:12px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;max-height:120px;line-height:1.4;}',
    '.ce-input textarea::placeholder{color:#6b7785;}',
    '.ce-input textarea:focus{border-color:__ACCENT__;background:rgba(255,255,255,0.05);}',
    '.ce-input button{appearance:none;border:0;background:__ACCENT__;color:#fff;width:40px;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;}',
    '.ce-input button:disabled{opacity:.4;cursor:not-allowed;}',
    '.ce-footer{padding:8px 14px;font-size:10px;color:#5a6571;text-align:center;border-top:1px solid rgba(255,255,255,0.04);letter-spacing:0.06em;text-transform:uppercase;}',
  ].join('')
})()
