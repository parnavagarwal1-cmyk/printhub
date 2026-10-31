import os
import subprocess
from typing import List, Optional

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

class DocumentProcessor:
    """
    Handles PDF validation, page range filtering, image-to-PDF conversion
    with aspect ratio preservation, and document preparation before spooling.
    """

    @staticmethod
    def parse_page_range(range_str: str, max_pages: int) -> List[int]:
        if not range_str or range_str.strip().lower() == "all":
            return list(range(1, max(1, max_pages) + 1))

        pages = set()
        for part in range_str.split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                try:
                    s, e = part.split("-")
                    start, end = int(s), int(e)
                    for p in range(max(1, min(start, end)), min(max_pages, max(start, end)) + 1):
                        pages.add(p)
                except ValueError:
                    pass
            else:
                try:
                    p = int(part)
                    if 1 <= p <= max_pages:
                        pages.add(p)
                except ValueError:
                    pass

        res = sorted(list(pages))
        return res if res else [1]

    @classmethod
    def process_document(
        cls,
        input_path: str,
        output_path: str,
        page_range: str = "all"
    ) -> dict:
        """
        Normalizes any supported input file (PDF, Image, DOCX) into a printable PDF
        with the specified page range extracted.
        """
        ext = os.path.splitext(input_path)[1].lower()

        # 1. Image Files -> Convert to A4 PDF
        if ext in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
            return cls._image_to_pdf(input_path, output_path)

        # 2. DOCX Files -> Convert to PDF using LibreOffice headless if available
        elif ext in [".docx", ".doc"]:
            return cls._docx_to_pdf(input_path, output_path, page_range)

        # 3. PDF Files -> Validate and filter page range
        elif ext == ".pdf":
            return cls._filter_pdf_pages(input_path, output_path, page_range)

        else:
            return {"success": False, "error": f"Unsupported file format: {ext}"}

    @classmethod
    def _image_to_pdf(cls, img_path: str, output_path: str) -> dict:
        if HAS_PIL:
            try:
                img = Image.open(img_path)
                # Convert RGBA to RGB
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                
                # A4 dimensions at 300 DPI: 2480 x 3508 pixels
                a4_width, a4_height = 2480, 3508
                bg = Image.new("RGB", (a4_width, a4_height), (255, 255, 255))
                
                # Maintain aspect ratio to prevent accidental cropping
                img.thumbnail((a4_width - 100, a4_height - 100), Image.Resampling.LANCZOS)
                
                # Center image on A4
                offset = ((a4_width - img.width) // 2, (a4_height - img.height) // 2)
                bg.paste(img, offset)
                bg.save(output_path, "PDF", resolution=300.0)
                return {"success": True, "output_path": output_path, "page_count": 1}
            except Exception as e:
                return {"success": False, "error": f"Image conversion error: {str(e)}"}
        else:
            # Fallback: direct copy if already valid stream or basic handler
            return {"success": False, "error": "Pillow is required for image processing"}

    @classmethod
    def _docx_to_pdf(cls, docx_path: str, output_path: str, page_range: str) -> dict:
        # Check LibreOffice in PATH or standard Windows locations
        soffice_paths = [
            "soffice",
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
        ]
        soffice_bin = None
        for p in soffice_paths:
            try:
                res = subprocess.run([p, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=3)
                if res.returncode == 0:
                    soffice_bin = p
                    break
            except Exception:
                continue

        if soffice_bin:
            try:
                out_dir = os.path.dirname(output_path)
                subprocess.run(
                    [soffice_bin, "--headless", "--convert-to", "pdf", "--outdir", out_dir, docx_path],
                    check=True,
                    timeout=30
                )
                temp_pdf = os.path.join(out_dir, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf")
                if os.path.exists(temp_pdf):
                    return cls._filter_pdf_pages(temp_pdf, output_path, page_range)
            except Exception as e:
                return {"success": False, "error": f"DOCX conversion failed: {str(e)}"}

        return {"success": False, "error": "LibreOffice not detected for DOCX conversion"}

    @classmethod
    def _filter_pdf_pages(cls, pdf_path: str, output_path: str, page_range: str) -> dict:
        if HAS_PYMUPDF:
            try:
                doc = fitz.open(pdf_path)
                total_pages = len(doc)
                selected_pages = cls.parse_page_range(page_range, total_pages)
                # 0-indexed for PyMuPDF
                selected_0_indexed = [p - 1 for p in selected_pages if 0 <= (p - 1) < total_pages]

                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=0, to_page=total_pages - 1)
                new_doc.select(selected_0_indexed)
                new_doc.save(output_path)
                new_doc.close()
                doc.close()

                return {
                    "success": True,
                    "output_path": output_path,
                    "page_count": len(selected_0_indexed)
                }
            except Exception as e:
                return {"success": False, "error": f"PDF filtering failed: {str(e)}"}
        else:
            # Direct pass-through if PyMuPDF is not installed yet
            import shutil
            shutil.copyfile(pdf_path, output_path)
            return {"success": True, "output_path": output_path, "page_count": 1}
