import re

with open('extract_functions.py', 'r', encoding='utf-8') as f:
    script = f.read()

script = script.replace(\"if 'toggleMaximize' in merged_funcs:\\n        del merged_funcs['toggleMaximize']\", \"\"\"if 'toggleMaximize' in merged_funcs:
        del merged_funcs['toggleMaximize']
    if 'toggleTheme' in merged_funcs:
        del merged_funcs['toggleTheme']
    if 'initSteampunkWidget' in merged_funcs:
        del merged_funcs['initSteampunkWidget']
    if 'drawSteampunkScope' in merged_funcs:
        del merged_funcs['drawSteampunkScope']
    if 'triggerAnomaly' in merged_funcs:
        del merged_funcs['triggerAnomaly']
    if 'updateSteampunkClock' in merged_funcs:
        del merged_funcs['updateSteampunkClock']\"\"\")

with open('extract_functions.py', 'w', encoding='utf-8') as f:
    f.write(script)
print("Updated extract_functions.py")
