import toastify from 'toastify-js'
import copy from 'copy-to-clipboard'
import { escapeHTML } from './Utilities.js'

const STYLE_ID = 'pagedump-toastify-styles'
const TOAST_CSS =
    '.pagedump-toast{padding:12px 20px;color:#fff;display:inline-block;box-shadow:0 3px 6px -1px rgba(0,0,0,.12),0 10px 36px -4px rgba(77,96,232,.3);background:-webkit-linear-gradient(315deg,#73a5ff,#5477f5);background:linear-gradient(135deg,#73a5ff,#5477f5);position:fixed;opacity:0;transition:all .4s cubic-bezier(.215,.61,.355,1);border-radius:2px;text-decoration:none;max-width:calc(50% - 20px);z-index:2147483647;font-family:monospace;font-size:14px;line-height:1.4}.pagedump-toast b{font-weight:bold;text-transform:uppercase;display:inline-block;margin-right:3px}.pagedump-toast a{color:#FFF;text-decoration:none;display:inline-block;margin-right:3px}.pagedump-toast a:hover{text-decoration:underline}.pagedump-toast a:last-child{margin-right:0}.pagedump-toast.on{opacity:1}.pagedump-toast .toast-close{background:transparent;border:0;color:#fff;cursor:pointer;font-family:inherit;font-size:1em;opacity:.4;padding:0 5px}.pagedump-toast.toastify-right{right:15px}.pagedump-toast.toastify-left{left:15px}.pagedump-toast.toastify-top{top:-150px}.pagedump-toast.toastify-bottom{bottom:-150px}.pagedump-toast.toastify-rounded{border-radius:25px}.pagedump-toast .toastify-avatar{width:1.5em;height:1.5em;margin:-7px 5px;border-radius:2px}.pagedump-toast.toastify-center{margin-left:auto;margin-right:auto;left:0;right:0;max-width:fit-content;max-width:-moz-fit-content}@media only screen and (max-width: 360px){.pagedump-toast.toastify-right,.pagedump-toast.toastify-left{margin-left:auto;margin-right:auto;left:0;right:0;max-width:fit-content}}'

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
 * Displays an error message toast.
 * @param {string} message - The error message to display.
 */
export function showError(message) {
    toastify({
        backgroundColor: '#f82f3f',
        className: 'pagedump-toast',
        escapeMarkup: false,
        text: `<b>pagedump</b> ${message}`,
        duration: 3000,
        stopOnFocus: true,
        close: true,
        gravity: 'top',
        position: 'right',
    }).showToast()
}

/**
 * Displays the main export options toast with download and copy links.
 * @param {{mdText: string, htmlText: string, txtText: string, filename: string}} options
 */
export function showExportOptions(options) {
    const mdBlob = new Blob([options.mdText], { type: 'text/markdown' })
    const htmlBlob = new Blob([options.htmlText], { type: 'text/html' })
    const txtBlob = new Blob([options.txtText], { type: 'text/plain' })
    const mdUrl = URL.createObjectURL(mdBlob)
    const htmlUrl = URL.createObjectURL(htmlBlob)
    const txtUrl = URL.createObjectURL(txtBlob)

    const toastText = `
            <b>pagedump</b>
            <a href="${mdUrl}" download="${options.filename}.md">Save MD</a>
            <a href="${htmlUrl}" download="${options.filename}.html">Save HTML</a>
            <a href="${txtUrl}" download="${options.filename}.txt">Save TXT</a>
            <a href="#" data-text="${escapeHTML(options.mdText)}">Copy MD</a>
            <a href="#" data-text="${escapeHTML(options.htmlText)}">Copy HTML</a>
            <a href="#" data-text="${escapeHTML(options.txtText)}">Copy TXT</a>
        `

    const toast = toastify({
        backgroundColor: '#71979a',
        className: 'pagedump-toast',
        escapeMarkup: false,
        text: toastText,
        duration: -1, // Stays until closed
        stopOnFocus: true,
        close: true,
        gravity: 'top',
        position: 'right',
    })
    toast.showToast()

    // Add listeners for copy buttons after a short delay for the element to render.
    setTimeout(() => {
        const toastEl = toast.toastElement
        if (toastEl) {
            toastEl.querySelectorAll('a[data-text]').forEach((a) => {
                a.addEventListener('click', (e) => {
                    e.preventDefault()
                    copy(a.getAttribute('data-text'))
                    toast.hideToast()
                    toastify({
                        text: '<b>pagedump</b> Copied to clipboard!',
                        className: 'pagedump-toast',
                        backgroundColor: '#28a745',
                        escapeMarkup: false,
                        duration: 2000,
                    }).showToast()
                })
            })
        }
    }, 100)
}
