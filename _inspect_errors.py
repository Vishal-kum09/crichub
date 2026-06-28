import pathlib
base = pathlib.Path(r'C:\Users\Roshan Kumar\Cricket-hub-analytics-app')

# Inspect SuperAdmin.tsx
sa_path = base / 'Cricket analytics web app (1)' / 'src' / 'app' / 'pages' / 'SuperAdmin.tsx'
sa_lines = sa_path.read_text('utf-8').split('\n')
print('=== SuperAdmin.tsx key lines ===')
for i, l in enumerate(sa_lines):
    if any(k in l for k in ['PlatformStats', 'totalPlayers', 'totalClubs', 'totalMatches', 'totalTournaments']):
        print(f'{i+1}: {l}')

# Check ClubAdmin.tsx first 80 lines
ca_path = base / 'Cricket analytics web app (1)' / 'src' / 'app' / 'pages' / 'ClubAdmin.tsx'
ca_lines = ca_path.read_text('utf-8').split('\n')
print('\n=== ClubAdmin.tsx first 80 lines ===')
for i, l in enumerate(ca_lines[:80], 1):
    print(f'{i}: {l}')
