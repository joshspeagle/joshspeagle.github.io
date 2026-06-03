"""Software & Code page content (redesign). generate_content(data) -> inner HTML for #software-content."""
from collections import Counter
from pages_shared import scaffold, esc, attr_esc

_LANG = {"Python": "python", "JavaScript": "javascript"}
_LABEL = {"python": "Python", "javascript": "JavaScript", "other": "Other"}


def _tool_card(t):
    name = esc(t.get("name", ""))
    role = esc(t.get("role", ""))
    lang = t.get("language", "")
    slug = _LANG.get(lang, "other")
    when = esc(lang) + (f" · ★{esc(t['stars'])}" if t.get("stars") else "")
    install = t.get("install")
    install_html = f'<div class="install">$ {esc(install)}</div>' if install else ""
    links = []
    if t.get("github"):
        links.append(f'<a class="reslink" href="{t["github"]}" target="_blank" rel="noopener">GitHub</a>')
    if t.get("docs"):
        links.append(f'<a class="reslink" href="{t["docs"]}" target="_blank" rel="noopener">Docs</a>')
    if t.get("paper"):
        links.append(f'<a class="reslink" href="{t["paper"]}" target="_blank" rel="noopener">Paper</a>')
    feat = '<span class="tag feat">★ Featured</span>' if t.get("featured") else ""
    search = attr_esc(f'{t.get("name","")} {t.get("role","")} {lang}')
    return (
        f'<article class="item accent-violet" data-lv-item data-cat="{slug}" data-search="{search}" data-title="{attr_esc(t.get("name",""))}">'
        f'<div class="item-head"><h3 class="item-title">{name}</h3><span class="item-when">{when}</span></div>'
        f'<div class="item-meta">{role}</div>'
        f'{install_html}'
        f'<div class="item-tags">{feat}<span class="item-links">{"".join(links)}</span></div>'
        f'</article>'
    )


def generate_content(data):
    tools = data["sections"]["software"].get("tools", [])
    items = "".join(_tool_card(t) for t in tools)
    counts = Counter(_LANG.get(t.get("language", ""), "other") for t in tools)
    filters = [(k, _LABEL.get(k, k.title()), counts[k]) for k in counts]
    return scaffold(items, filters, len(tools), sorts=None, batch=0,
                    search_ph="Search tools…", default_sort="default")
