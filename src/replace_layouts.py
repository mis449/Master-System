
import os
import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace import
    # import AdminLayout from "../../components/layout/AdminLayout.jsx"
    # import AdminLayout from "../../components/layout/AdminLayout"
    # import AdminLayout from "../components/layout/AdminLayout"
    
    content = re.sub(r'import AdminLayout from [\'"](.*?)AdminLayout([\.jsx]*?)[\'"]', r'import ERPLayout from "\1ERPLayout"', content)
    
    # Replace JSX tags
    content = content.replace('<AdminLayout>', '<ERPLayout>')
    content = content.replace('</AdminLayout>', '</ERPLayout>')
    content = content.replace('<AdminLayout ', '<ERPLayout ')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

pages_dir = r'c:\Users\acer\Desktop\Supabase-Checklist-Final\Supabase-Checklist\src\pages'
for root, dirs, files in os.walk(pages_dir):
    for file in files:
        if file.endswith('.jsx'):
            replace_in_file(os.path.join(root, file))

print("Done replacing AdminLayout with ERPLayout in pages directory.")
