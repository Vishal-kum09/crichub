import pathlib
t = pathlib.Path(r'C:\Users\Roshan Kumar\Cricket-hub-analytics-app\schema_doc_extract.txt').read_text('utf-8')
lines = t.split('\n')
start = 0
for idx, line in enumerate(lines):
    if line.strip() == 'club':
        start = idx
        break
for i in range(start, min(start+30, len(lines))):
    print(lines[i])
