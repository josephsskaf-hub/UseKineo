"""Trim blank paper and label document-rendered review images (not browser screenshots)."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

root = Path(__file__).parent
for pdf in root.glob('*.pdf'):
    image = Image.open(pdf.with_suffix('.png')).convert('RGB')
    background = Image.new('RGB', image.size, image.getpixel((0, image.height - 1)))
    bounds = ImageChops.difference(image, background).getbbox()
    if not bounds:
        raise RuntimeError(f'Empty render: {pdf}')
    height = min(image.height, bounds[3] + 36)
    image.crop((0, 0, image.width, height)).save(pdf.with_suffix('.png'))

font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
for size in ['desktop', 'mobile']:
    before = Image.open(root / f'before-en-{size}.png')
    after = Image.open(root / f'after-en-{size}.png')
    width = before.width + after.width + 44
    sheet = Image.new('RGB', (width, max(before.height, after.height) + 84), '#e7ebe4')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 14), f'BEFORE / {size.upper()}', font=font, fill='#17291f')
    draw.text((before.width + 28, 14), f'AFTER / {size.upper()}', font=font, fill='#17291f')
    draw.text((16, 43), 'Offline document render - review HTML for browser layout', font=font, fill='#536358')
    sheet.paste(before, (16, 80))
    sheet.paste(after, (before.width + 28, 80))
    sheet.save(root / f'comparison-{size}.png')
