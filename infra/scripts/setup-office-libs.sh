#!/bin/bash
# Install Office document libraries on VPS
echo "Installing Office document libraries..."
pip3 install python-docx openpyxl python-pptx --break-system-packages -q
echo "✓ python-docx (Word)"
echo "✓ openpyxl (Excel)"
echo "✓ python-pptx (PowerPoint)"
echo "Done."
