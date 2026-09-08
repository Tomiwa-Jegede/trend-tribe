import pathlib

path = pathlib.Path("src/pages/GigsPage.jsx")
text = path.read_text()

old = '<div className="mt-4 grid grid-cols-2 sm:flex gap-3">'
new = '<div className="mt-4 grid grid-cols-1 sm:flex gap-3">'

count = text.count(old)
if count != 1:
    raise SystemExit(f"Expected 1 match, found {count}. Aborting, no changes written.")

text = text.replace(old, new)
path.write_text(text)
print("Fixed Top Up / Withdraw row to stack full-width on mobile.")
