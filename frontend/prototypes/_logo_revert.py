import re, io, os

files = [
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\index.html",
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\article-list.html",
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\article-detail.html",
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\resume.html",
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\digital-life.html",
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\about-me.html",
    r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\xiaoji.html",
]

CSS_OLD = ".brand-mark svg, .brand-mark img { width: 100%; height: 100%; display: block; }"
CSS_NEW = ".brand-mark svg { width: 100%; height: 100%; display: block; }"

SVG_BLOCK = (
    '<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">\n'
    '  <rect width="28" height="28" rx="8" fill="#2d8264"/>\n'
    '  <circle cx="14" cy="9" r="3.2" fill="#ffffff"/>\n'
    '  <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff"/>\n'
    '  <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff"/>\n'
    '</svg>'
)

pat = re.compile(r'(\s*)<img src="logo\.png" alt="" width="30" height="30" />')

for f in files:
    with io.open(f, "r", encoding="utf-8") as fh:
        s = fh.read()
    assert CSS_OLD in s, "CSS rule not found in " + f
    s = s.replace(CSS_OLD, CSS_NEW, 1)
    n = len(pat.findall(s))
    assert n == 1, "expected exactly 1 logo img in %s, found %d" % (f, n)
    s = pat.sub(lambda m: m.group(1) + SVG_BLOCK, s)
    with io.open(f, "w", encoding="utf-8") as fh:
        fh.write(s)
    print("[ok]", os.path.basename(f))

# remove the asset we added
lp = r"C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\logo.png"
if os.path.exists(lp):
    os.remove(lp)
    print("[removed] logo.png")
else:
    print("[skip] logo.png not present")

print("DONE")
