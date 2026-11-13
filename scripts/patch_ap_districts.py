import json

district_map = {
    'VSKP': 'Visakhapatnam', 'VSP': 'Visakhapatnam',
    'EG': 'East Godavari', 'WG': 'West Godavari',
    'ATP': 'Anantapur', 'CTR': 'Chittoor',
    'KRI': 'Krishna', 'KST': 'Krishna',
    'SKL': 'Srikakulam', 'GNT': 'Guntur', 'GTR': 'Guntur',
    'NLR': 'Nellore', 'NLR_': 'Nellore',
    'KDP': 'Kadapa', 'KNL': 'Kurnool',
    'PKS': 'Prakasam', 'VZM': 'Vizianagaram'
}

for fname in ['public/data/AP_EAPCET_MPC_2025.json', 'public/data/AP_EAPCET_BIPC_2024.json']:
    with open(fname, 'r', encoding='utf-8') as f:
        d = json.load(f)
    for c in d['colleges']:
        c['district'] = district_map.get(c.get('districtCode'), c.get('districtCode'))
    with open(fname, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2)
    print(f"Updated {fname}: populated district for {len(d['colleges'])} records")
