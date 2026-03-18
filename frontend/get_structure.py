import os

def generate_structure():
    excludes = {
        '.git', 'node_modules', '.next', 'dist', 'build', 
        'coverage', '.vscode', '.idea', 'out'
    }
    
    # Files typically auto-generated or not manually created
    exclude_files = {
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
        '.DS_Store', 'get_structure.py', 'complete_frontend_structure.txt'
    }
    
    with open('complete_frontend_structure.txt', 'w', encoding='utf-8') as f:
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in excludes]
            
            for file in files:
                if file in exclude_files:
                    continue
                
                # Write relative path
                path = os.path.relpath(os.path.join(root, file), '.')
                
                # Double check to skip any IDE hidden folders 
                if not path.startswith('.idea') and not path.startswith('.vscode'):
                    f.write(path + '\n')

if __name__ == '__main__':
    generate_structure()
