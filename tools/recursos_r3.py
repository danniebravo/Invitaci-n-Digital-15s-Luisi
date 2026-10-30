"""Ronda 3: quitar fondos de varita de línea, rosa, palomas y sobre crema."""
import pathlib, numpy as np, cv2
from PIL import Image
from rembg import remove, new_session
ROOT=pathlib.Path(__file__).resolve().parent.parent; R=ROOT/'recursos'; A=R/'Aurora'; O=ROOT/'assets/img'
sess=new_session('birefnet-general')
def save(im,name,maxw):
    im=im.crop(im.getbbox()); im.thumbnail((maxw,maxw*2)); im.save(O/name,'WEBP',quality=88,method=6); print(name,im.size)
def darkline(path):
    """dibujo negro sobre blanco -> trazos con alfa"""
    g=np.asarray(Image.open(path).convert('L')).astype(np.float32)
    a=np.clip((235-g)/150,0,1)
    im=Image.new('RGBA',(g.shape[1],g.shape[0]),(255,255,255,0)); im.putalpha(Image.fromarray((a*255).astype(np.uint8))); return im
def split(im,min_area,dil):
    a=np.asarray(im)[...,3]; m=cv2.dilate((a>25).astype(np.uint8),np.ones((dil,dil),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m); out=[]
    for i in range(1,n):
        if st[i,4]<min_area: continue
        arr=np.array(im); arr[...,3]=arr[...,3]*(lab==i); x,y,w,h=st[i,:4]; out.append((x,Image.fromarray(arr).crop((x,y,x+w,y+h))))
    return [p for _,p in sorted(out,key=lambda t:t[0])]
save(darkline(A/'fcd386c8d2b455db03d4eefe5ec78875.jpg'),'varita-linea.png',500)
save(remove(Image.open(A/'aa8728c718b5cba3bdf5ab226d22c420.jpg').convert('RGB'),session=sess,post_process_mask=True),'rosa.webp',500)
dv=remove(Image.open(R/'44061b4c3c6631fa04510621f31cfd78.jpg').convert('RGB'),session=sess,post_process_mask=True)
for i,p in enumerate(split(dv,6000,7)): save(p,f'pal-{i+1}.webp',420)
save(remove(Image.open(A/'8bde30479db575a90d53dc90e5c28850.jpg').convert('RGB'),session=sess,post_process_mask=True),'sobre-cisnes.webp',360)
