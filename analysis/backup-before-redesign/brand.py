import sys,re
FONT='''<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700;800&display=swap">
  '''
for p in sys.argv[1:]:
    s=open(p,encoding='utf-8').read(); o=s
    if 'Atkinson+Hyperlegible' not in s:
        s=re.sub(r'(<link rel="stylesheet" href="[^"]*style\.css">)', lambda m: FONT+m.group(1), s, count=1)
    if 'site-brand' not in s:
        s=re.sub(r'(<div class="site-nav-inner">\s*\n)(\s*)', lambda m: m.group(1)+m.group(2)+'<a href="/" class="site-brand" aria-label="CalendRx home"><img src="/website-icon.png" alt="" width="30" height="30"><span>CalendRx</span></a>\n'+m.group(2), s, count=1)
    if s!=o: open(p,'w',encoding='utf-8').write(s); print('updated',p)
    else: print('unchanged',p)
