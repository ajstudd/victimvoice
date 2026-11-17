from pathlib import Path
import re
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT
root=Path(__file__).resolve().parents[2]
md=root/'docs/product-guide/Victim-Voice-Product-and-Architecture-Guide.md'
out=root/'docs/product-guide/Victim-Voice-Product-and-Architecture-Guide.docx'
doc=Document();sec=doc.sections[0];sec.page_width=Inches(8.27);sec.page_height=Inches(11.69)
sec.top_margin=Inches(.67);sec.bottom_margin=Inches(.65);sec.left_margin=Inches(.72);sec.right_margin=Inches(.72)
sec.header_distance=Inches(.25);sec.footer_distance=Inches(.28)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3']:
 st=doc.styles[name];st.font.name='Arial';st.font.color.rgb=RGBColor(0,0,0)
 st.paragraph_format.widow_control=True
normal=doc.styles['Normal'];normal.font.size=Pt(10.5);normal.paragraph_format.line_spacing=1.12;normal.paragraph_format.space_after=Pt(7)
for name,size in [('Title',24),('Subtitle',12),('Heading 1',17),('Heading 2',12)]:
 st=doc.styles[name];st.font.size=Pt(size);st.paragraph_format.space_after=Pt(9 if name!='Heading 2' else 5);st.paragraph_format.space_before=Pt(10 if name=='Heading 2' else 0)
 st.paragraph_format.keep_with_next=True
for name in ['Heading 1','Heading 2']:doc.styles[name].font.bold=True
foot=sec.footer.paragraphs[0];foot.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=foot.add_run('Victim Voice   |   ');r.font.size=Pt(8)
fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');foot._p.append(fld)
props=doc.core_properties;props.title='Victim Voice Product and Architecture Guide';props.subject='Product purpose architecture features and operating boundaries';props.author='Victim Voice';props.keywords='Victim Voice safety app architecture product guide'
def inline(p,s):
 for i,t in enumerate(re.split(r'\*\*(.*?)\*\*',s)):
  r=p.add_run(t);r.bold=bool(i%2)
def table(rows):
 t=doc.add_table(rows=0,cols=len(rows[0]));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
 widths=([1.35,2.2,3.28] if len(rows[0])==3 else [1.65,5.18])
 for c,w in zip(t.columns,widths):c.width=Inches(w)
 borders=OxmlElement('w:tblBorders')
 for edge in ['top','left','bottom','right','insideH','insideV']:
  b=OxmlElement('w:'+edge);b.set(qn('w:val'),'single');b.set(qn('w:sz'),'4');b.set(qn('w:color'),'D9D9D9');borders.append(b)
 t._tbl.tblPr.append(borders)
 for idx,row in enumerate(rows):
  cells=t.add_row().cells
  for cell,text,w in zip(cells,row,widths):
   cell.width=Inches(w);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   tcpr=cell._tc.get_or_add_tcPr();m=OxmlElement('w:tcMar')
   for e,n in [('top','65'),('bottom','65'),('left','85'),('right','85')]:
    v=OxmlElement('w:'+e);v.set(qn('w:w'),n);v.set(qn('w:type'),'dxa');m.append(v)
   tcpr.append(m)
   shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E8EEF2' if idx==0 else ('F6F7F8' if idx%2==0 else 'FFFFFF'));tcpr.append(shade)
   p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=1.05
   inline(p,text)
   for r in p.runs:r.font.size=Pt(9);r.bold=idx==0
  if idx==0:
   trpr=t.rows[-1]._tr.get_or_add_trPr();rep=OxmlElement('w:tblHeader');trpr.append(rep)
  trpr=t.rows[-1]._tr.get_or_add_trPr();trpr.append(OxmlElement('w:cantSplit'))
 doc.add_paragraph().paragraph_format.space_after=Pt(1)
lines=md.read_text().splitlines();i=0
while i<len(lines):
 line=lines[i]
 if not line.strip():i+=1;continue
 if line=='<!-- page -->':doc.add_page_break();i+=1;continue
 if line.startswith('!['):
  match=re.fullmatch(r'!\[(.*?)\]\((.*?)\)',line)
  assert match, line
  p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
  pic=p.add_run().add_picture(str(md.parent/match.group(2)),width=Inches(6.83))
  pic._inline.docPr.set('descr',match.group(1))
  i+=1;continue
 if line.startswith('```'):
  i+=1;code=[]
  while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
  p=doc.add_paragraph();p.paragraph_format.line_spacing=1;p.paragraph_format.space_after=Pt(7)
  r=p.add_run('\n'.join(code));r.font.name='Courier New';r.font.size=Pt(8)
  i+=1;continue
 if line.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   row=[v.strip() for v in lines[i].strip('|').split('|')]
   if not all(re.fullmatch(r'[-: ]+',v) for v in row):rows.append(row)
   i+=1
  table(rows);continue
 if line.startswith('# '):p=doc.add_paragraph(line[2:],style='Title')
 elif line.startswith('## '):p=doc.add_heading(line[3:],level=1)
 elif line.startswith('### '):p=doc.add_heading(line[4:],level=2)
 else:
  p=doc.add_paragraph()
  if re.match(r'^\d+\. ',line):
   p.paragraph_format.left_indent=Inches(.17);p.paragraph_format.first_line_indent=Inches(-.17)
  inline(p,line)
 i+=1
for b in list(doc.styles.element.iter(qn('w:pBdr'))):
 b.getparent().remove(b)
for b in list(doc.element.iter(qn('w:pBdr'))):
 b.getparent().remove(b)
doc.save(out)
print('Words',len(md.read_text().split()),'DOCX',out)
