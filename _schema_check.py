import pathlib
t = pathlib.Path(r'C:\Users\Roshan Kumar\Cricket-hub-analytics-app\schema_doc_extract.txt').read_text('utf-8')
i = t.find('club')
lines = t[i:].split('\n')
print('CLUB TABLE:')
for l in lines[:30]:
    print(l)
