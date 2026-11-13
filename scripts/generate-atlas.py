"""Original vector artwork. Run with Python 3; no dependencies or downloaded assets."""
from pathlib import Path
from html import escape
OUT = Path(__file__).resolve().parents[1] / 'public' / 'illustrations'
OUT.mkdir(parents=True, exist_ok=True)
worlds = {'earth':('Tierra','#287cba','#9ae1ee'), 'moon':('Luna','#8c939e','#e4e3d8'), 'mercury':('Mercurio','#958471','#dfc6a6'), 'venus':('Venus','#c7924e','#ffe0a2'), 'mars':('Marte','#b94b2e','#ffc089'), 'jupiter':('Júpiter','#c19170','#f7dbb3'), 'saturn':('Saturno','#c4ab74','#fff1b9'), 'europa':('Europa','#a19481','#ece8d4'), 'titan':('Titán','#a17039','#eeca83'), 'uranus':('Urano','#64b0b9','#c7f5ee'), 'neptune':('Neptuno','#285cbd','#82b9ff'), 'sun':('Sol','#eb7928','#fff1a4'), 'asteroid':('Asteroide','#777e8c','#bdc8cf')}
for key,(name,base,light) in worlds.items():
    detail=''
    if key=='earth':
        detail='<g fill="#639b7c"><path d="M151 80l44 7 18 18-10 21-24 4-7 28-24-9-10-25z"/><path d="M192 149l25 7 18 30-16 45-14 14-10-39-16-30z"/><path d="M246 78l37 1 44 26-6 27-40-8-12 26-28-10-22-29z"/><path d="M248 146l33 13 7 34-30 32-18-41z"/><path d="M302 211l28-7 17 21-31 12z"/></g><g fill="none" stroke="#e9fbff" opacity=".65" stroke-width="7"><path d="M133 107q50-28 100-4t100-10M141 183q40-15 80 4m49 32q30 11 64-3M171 69q69-19 130 4"/></g>'
    elif key in ['jupiter','saturn','venus','uranus','neptune','titan']:
        for i in range(9):
            y=70+i*23;detail+=f'<path d="M122 {y}q65 -17 118 0t120-4" stroke="{light if i%2 else base}" stroke-width="{7+i%3*4}" opacity=".48" fill="none"/>'
        if key=='jupiter':detail+='<ellipse cx="284" cy="195" rx="25" ry="12" fill="#a85b40" transform="rotate(-9 284 195)"/>'
        if key=='neptune':detail+='<ellipse cx="210" cy="135" rx="21" ry="9" fill="#24467e"/>'
    elif key=='sun':
        for i in range(14):detail+=f'<path d="M{135+i*12} 100q30 35 0 64t5 63" fill="none" stroke="#ffd46b" stroke-width="4" opacity=".3"/>'
    elif key=='europa':
        detail='<g stroke="#836451" stroke-width="2" fill="none" opacity=".7"><path d="M143 82l73 100 60-38 63 76M180 63l24 79-40 90M277 64l-26 62 54 60-53 62M132 171l97 25 94-83"/></g>'
    else:
        for i in range(18):
            x=150+(i*47)%180;y=73+(i*67)%170;r=5+(i*3)%16
            detail+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="#000" opacity=".13"/><path d="M{x-r} {y}a{r} {r} 0 0 1 {2*r} 0" fill="none" stroke="{light}" opacity=".4" stroke-width="2"/>'
        if key=='mars':detail+='<path d="M140 172l72-13 35 20 67-8 32 17" fill="none" stroke="#713a2e" stroke-width="8" opacity=".7"/>'
    rings='<ellipse cx="240" cy="165" rx="189" ry="45" transform="rotate(-22 240 165)" fill="none" stroke="#c9b88d" stroke-width="24" opacity=".7"/>' if key=='saturn' else ''
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" role="img" aria-labelledby="title desc"><title id="title">{escape(name)}</title><desc id="desc">Ilustración vectorial original y estilizada; no es una fotografía ni un mapa científico.</desc><defs><radialGradient id="body" cx="28%" cy="24%" r="80%"><stop stop-color="{light}"/><stop offset=".55" stop-color="{base}"/><stop offset="1" stop-color="#091322"/></radialGradient><linearGradient id="shade"><stop offset=".45" stop-color="#050c17" stop-opacity="0"/><stop offset="1" stop-color="#050c17" stop-opacity=".85"/></linearGradient><clipPath id="disk"><circle cx="240" cy="160" r="106"/></clipPath></defs><ellipse cx="240" cy="166" rx="215" ry="109" fill="none" stroke="#84acc4" stroke-opacity=".16" transform="rotate(-22 240 166)"/>{rings}<circle cx="240" cy="160" r="110" fill="{light}" opacity=".09"/><circle cx="240" cy="160" r="106" fill="url(#body)"/><g clip-path="url(#disk)">{detail}<circle cx="240" cy="160" r="106" fill="url(#shade)"/></g><g fill="#b9d6e7"><circle cx="56" cy="66" r="1.5"/><circle cx="389" cy="44" r="1"/><circle cx="414" cy="232" r="1.5"/><circle cx="90" cy="253" r="1"/></g></svg>'''
    (OUT/f'{key}.svg').write_text(svg)
(OUT/'README.md').write_text('# Atlas vectorial\n\nIlustraciones originales de ORBITAL COMMAND, generadas mediante `python3 scripts/generate-atlas.py`. Son SVG estáticos sin scripts ni recursos externos; no son fotografías ni mapas científicos. Las texturas NASA/JPL del entorno 3D conservan sus créditos en `../textures/README.md`.\n')
