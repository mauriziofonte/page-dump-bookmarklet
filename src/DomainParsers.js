function _parseReputation(s) {
    if (!s) return 0
    s = s.trim().toLowerCase().replace(/,/g, '')
    if (s.endsWith('k')) return Math.round(parseFloat(s.slice(0, -1)) * 1000)
    if (s.endsWith('m')) return Math.round(parseFloat(s.slice(0, -1)) * 1000000)
    return parseInt(s, 10) || 0
}

export const StackOverflowParser = {
    name: 'stackoverflow',
    matches: function (h) { return /stackoverflow|stackexchange|superuser|serverfault|askubuntu/.test(h) },
    parse: function (root) {
        const posts = [], self = this
        const q = root.querySelector('.question')
        if (q) posts.push(this._parsePost(q, 'question'))
        root.querySelectorAll('.answer').forEach(function (a) { posts.push(self._parsePost(a, 'answer')) })
        return posts
    },

    _parsePost: function (el, type) {
        const post = { type: type, content: '', author: { name: '', url: '', reputation: 0, badges: { gold: 0, silver: 0, bronze: 0 } }, date: '', votes: 0, accepted: false, comments: [] }
        const bodyEl = el.querySelector('.js-post-body, .s-prose')
        if (bodyEl) post.content = bodyEl.innerHTML
        const voteEl = el.querySelector('.js-vote-count')
        if (voteEl) post.votes = parseInt(voteEl.textContent.trim(), 10) || 0
        const userDetails = el.querySelectorAll('.user-details')
        if (userDetails.length > 0) {
            const authorEl = userDetails[userDetails.length - 1]
            const authorLink = authorEl.querySelector('a[href*="/users/"]')
            if (authorLink) {
                post.author.name = authorLink.textContent.trim()
                post.author.url = authorLink.getAttribute('href') || ''
                if (post.author.url && !post.author.url.startsWith('http')) post.author.url = 'https://stackoverflow.com' + post.author.url
            }
            const userInfo = authorEl.closest('.user-info') || authorEl.parentElement
            if (userInfo) {
                const repEl = userInfo.querySelector('.reputation-score, [title*="reputation"]')
                if (repEl) post.author.reputation = _parseReputation(repEl.textContent)
                userInfo.querySelectorAll('.badge1, .badge2, .badge3').forEach(function (b) {
                    const n = parseInt(b.textContent.trim(), 10) || 0
                    if (b.classList.contains('badge1')) post.author.badges.gold = n
                    else if (b.classList.contains('badge2')) post.author.badges.silver = n
                    else if (b.classList.contains('badge3')) post.author.badges.bronze = n
                })
            }
            const timeEl = authorEl.querySelector('.relativetime')
            if (timeEl) post.date = timeEl.getAttribute('title') || timeEl.textContent.trim()
        }
        if (type === 'answer' && el.classList.contains('accepted-answer')) post.accepted = true
        el.querySelectorAll('.comment').forEach(function (c) {
            const comment = { type: 'comment', content: '', author: '', date: '' }
            const body = c.querySelector('.comment-body')
            if (body) comment.content = body.textContent.trim()
            const user = c.querySelector('.comment-user')
            if (user) comment.author = user.textContent.trim()
            const time = c.querySelector('.relativetime, time')
            if (time) comment.date = time.getAttribute('title') || time.textContent.trim()
            if (comment.content) post.comments.push(comment)
        })
        return post
    },

    _formatAuthor: function (a) {
        if (!a || !a.name) return 'Unknown'
        let h = a.url ? '<a href="' + a.url + '">' + a.name + '</a>' : a.name
        if (a.reputation > 0) h += ' - Rep: ' + a.reputation.toLocaleString()
        const b = a.badges
        if (b && (b.gold || b.silver || b.bronze)) {
            const parts = []
            if (b.gold) parts.push('G' + b.gold)
            if (b.silver) parts.push('S' + b.silver)
            if (b.bronze) parts.push('B' + b.bronze)
            h += ' [' + parts.join('/') + ']'
        }
        return h
    },

    toHtml: function (posts) {
        let html = ''
        const self = this
        posts.forEach(function (p) {
            const isQ = p.type === 'question'
            html += '<div class="' + p.type + '">\n<h2>' + (isQ ? 'Question' : 'Answer' + (p.accepted ? ' (Accepted)' : '')) + '</h2>\n'
            html += '<p><strong>' + (isQ ? 'Asked' : 'Answered') + ' by:</strong> ' + self._formatAuthor(p.author) + '</p>\n'
            if (p.date) html += '<p><strong>Date:</strong> ' + p.date + '</p>\n'
            html += '<p><strong>Votes:</strong> ' + p.votes + '</p>\n<div class="content">' + p.content + '</div>\n'
            if (p.comments && p.comments.length) {
                html += '<div class="comments">\n<h4>Comments:</h4>\n'
                p.comments.forEach(function (c) { html += '<p><em>' + c.author + '</em>' + (c.date ? ' (' + c.date + ')' : '') + ': ' + c.content + '</p>\n' })
                html += '</div>\n'
            }
            html += '</div>\n\n'
        })
        return html
    },
}

export const DOMAIN_PARSERS = {
    'stackoverflow.com': StackOverflowParser,
    'stackexchange.com': StackOverflowParser,
    'superuser.com': StackOverflowParser,
    'serverfault.com': StackOverflowParser,
    'askubuntu.com': StackOverflowParser,
}

export function getDomainParser(hostname) {
    const domains = Object.keys(DOMAIN_PARSERS)
    for (let i = 0; i < domains.length; i++) {
        if (hostname.includes(domains[i])) {
            return DOMAIN_PARSERS[domains[i]]
        }
    }
    return null
}
