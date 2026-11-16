const STYLE_ID = 'pagedump-toast-styles'
const TOAST_CSS =
    '.pagedump-toast{position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;align-items:center;flex-wrap:wrap;gap:8px;max-width:calc(100% - 32px);padding:10px 14px;color:#fff;border-radius:12px;box-shadow:0 10px 30px -5px rgba(0,0,0,.35);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.4;opacity:0;transform:translateY(-8px);transition:opacity .25s ease,transform .25s ease}' +
    '.pagedump-toast.on{opacity:1;transform:translateY(0)}' +
    '.pagedump-toast b{font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding-right:10px;border-right:1px solid rgba(255,255,255,.35)}' +
    '.pagedump-toast a{color:#fff;text-decoration:none;background:rgba(255,255,255,.16);padding:5px 12px;border-radius:999px;white-space:nowrap;transition:background .15s ease}' +
    '.pagedump-toast a:hover{background:rgba(255,255,255,.32)}' +
    '.pagedump-toast .toast-close{background:transparent;border:0;color:#fff;cursor:pointer;font-family:inherit;font-size:14px;line-height:1;opacity:.5;padding:2px 4px}' +
    '.pagedump-toast .toast-close:hover{opacity:1}'

// Violet/indigo: tells PageDump apart from ChatDump (teal) at a glance. Error/success colors are shared.
const BG_MAIN = 'linear-gradient(135deg,#7c3aed,#4338ca)'
const BG_STATUS = 'linear-gradient(135deg,#475569,#1e293b)'
const BG_ERROR = 'linear-gradient(135deg,#ef4444,#b91c1c)'
const BG_SUCCESS = 'linear-gradient(135deg,#22c55e,#15803d)'

/**
 * Injects the necessary CSS for toast notifications into the document head.
 * Ensures the CSS is only injected once.
 */
export function initUI() {
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = TOAST_CSS
        document.head.appendChild(style)
    }
}

/**
 * Creates a DOM element with text content and attributes.
 * Toast content is built with DOM APIs (never HTML strings): innerHTML and
 * DOMParser are Trusted Types sinks blocked by CSP on many sites.
 * @param {string} tag - The tag name.
 * @param {string} text - The text content.
 * @param {Object<string, string>} [attrs] - Attributes to set.
 * @returns {HTMLElement} The created element.
 */
function makeEl(tag, text, attrs) {
    const el = document.createElement(tag)
    el.textContent = text
    for (const key in attrs || {}) {
        el.setAttribute(key, attrs[key])
    }
    return el
}

/**
 * Hides and removes a toast element.
 * @param {HTMLElement} el - The toast element.
 */
function hideToast(el) {
    el.classList.remove('on')
    setTimeout(() => el.remove(), 400)
}

/**
 * Shows a toast notification. Any previous toast is replaced.
 * @param {Node[]} children - Content nodes of the toast.
 * @param {string} background - CSS background for the toast.
 * @param {number} duration - Auto-hide delay in ms; -1 keeps the toast until closed.
 * @returns {HTMLElement} The toast element.
 */
function showToast(children, background, duration) {
    document.querySelectorAll('.pagedump-toast').forEach((t) => t.remove())

    const el = document.createElement('div')
    el.className = 'pagedump-toast'
    el.style.background = background
    children.forEach((c) => el.appendChild(c))

    const close = makeEl('button', '✖', { class: 'toast-close' })
    close.addEventListener('click', () => hideToast(el))
    el.appendChild(close)

    document.body.appendChild(el)
    requestAnimationFrame(() => el.classList.add('on'))
    if (duration > 0) {
        setTimeout(() => hideToast(el), duration)
    }
    return el
}

/**
 * Copies text to the clipboard, with a legacy execCommand fallback.
 * @param {string} text - The text to copy.
 */
function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
        return
    }
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
}

/**
 * Displays an error message toast.
 * @param {string} message - The error message to display.
 */
export function showError(message) {
    showToast([makeEl('b', 'pagedump'), makeEl('span', message)], BG_ERROR, 3000)
}

/**
 * Displays a persistent status toast (e.g. while data is loading); the next toast replaces it.
 * @param {string} message - The status message to display.
 */
export function showStatus(message) {
    showToast([makeEl('b', 'pagedump'), makeEl('span', message)], BG_STATUS, -1)
}

/**
 * A pill running an async job (e.g. a ZIP built on demand). run(setLabel) reports progress through
 * setLabel and resolves to {blob, filename, label}: the pill then becomes a real download link.
 * @param {{label: string, run: function(function(string)): Promise<{blob: Blob, filename: string, label: string}>}} action
 * @returns {HTMLElement}
 */
function actionLink(action) {
    const a = makeEl('a', action.label, { href: '#' })
    a.addEventListener('click', async (e) => {
        if (a.download) return // ready: native download
        e.preventDefault()
        if (a.dataset.busy) return
        a.dataset.busy = '1'
        try {
            const res = await action.run((text) => { a.textContent = text })
            a.href = URL.createObjectURL(res.blob)
            a.download = res.filename
            a.textContent = res.label
            a.click()
        } catch (err) {
            a.textContent = action.label
            showError((err && err.message) || String(err))
        } finally {
            delete a.dataset.busy
        }
    })
    return a
}

/**
 * Displays the main export options toast with download and copy links.
 * @param {{mdText: string, htmlText: string, txtText: string, filename: string, actions?: Array}} options
 */
export function showExportOptions(options) {
    const blobUrl = (text, type) => URL.createObjectURL(new Blob([text], { type }))

    const copyLink = (label, text) => {
        const a = makeEl('a', label, { href: '#' })
        a.addEventListener('click', (e) => {
            e.preventDefault()
            copyText(text)
            hideToast(a.closest('.pagedump-toast'))
            showToast([makeEl('b', 'pagedump'), makeEl('span', 'Copied to clipboard!')], BG_SUCCESS, 2000)
        })
        return a
    }

    showToast(
        [
            makeEl('b', 'pagedump'),
            makeEl('a', 'Save as MD', { href: blobUrl(options.mdText, 'text/markdown'), download: `${options.filename}.md` }),
            makeEl('a', 'Save as HTML', { href: blobUrl(options.htmlText, 'text/html'), download: `${options.filename}.html` }),
            makeEl('a', 'Save as TXT', { href: blobUrl(options.txtText, 'text/plain'), download: `${options.filename}.txt` }),
            copyLink('Copy as MD', options.mdText),
            copyLink('Copy as HTML', options.htmlText),
            copyLink('Copy as TXT', options.txtText),
        ].concat((options.actions || []).map(actionLink)),
        BG_MAIN,
        -1,
    )
}
