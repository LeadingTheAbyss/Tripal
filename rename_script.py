import os

files_to_modify = [
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\components\layout\AppShell.tsx",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\recommend\page.tsx",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\plan\transport\page.tsx",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\page.tsx",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\login\page.tsx",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\api\trips\route.ts",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\api\transport\route.ts",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\services\osrm_cab_api.py",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\api\auth\route.ts",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\api\auth\me\route.ts",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\src\app\api\auth\logout\route.ts",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\package.json",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\package-lock.json",
    r"c:\Users\Kamlesh Singh\Desktop\Proj\Ghumi-Ghumi\About_The_Project.md",
]

replacements = {
    "Ghumi-Ghumi": "PlanBro",
    "ghumi-ghumi": "planbro",
    "GhumiGhumi": "PlanBro",
    "ghumighumi": "planbro",
    "ghumi_session": "planbro_session"
}

for file_path in files_to_modify:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        new_content = content
        for k, v in replacements.items():
            new_content = new_content.replace(k, v)
            
        if new_content != content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {file_path}")
    else:
        print(f"File not found: {file_path}")
