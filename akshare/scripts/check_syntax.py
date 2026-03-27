#!/usr/bin/env python3
"""
Type checking and validation script for akshare MCP.

This script validates the code without actually running it.
"""

import ast
import sys
from pathlib import Path


def check_python_syntax(file_path: str) -> bool:
    """Check Python syntax of a file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
        ast.parse(source)
        print(f"✓ {file_path}: Syntax OK")
        return True
    except SyntaxError as e:
        print(f"✗ {file_path}: Syntax Error - {e}")
        return False
    except Exception as e:
        print(f"✗ {file_path}: Error - {e}")
        return False


def main():
    """Check syntax of all Python files."""
    # Get all Python files in current directory
    py_files = [
        "akshare_client.py",
        "errors.py",
        "schemas.py",
        "stock_quotes_service.py",
        "tool_registration.py",
        "server.py",
        "index.py",
        "example.py",
        "__init__.py",
        "__main__.py",
    ]

    print("=== Checking Python Syntax ===\n")
    
    all_ok = True
    for py_file in py_files:
        if Path(py_file).exists():
            if not check_python_syntax(py_file):
                all_ok = False
        else:
            print(f"⚠ {py_file}: File not found")
    
    print("\n=== Summary ===")
    if all_ok:
        print("✓ All files passed syntax check")
        return 0
    else:
        print("✗ Some files have syntax errors")
        return 1


if __name__ == "__main__":
    sys.exit(main())
