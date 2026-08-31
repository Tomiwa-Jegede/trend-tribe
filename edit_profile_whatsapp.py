import re

path = "frontend/src/pages/EditProfilePage.jsx"

with open(path, "r") as f:
    content = f.read()

edits = []

old1 = '  const [error, setError] = useState("");\n'
new1 = '  const [error, setError] = useState("");\n  const [whatsappError, setWhatsappError] = useState("");\n'
edits.append((old1, new1))

old2 = '''                  value={form.whatsapp}
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                />
              </div>'''
new2 = '''                  value={form.whatsapp}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, whatsapp: e.target.value }));
                    setWhatsappError("");
                  }}
                />
                {whatsappError && (
                  <p className="text-accent-600 text-sm mt-1">{whatsappError}</p>
                )}
              </div>'''
edits.append((old2, new2))

old3 = '''  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const fields = { ...form };'''
new3 = '''  const handleSave = async () => {
    setError("");
    setWhatsappError("");
    if (
      form.whatsapp.trim() &&
      !/^(\\+234|0)[789][01]\\d{8}$/.test(form.whatsapp.trim())
    ) {
      setWhatsappError("Enter a valid Nigerian phone number (e.g. 08012345678)");
      return;
    }
    setSaving(true);
    try {
      const fields = { ...form };'''
edits.append((old3, new3))

warnings = []
for old, new in edits:
    count = content.count(old)
    if count != 1:
        warnings.append(f"NO MATCH or multiple matches (found {count}) for block starting: {old[:60]!r}")
    else:
        content = content.replace(old, new)

if warnings:
    print("WARNINGS — nothing was written:")
    for w in warnings:
        print(" -", w)
else:
    with open(path, "w") as f:
        f.write(content)
    print("All 3 edits applied successfully.")
