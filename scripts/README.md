Command Line Powered Script to download posts from depop

python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install

python download_from_depop.py