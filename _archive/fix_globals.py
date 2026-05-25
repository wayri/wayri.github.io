import re

with open('extracted_inline_clean.js', 'r', encoding='utf-8') as f:
    clean_js = f.read()

wmap_match = re.search(r'const _WMAP = \{.*?\};', clean_js, re.DOTALL)
wmap_str = wmap_match.group(0) if wmap_match else "const _WMAP = {};"

with open('assets/js/tools.js', 'r', encoding='utf-8') as f:
    tools_js = f.read()

tools_js = tools_js.replace("let _WMAP = null;", wmap_str)
tools_js = tools_js.replace("// Serial\\nwindow.serialDataArr = [];", "// Serial\\nwindow.serialDataArr = [];\\nlet port = null;\\nlet reader = null;")

with open('assets/js/tools.js', 'w', encoding='utf-8') as f:
    f.write(tools_js)

print("Globals injected successfully")
