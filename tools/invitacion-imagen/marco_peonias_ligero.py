"""Marco de peonías ligero: el marco original (recursos/marco.jpg) pero solo la franja
exterior, con desvanecido hacia el centro y ramos algo más anchos en las esquinas.
Salida: marco-peonias.png (RGBA) + marco-peonias-mask.png."""
import sys, numpy as np, cv2
from PIL import Image, ImageFilter
W,H=1575,2175
PINK=np.array([188,92,114],np.float32); PAPER=np.array([250,243,233],np.float32)
FULL=int(sys.argv[1]) if len(sys.argv)>1 else 120   # grosor pleno de la franja (px)
FADE=int(sys.argv[2]) if len(sys.argv)>2 else 90    # ancho del desvanecido
CORNER=int(sys.argv[3]) if len(sys.argv)>3 else 130 # extra en esquinas
src=Image.open("../../recursos/marco.jpg").convert("RGB")
scale=2.42; w,h=round(675*scale),round(1200*scale)
big=src.resize((w,h),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2.0,120,1))
x0=(w-W)//2; y0=(h-H)//2-30
a=np.asarray(big).astype(np.float32)
ink=(np.clip((237-a[...,1]-6)/(237-140),0,1)**0.75)[y0:y0+H,x0:x0+W]
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
d=np.minimum(np.minimum(xx,W-1-xx),np.minimum(yy,H-1-yy))        # distancia al borde
dc=np.sqrt(np.minimum(xx,W-1-xx)**2+np.minimum(yy,H-1-yy)**2)     # distancia a la esquina más cercana
reach=FULL+np.clip(1-dc/420,0,1)*CORNER
mask=np.clip((reach+FADE-d)/FADE,0,1)
mask=cv2.GaussianBlur(mask,(0,0),4)
li=ink*mask
col=PAPER*(1-li[...,None])+PINK*li[...,None]
out=np.dstack([col,np.clip(li*1.0,0,1)*255]).clip(0,255).astype(np.uint8)
Image.fromarray(out,"RGBA").save("marco-peonias.png")
Image.fromarray(((li>0.05)*255).astype(np.uint8)).save("marco-peonias-mask.png")
print("ok",FULL,FADE,CORNER)
