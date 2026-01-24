
import re
import os

file_path = r"c:\Projets\rpe-volleyball-app\public\js\stickers.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace common and rare extensions
# Look for /img/stickers/common/anything.png and /img/stickers/rare/anything.png
def replace_extension(match):
    return match.group(0).replace(".png", ".webp")

content = re.sub(r"/img/stickers/common/.*\.png", replace_extension, content)
content = re.sub(r"/img/stickers/rare/.*\.png", replace_extension, content)

# 2. Specific Legendary replacements
replacements = {
    "/img/stickers/legendary/eline.png": "/img/stickers/legendary/eline_chevrollier.webp",
    "/img/stickers/legendary/nine.png": "/img/stickers/legendary/nine_wester.webp",
    "/img/stickers/legendary/coach_olivier.png": "/img/stickers/legendary/olivier_bouvet.webp",
    "/img/stickers/legendary/coach_alexis.png": "/img/stickers/legendary/alexis_mustiere.webp",
}

for old, new in replacements.items():
    content = content.replace(old, new)

# 3. Check for team_collectif - if it exists in folder, nice, otherwise leave as is?
# Since we didn't find it, we leave it alone or maybe user converted it and renamed it?
# Given no file matched *collectif*, it likely doesn't exist.
# However, the user said "changed ALL images". 
# Just in case, I will NOT touch team_collectif.png unless I know what it is.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated stickers.js successfully.")
